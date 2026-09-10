import { NextRequest, NextResponse, after } from 'next/server';
import {
  getRequestUser,
  unauthorizedResponse,
  checkBudget,
  debitBudget,
  budgetExhaustedResponse,
} from '@/app/api/_lib/utils/requireUser';
import { OpenRouterTranslator } from '@/app/api/_lib/utils/openRouterTranslate';
import { TOKEN_COST_MICROBAHT, DAILY_BUDGET_MICROBAHT } from '@/app/api/_lib/utils/tokenCost';

// LLM call can take up to ~30s; without this the serverless gateway
// can 504 before openRouterTranslate's own timeout fires.
export const maxDuration = 60;

const MAX_TEXTS = 50;
const MAX_TEXT_LENGTH = 500;

interface TranslateErrorResponse {
  error: { type: string; message: string };
}

function errorResponse(
  type: string,
  message: string,
  status: number
): NextResponse<TranslateErrorResponse> {
  return NextResponse.json({ error: { type, message } }, { status });
}

/**
 * Batch English→Thai translation. Body: { texts: string[] }.
 * Returns { translations: string[] } index-aligned to the input.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const user = await getRequestUser();
  if (!user) return unauthorizedResponse();

  const limit = user.isPremium ? DAILY_BUDGET_MICROBAHT.premium : DAILY_BUDGET_MICROBAHT.free;
  const hasBudget = await checkBudget(limit, user.isUnlimited);
  if (!hasBudget) return budgetExhaustedResponse();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse('invalid_input', 'Invalid request body.', 400);
  }

  const texts = (body as Record<string, unknown> | null)?.texts;
  if (
    !Array.isArray(texts) ||
    texts.length === 0 ||
    texts.length > MAX_TEXTS ||
    texts.some((t) => typeof t !== 'string' || t.length > MAX_TEXT_LENGTH)
  ) {
    return errorResponse('invalid_input', 'Missing or invalid texts field.', 400);
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error('[translate] Missing OPENROUTER_API_KEY');
    return errorResponse('api_error', 'Translation service not configured.', 500);
  }

  // Retry once on transient 5xx / parse failure.
  // Timeouts (AbortError) and 429 are not retried.
  let result: Awaited<ReturnType<OpenRouterTranslator['translateWithUsage']>> = null;
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      result = await new OpenRouterTranslator(apiKey).translateWithUsage(texts as string[]);
      if (result) break;
      // Null without exception = parse/5xx — retry once
      if (attempt < 2) {
        console.warn(`[translate] Attempt ${attempt} returned null, retrying...`);
        continue;
      }
    } catch (e) {
      lastError = e;
      if (e instanceof Error && (e as Error & { status?: number }).status === 429) {
        // Map upstream rate-limit to 502 so 429 remains reserved for client budget exhaustion
        return errorResponse('api_error', 'Translation provider is busy. Please try again.', 502);
      }
      console.error(`[translate] Attempt ${attempt} error:`, e);
      if (attempt < 2 && !(e instanceof Error && e.name === 'AbortError')) continue;
      break;
    }
  }

  if (!result) {
    if (lastError && lastError instanceof Error && lastError.name === 'AbortError') {
      console.error('[translate] All attempts timed out');
      return errorResponse('timeout', 'Translation timed out. Please try again.', 504);
    }
    if (lastError) {
      console.error('[translate] All attempts failed, last error:', lastError);
    } else {
      console.error('[translate] All attempts returned null (upstream 5xx or parse failure)');
    }
    return errorResponse('api_error', 'Translation failed. Please try again.', 502);
  }

  // Debit budget after responding. Translation is a secondary call to the chat
  // route (which already gates on budget), so debit-only — never block here.
  after(async () => {
    const tokens = result.tokens > 0 ? result.tokens : 300;
    await debitBudget(tokens * TOKEN_COST_MICROBAHT.openrouter);
  });

  return NextResponse.json({ translations: result.translations }, { status: 200 });
}
