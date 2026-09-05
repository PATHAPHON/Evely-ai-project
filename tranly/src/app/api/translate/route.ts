import { NextRequest, NextResponse, after } from 'next/server';
import { getRequestUser, unauthorizedResponse, debitBudget } from '@/app/api/_lib/utils/requireUser';
import { KkuTranslator } from '@/app/api/_lib/utils/kkuTranslate';
import { TOKEN_COST_MICROBAHT } from '@/app/api/_lib/utils/tokenCost';

// ponytail: LLM call can take up to ~30s; without this the serverless gateway
// can 504 before kkuTranslate's own timeout fires.
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
  if (!await getRequestUser()) return unauthorizedResponse();

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

  const apiKey = process.env.KKU_API_KEY;
  if (!apiKey) {
    console.error('[translate] Missing KKU_API_KEY');
    return errorResponse('api_error', 'Translation service not configured.', 500);
  }

  // Retry once on transient 5xx / parse failure — KKU is occasionally flaky.
  // Timeouts (AbortError) and 429 are not retried; they already burn the budget.
  let result: Awaited<ReturnType<KkuTranslator['translateWithUsage']>> = null;
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      result = await new KkuTranslator(apiKey).translateWithUsage(texts as string[]);
      if (result) break;
      // Null without exception = parse/5xx — retry once
      if (attempt < 2) {
        console.warn(`[translate] Attempt ${attempt} returned null, retrying...`);
        continue;
      }
    } catch (e) {
      lastError = e;
      if (e instanceof Error && e.name === 'AbortError') {
        console.error('[translate] Upstream timeout');
        return errorResponse('timeout', 'Translation timed out. Please try again.', 504);
      }
      if (e instanceof Error && (e as Error & { status?: number }).status === 429) {
        return errorResponse('rate_limit', 'Too many requests. Please wait.', 429);
      }
      console.error('[translate] Unexpected error:', e);
      if (attempt < 2) continue;
      return errorResponse('api_error', 'Translation failed. Please try again.', 502);
    }
  }

  if (!result) {
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
    await debitBudget(tokens * TOKEN_COST_MICROBAHT.kku);
  });

  return NextResponse.json({ translations: result.translations }, { status: 200 });
}
