import { NextRequest, NextResponse } from 'next/server';
import {
  API_TIMEOUT_MS,
  MAX_IMAGE_SIZE_BYTES,
  ERROR_MESSAGES,
  type AIErrorType,
} from '@/app/scan/flashcard/_lib/constants';
import type {
  IdentifySuccessResponse,
  IdentifyErrorResponse,
} from '@/app/scan/flashcard/_lib/types';

const KKU_API_URL = 'https://gen.ai.kku.ac.th/api/v1/chat/completions';
const MAX_LABEL_LENGTH = 100;

/**
 * KKU's backend occasionally returns a SQL error response whose `sql` string
 * still contains the model output as the first VALUES literal (the `content`
 * column of the `recents` insert). Pull it out so the user gets their label
 * instead of a generic api_error.
 */
function extractLabelFromKkuSqlError(body: string): string | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const sql = (parsed as { sql?: unknown }).sql;
  if (typeof sql !== 'string') return null;
  if (!/insert\s+into\s+`?recents`?/i.test(sql)) return null;
  const match = sql.match(/values\s*\(\s*'((?:[^'\\]|\\.)*)'/i);
  if (!match) return null;
  const raw = match[1]
    .replace(/\\n/g, ' ')
    .replace(/\\r/g, '')
    .replace(/\\t/g, ' ')
    .replace(/\\'/g, "'")
    .replace(/\\\\/g, '\\');
  return raw.trim() || null;
}

/**
 * Pull a {korean, reading, english, thai} JSON object out of the model's
 * response. The model sometimes wraps JSON in markdown fences or includes
 * extra prose, so we extract the first {...} block before parsing.
 */
type ParsedIdentify = {
  label: string;
  korean: string;
  reading: string;
  romanization: string;
  english: string;
};

function tryParseJson(s: string): Record<string, unknown> | null {
  try {
    const v = JSON.parse(s);
    return typeof v === 'object' && v !== null
      ? (v as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/**
 * Pull a {korean, reading, romanization, english, thai} JSON object out of
 * the model's response. Handles markdown code fences, surrounding prose,
 * and common formatting quirks. As a last resort, falls back to treating
 * the raw content as a Thai label so the user still gets *something*.
 */
function extractStringField(src: string, key: string): string {
  // Match  "key" : "value"  where value may contain escaped quotes (\")
  const re = new RegExp(
    `"${key}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`,
    'i'
  );
  const m = src.match(re);
  if (!m) return '';
  try {
    // Decode JSON string escapes (\\n, \\", \\u…) by wrapping in quotes.
    return JSON.parse(`"${m[1]}"`).trim();
  } catch {
    return m[1].trim();
  }
}

function parseIdentifyContent(content: string): ParsedIdentify | null {
  let trimmed = content.trim();

  // Strip ```json ... ``` or ``` ... ``` fences.
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenceMatch) trimmed = fenceMatch[1].trim();

  // KKU API sometimes returns content with backslash-escaped quotes
  // (i.e., the model output was passed through an extra JSON-encode layer
  // before being assigned to choices[0].message.content). Detect and unescape.
  if (/\\"/.test(trimmed) && !/[^\\]"/.test(trimmed.slice(0, 50))) {
    try {
      const unescaped = JSON.parse(`"${trimmed.replace(/\n/g, '\\n')}"`);
      if (typeof unescaped === 'string') trimmed = unescaped.trim();
    } catch {
      // Fall through; we'll still try regex extraction below.
    }
  }

  // Try the whole thing first, then the first {...} block.
  let obj = tryParseJson(trimmed);
  if (!obj) {
    const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
    if (jsonMatch) obj = tryParseJson(jsonMatch[0]);
  }

  let korean = '';
  let reading = '';
  let romanization = '';
  let english = '';
  let thai = '';

  if (obj) {
    if (typeof obj.korean === 'string') korean = obj.korean.trim();
    if (typeof obj.reading === 'string') reading = obj.reading.trim();
    if (typeof obj.romanization === 'string')
      romanization = obj.romanization.trim();
    if (typeof obj.english === 'string') english = obj.english.trim();
    if (typeof obj.thai === 'string') thai = obj.thai.trim();
  } else {
    // JSON.parse failed (often because the response was truncated mid-stream).
    // Fall back to pulling each field out via regex so we still get something.
    korean = extractStringField(trimmed, 'korean');
    reading = extractStringField(trimmed, 'reading');
    romanization = extractStringField(trimmed, 'romanization');
    english = extractStringField(trimmed, 'english');
    thai = extractStringField(trimmed, 'thai');
  }

  if (!korean && !english && !thai) return null;

  const label = (thai || korean || english).slice(0, MAX_LABEL_LENGTH);
  return {
    label,
    korean: korean.slice(0, MAX_LABEL_LENGTH),
    reading: reading.slice(0, MAX_LABEL_LENGTH),
    romanization: romanization.slice(0, MAX_LABEL_LENGTH),
    english: english.slice(0, MAX_LABEL_LENGTH),
  };
}

function isValidBase64(str: string): boolean {
  if (str.length === 0) return false;
  try {
    // Check if the string matches base64 pattern
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    if (!base64Regex.test(str)) return false;
    // Attempt to decode to verify validity
    atob(str);
    return true;
  } catch {
    return false;
  }
}

function errorResponse(
  type: AIErrorType,
  status: number
): NextResponse<IdentifyErrorResponse> {
  return NextResponse.json(
    { error: { type, message: ERROR_MESSAGES[type] } },
    { status }
  );
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<IdentifySuccessResponse | IdentifyErrorResponse>> {
  // Parse request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse('invalid_input', 400);
  }

  // Validate image field exists and is a string
  if (
    typeof body !== 'object' ||
    body === null ||
    !('image' in body) ||
    typeof (body as Record<string, unknown>).image !== 'string'
  ) {
    return errorResponse('invalid_input', 400);
  }

  const image = (body as Record<string, unknown>).image as string;

  // Validate base64 format
  if (!isValidBase64(image)) {
    return errorResponse('invalid_input', 400);
  }

  // Check decoded image size does not exceed 20MB
  const decodedSize = (image.length * 3) / 4;
  // Account for padding
  const paddingChars = image.endsWith('==') ? 2 : image.endsWith('=') ? 1 : 0;
  const actualSize = decodedSize - paddingChars;

  if (actualSize > MAX_IMAGE_SIZE_BYTES) {
    return errorResponse('too_large', 413);
  }

  // Read API key from environment
  const apiKey = process.env.KKU_API_KEY;
  if (!apiKey) {
    return errorResponse('api_error', 502);
  }

  // Construct KKU IntelSphere API request
  const dataUrl = `data:image/jpeg;base64,${image}`;
  const requestBody = {
    model: 'gemini-3.1-flash-lite',
    messages: [
      {
        role: 'user' as const,
        content: [
          {
            type: 'text' as const,
            text:
              'Identify the main object in the image. Reply with ONLY a raw JSON object (no markdown, no code fences, no prose, no leading/trailing text). ' +
              'Schema: {"korean":"<Korean word in Hangul>","reading":"<Korean pronunciation written in Thai script, e.g. ซากวา>","romanization":"<Korean pronunciation in Revised Romanization, e.g. sagwa>","english":"<English word>","thai":"<Thai word>"}. ' +
              'Example for an apple: {"korean":"사과","reading":"ซากวา","romanization":"sagwa","english":"apple","thai":"แอปเปิ้ล"}. ' +
              'Return ONLY the JSON object and nothing else.',
          },
          {
            type: 'image_url' as const,
            image_url: { url: dataUrl },
          },
        ],
      },
    ],
    max_tokens: 1024,
  };

  // Set up timeout with AbortController
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    console.log('Sending request to KKU API...');
    console.log('Model:', requestBody.model);
    console.log('API Key (first 10 chars):', apiKey.slice(0, 10) + '...');

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

      const recovered = extractLabelFromKkuSqlError(errorBody);
      if (recovered) {
        const parsed = parseIdentifyContent(recovered);
        if (parsed) return NextResponse.json(parsed, { status: 200 });
      }

      if (response.status === 429) {
        return errorResponse('rate_limit', 429);
      }
      return errorResponse('api_error', 502);
    }

    // Parse successful response
    const responseText = await response.text();
    console.log('KKU API response:', responseText.slice(0, 500));

    let content: string | undefined;
    try {
      const data = JSON.parse(responseText);
      content = data?.choices?.[0]?.message?.content;

      if (!content && data?.content) {
        content = data.content;
      }
    } catch {
      // ignore — fall through to SQL-error recovery below
    }

    if (!content) {
      const recovered = extractLabelFromKkuSqlError(responseText);
      if (recovered) content = recovered;
    }

    // Validate label is not empty/whitespace
    if (!content || content.trim().length === 0) {
      console.error('Could not extract content from KKU response');
      return errorResponse('api_error', 502);
    }

    const parsed = parseIdentifyContent(content);
    if (!parsed) {
      console.error('Failed to parse Korean/English JSON from content:', content);
      return errorResponse('api_error', 502);
    }

    return NextResponse.json(parsed, { status: 200 });
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
