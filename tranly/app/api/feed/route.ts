import { NextRequest, NextResponse } from 'next/server';
import { parseFeedResponse } from './parseFeedResponse';
import type {
  FeedSuccessResponse,
  FeedErrorResponse,
} from '@/app/home/_lib/types';

const KKU_API_URL = 'https://gen.ai.kku.ac.th/api/v1/chat/completions';
const API_TIMEOUT_MS = 30_000;

type FeedErrorType = FeedErrorResponse['error']['type'];

const ERROR_MESSAGES: Record<FeedErrorType, string> = {
  invalid_input: 'Invalid input.',
  api_error: 'Failed to generate word. Please try again.',
  rate_limit: 'Too many requests. Please wait a moment.',
  timeout: 'Connection timed out. Please try again.',
  network_error: 'Cannot connect. Please check your internet.',
};

function errorResponse(
  type: FeedErrorType,
  status: number
): NextResponse<FeedErrorResponse> {
  return NextResponse.json(
    { error: { type, message: ERROR_MESSAGES[type] } },
    { status }
  );
}

/**
 * Validate that the request body has the expected shape:
 * - excludeWords: string[]
 * - count: positive integer
 */
function validateInput(
  body: unknown
): { excludeWords: string[]; count: number } | null {
  if (typeof body !== 'object' || body === null) return null;

  const record = body as Record<string, unknown>;

  // excludeWords must be an array of strings
  if (!Array.isArray(record.excludeWords)) return null;
  if (!record.excludeWords.every((item) => typeof item === 'string'))
    return null;

  // count must be a positive integer
  if (typeof record.count !== 'number') return null;
  if (!Number.isInteger(record.count) || record.count <= 0) return null;

  return {
    excludeWords: record.excludeWords as string[],
    count: record.count,
  };
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<FeedSuccessResponse | FeedErrorResponse>> {
  // Parse request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse('invalid_input', 400);
  }

  // Validate input
  const input = validateInput(body);
  if (!input) {
    return errorResponse('invalid_input', 400);
  }

  const { excludeWords, count } = input;

  // Read custom API key and model from request headers (user-provided config)
  const customApiKey = request.headers.get('x-custom-api-key');
  const customModel = request.headers.get('x-custom-model');

  // Use custom API key provided in request headers
  const apiKey = customApiKey;
  if (!apiKey) {
    return errorResponse('api_error', 401);
  }

  // Build exclusion instruction
  const exclusionText =
    excludeWords.length > 0
      ? `Do NOT include any of these words: ${excludeWords.join(', ')}. `
      : '';

  // Use custom model if provided, otherwise fall back to default
  const model = customModel || 'gemini-3.1-flash-lite';

  // Construct KKU IntelSphere API request
  const requestBody = {
    model,
    messages: [
      {
        role: 'user' as const,
        content: [
          {
            type: 'text' as const,
            text:
              `Generate ${count} Korean vocabulary words for a language learner. ` +
              exclusionText +
              'Reply with ONLY a raw JSON array (no markdown, no code fences, no prose, no leading/trailing text). ' +
              'Each element must have this schema: {"korean":"<Korean word in Hangul>","reading":"<Korean pronunciation written in Thai script>","romanization":"<Korean pronunciation in Revised Romanization>","english":"<English translation>","thai":"<Thai translation>"}. ' +
              'Example: [{"korean":"사과","reading":"ซากวา","romanization":"sagwa","english":"apple","thai":"แอปเปิ้ล"}]. ' +
              'Return ONLY the JSON array and nothing else.',
          },
        ],
      },
    ],
    max_tokens: 2048,
  };

  // Set up timeout with AbortController
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const response = await fetch(KKU_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Map error responses
    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`KKU API error [${response.status}]:`, errorBody);

      if (response.status === 429) {
        return errorResponse('rate_limit', 429);
      }
      return errorResponse('api_error', 502);
    }

    // Parse successful response
    const responseText = await response.text();

    let content: string | undefined;
    try {
      const data = JSON.parse(responseText);
      content = data?.choices?.[0]?.message?.content;

      if (!content && data?.content) {
        content = data.content;
      }
    } catch {
      // Fall through — treat raw text as content
      content = responseText;
    }

    if (!content || content.trim().length === 0) {
      console.error('Could not extract content from KKU response');
      return errorResponse('api_error', 502);
    }

    // Parse the feed response content into FeedWord[]
    const words = parseFeedResponse(content);

    if (words.length === 0) {
      console.error('Failed to parse any words from content:', content);
      return errorResponse('api_error', 502);
    }

    return NextResponse.json({ words }, { status: 200 });
  } catch (error: unknown) {
    clearTimeout(timeoutId);

    // Handle timeout (AbortError)
    if (error instanceof Error && error.name === 'AbortError') {
      return errorResponse('timeout', 504);
    }

    // Handle network errors (TypeError from fetch)
    if (error instanceof TypeError) {
      return errorResponse('network_error', 502);
    }

    // Fallback to api_error
    return errorResponse('api_error', 502);
  }
}
