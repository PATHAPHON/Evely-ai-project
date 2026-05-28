import { NextRequest, NextResponse } from 'next/server';
import { parseChatResponse } from '@/app/api/chat/parseChatResponse';
import type { ChatSuccessResponse } from '@/app/chat/_lib/types';

const KKU_API_URL = 'https://gen.ai.kku.ac.th/api/v1/chat/completions';
const API_TIMEOUT_MS = 30_000;
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

export async function POST(
  request: NextRequest
): Promise<NextResponse<ChatSuccessResponse | TranslateErrorResponse>> {
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

  const apiKey = process.env.KKU_API_KEY;
  if (!apiKey) {
    return errorResponse('api_error', 'Server configuration error.', 502);
  }

  const requestBody = {
    model: 'gemini-3.1-flash-lite',
    messages: [
      {
        role: 'user' as const,
        content: [
          {
            type: 'text' as const,
            text:
              `Translate the following text into Korean. The text may be in Thai, English, or Korean.\n` +
              `Text: "${text}"\n` +
              `Reply with ONLY a raw JSON object (no markdown, no code fences, no prose). ` +
              `Schema: {"korean":"<Korean in Hangul>","reading":"<how the Korean SOUNDS written in Thai script as karaoke — NOT the Thai meaning>","romanization":"<Revised Romanization>","translation":"<Thai meaning>","english":"<English meaning>"}. ` +
              `Example: {"korean":"배고파요","reading":"แพ โก พา โย","romanization":"baegopayo","translation":"หิวข้าว","english":"I am hungry"}. ` +
              `Example: {"korean":"안녕하세요","reading":"อัน เนียง ฮา เซ โย","romanization":"annyeonghaseyo","translation":"สวัสดี","english":"Hello"}. ` +
              `The reading field must be the phonetic sound of the Korean word written in Thai characters, like karaoke subtitles.`,
          },
        ],
      },
    ],
    max_tokens: 512,
  };

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

    if (!response.ok) {
      if (response.status === 429) {
        return errorResponse('rate_limit', 'Too many requests. Please wait.', 429);
      }
      return errorResponse('api_error', 'Translation failed. Please try again.', 502);
    }

    const responseText = await response.text();
    let content: string | undefined;
    try {
      const data = JSON.parse(responseText);
      content = data?.choices?.[0]?.message?.content ?? data?.content;
    } catch {
      content = responseText;
    }

    if (!content || content.trim().length === 0) {
      return errorResponse('api_error', 'Empty translation response.', 502);
    }

    const result = parseChatResponse(content);
    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      return errorResponse('timeout', 'Request timed out. Please try again.', 504);
    }
    if (error instanceof TypeError) {
      return errorResponse('network_error', 'Cannot connect. Check your internet.', 502);
    }
    return errorResponse('api_error', 'Translation failed. Please try again.', 502);
  }
}
