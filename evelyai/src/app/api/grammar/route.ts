import { NextRequest, NextResponse, after } from 'next/server';
import { parseChatResponse } from '@/app/api/chat/parseChatResponse';
import {
  getRequestUser,
  unauthorizedResponse,
  checkBudget,
  debitBudget,
  budgetExhaustedResponse,
} from '@/app/api/_lib/utils/requireUser';
import { TOKEN_COST_MICROBAHT, DAILY_BUDGET_MICROBAHT } from '@/app/api/_lib/utils/tokenCost';

// ponytail: LLM call can take 30s; without this the serverless gateway 504s
// at its default cap (10s on Vercel hobby) before our own timeout fires.
export const maxDuration = 60;

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'google/gemini-3.1-flash-lite';
const API_TIMEOUT_MS = 30_000;
const MAX_TEXT_LENGTH = 500;

interface GrammarErrorResponse {
  error: { type: string; message: string };
}

function errorResponse(
  type: string,
  message: string,
  status: number
): NextResponse<GrammarErrorResponse> {
  return NextResponse.json({ error: { type, message } }, { status });
}

export async function POST(
  request: NextRequest
): Promise<NextResponse> {
  const user = await getRequestUser();
  if (!user) return unauthorizedResponse();

  // Grammar check is premium-only
  if (!user.isPremium) {
    return NextResponse.json(
      { error: { type: 'premium_required', message: 'Grammar check is a Premium feature.' } },
      { status: 403 }
    );
  }

  const hasBudget = await checkBudget(DAILY_BUDGET_MICROBAHT.premium, user.isUnlimited);
  if (!hasBudget) return budgetExhaustedResponse();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse('invalid_input', 'Invalid request body.', 400);
  }

  if (
    typeof body !== 'object' ||
    body === null ||
    typeof (body as Record<string, unknown>).text !== 'string'
  ) {
    return errorResponse('invalid_input', 'Missing or invalid text field.', 400);
  }

  const text = ((body as Record<string, unknown>).text as string).trim();
  if (text.length === 0 || text.length > MAX_TEXT_LENGTH) {
    return errorResponse('invalid_input', 'Text must be 1–500 characters.', 400);
  }

  // Bypass grammar check for commands or texts without letters (emojis, numbers, symbols)
  const isCommand = text.startsWith('/');
  const hasLetters = /[a-zA-Z\u0E00-\u0E7F]/.test(text);
  if (isCommand || !hasLetters) {
    return NextResponse.json({
      englishText: text,
      english: text,
      translation: '',
      grammarCorrect: true,
      originalText: text,
      correctedText: text,
      grammarNotes: '',
    }, { status: 200 });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return errorResponse('api_error', 'API key is missing.', 401);
  }

  const requestBody = {
    model: MODEL,
    messages: [
      {
        role: 'user' as const,
        content: [
          {
            type: 'text' as const,
            text:
              `Analyze the following text for translation or English grammar correction. The text may be in Thai, English, or Korean.\n` +
              `Text: "${text}"\n\n` +
              `Instructions:\n` +
              `1. If the text is in Thai or Korean:\n` +
              `   - Translate it into correct, natural English.\n` +
              `   - Set "grammarCorrect" to true, "grammarNotes" to "", and set "originalText" and "correctedText" to the translated English.\n` +
              `2. If the text is in English:\n` +
              `   - If it contains grammatical, spelling, or punctuation errors:\n` +
              `     - Set "grammarCorrect" to false.\n` +
              `     - Put the original incorrect sentence/phrase in "originalText".\n` +
              `     - Put the corrected English sentence in "correctedText" and "englishText" (and "english").\n` +
              `     - In "grammarNotes", explain clearly in Thai what was wrong and how it was fixed (e.g. 'ควรใช้ "went" แทน "go" เพราะเป็นเหตุการณ์ในอดีต').\n` +
              `   - If it is already correct English:\n` +
              `     - Set "grammarCorrect" to true, "grammarNotes" to "", and set "originalText" and "correctedText" to the English text.\n` +
              `3. If the text cannot have grammar rules applied (e.g. symbols, numbers, emojis, slang that cannot be parsed):\n` +
              `   - Set "grammarCorrect" to true, "grammarNotes" to "", and keep "englishText" as the original text.\n` +
              `4. ALWAYS fill "englishText", "english", and "translation" — these are never empty.\n` +
              `5. Fill out the JSON response schema below.\n\n` +
              `JSON Schema:\n` +
              `{\n` +
              `  "englishText": "<The corrected/translated English text>",\n` +
              `  "english": "<The corrected/translated English text>",\n` +
              `  "translation": "<Natural Thai translation of the corrected/translated English text>",\n` +
              `  "grammarCorrect": <true if text was correct or grammar check does not apply; false if text had grammar/spelling errors>,\n` +
              `  "originalText": "<The original incorrect sentence or phrase if grammarCorrect is false, otherwise same as input>",\n` +
              `  "correctedText": "<The corrected English sentence if grammarCorrect is false, otherwise same as englishText>",\n` +
              `  "grammarNotes": "<Brief, helpful explanation in Thai of any spelling/grammar corrections made. If grammarCorrect is true, leave this empty.>" \n` +
              `}\n\n` +
              `Reply with ONLY a raw JSON object (no markdown, no code blocks/fences, no extra text).`,
          },
        ],
      },
    ],
    max_tokens: 1024,
    include_reasoning: false,
    reasoning: { effort: 'minimal' },
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 429) {
        return errorResponse('rate_limit', 'Too many requests. Please wait.', 429);
      }
      return errorResponse('api_error', 'Grammar check failed. Please try again.', 502);
    }

    const responseText = await response.text();
    let content: string | undefined;
    let totalTokens = 0;

    try {
      const data = JSON.parse(responseText);
      content = data?.choices?.[0]?.message?.content ?? data?.content;
      totalTokens = data?.usage?.total_tokens ?? 0;
    } catch {
      content = responseText;
    }

    if (!content || content.trim().length === 0) {
      return errorResponse('api_error', 'Empty grammar check response.', 502);
    }

    let result;
    try {
      result = parseChatResponse(content);
      if (result.grammarCorrect === false) {
        if (!result.originalText) result.originalText = text;
        if (!result.correctedText) result.correctedText = result.englishText;
        if (!result.grammarNotes) {
          result.grammarNotes = 'พบจุดที่อาจไม่ถูกต้องตามหลักไวยากรณ์ แนะนำให้ปรับตามประโยคที่ถูกต้อง';
        }
      }
    } catch {
      result = {
        englishText: text,
        english: text,
        translation: '',
        grammarCorrect: true,
        originalText: text,
        correctedText: text,
        grammarNotes: '',
        fallback: true,
      };
    }

    // Debit budget after response
    after(async () => {
      const tokens = totalTokens > 0 ? totalTokens : 300;
      await debitBudget(tokens * TOKEN_COST_MICROBAHT.openrouter);
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      return errorResponse('timeout', 'Request timed out. Please try again.', 504);
    }
    if (error instanceof TypeError) {
      return errorResponse('network_error', 'Cannot connect. Check your internet.', 502);
    }
    return errorResponse('api_error', 'Grammar check failed. Please try again.', 502);
  }
}
