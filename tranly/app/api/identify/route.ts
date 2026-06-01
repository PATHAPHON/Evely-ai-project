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
import type { TargetLanguage } from '@/app/_lib/wordTypes';

const KKU_API_URL = 'https://gen.ai.kku.ac.th/api/v1/chat/completions';
const MAX_LABEL_LENGTH = 100;

/**
 * Language-specific prompt configurations for the AI model.
 */
const LANGUAGE_PROMPTS: Record<TargetLanguage, { prompt: string; example: string; fields: string[] }> = {
  korean: {
    prompt:
      'Identify the main object in the image. Reply with ONLY a raw JSON object (no markdown, no code fences, no prose, no leading/trailing text). ' +
      'Schema: {"korean":"<Korean word in Hangul>","reading":"<Korean pronunciation written in Thai script, e.g. ซากวา>","romanization":"<Korean pronunciation in Revised Romanization, e.g. sagwa>","english":"<English word>","thai":"<Thai word>"}. ',
    example: 'Example for an apple: {"korean":"사과","reading":"ซากวา","romanization":"sagwa","english":"apple","thai":"แอปเปิ้ล"}. ',
    fields: ['korean', 'reading', 'romanization', 'english', 'thai'],
  },
  japanese: {
    prompt:
      'Identify the main object in the image. Reply with ONLY a raw JSON object (no markdown, no code fences, no prose, no leading/trailing text). ' +
      'Schema: {"kanji":"<Japanese word in Kanji>","hiragana":"<Hiragana reading>","romaji":"<Romaji pronunciation>","english":"<English word>","thai":"<Thai word>"}. ',
    example: 'Example for an apple: {"kanji":"林檎","hiragana":"りんご","romaji":"ringo","english":"apple","thai":"แอปเปิ้ล"}. ',
    fields: ['kanji', 'hiragana', 'romaji', 'english', 'thai'],
  },
  chinese: {
    prompt:
      'Identify the main object in the image. Reply with ONLY a raw JSON object (no markdown, no code fences, no prose, no leading/trailing text). ' +
      'Schema: {"hanzi":"<Chinese word in Hanzi>","pinyin":"<Pinyin with tone marks or tone numbers>","english":"<English word>","thai":"<Thai word>"}. ',
    example: 'Example for an apple: {"hanzi":"苹果","pinyin":"píngguǒ","english":"apple","thai":"แอปเปิ้ล"}. ',
    fields: ['hanzi', 'pinyin', 'english', 'thai'],
  },
  english: {
    prompt:
      'Identify the main object in the image. Reply with ONLY a raw JSON object (no markdown, no code fences, no prose, no leading/trailing text). ' +
      'Schema: {"word":"<English word>","ipa":"<IPA phonetic transcription>","thai":"<Thai word>"}. ',
    example: 'Example for an apple: {"word":"apple","ipa":"/ˈæp.əl/","thai":"แอปเปิ้ล"}. ',
    fields: ['word', 'ipa', 'thai'],
  },
};

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
 * Extract a string field from raw text using regex (fallback when JSON parsing fails).
 */
function extractStringField(src: string, key: string): string {
  const re = new RegExp(
    `"${key}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`,
    'i'
  );
  const m = src.match(re);
  if (!m) return '';
  try {
    return JSON.parse(`"${m[1]}"`).trim();
  } catch {
    return m[1].trim();
  }
}

/**
 * Parse the AI model's response content into a structured object based on the target language.
 */
function parseIdentifyContent(
  content: string,
  language: TargetLanguage
): IdentifySuccessResponse | null {
  let trimmed = content.trim();

  // Strip ```json ... ``` or ``` ... ``` fences.
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenceMatch) trimmed = fenceMatch[1].trim();

  // KKU API sometimes returns content with backslash-escaped quotes
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

  const fields = LANGUAGE_PROMPTS[language].fields;
  const result: Record<string, string> = {};

  for (const field of fields) {
    if (obj && typeof obj[field] === 'string') {
      result[field] = (obj[field] as string).trim().slice(0, MAX_LABEL_LENGTH);
    } else {
      result[field] = extractStringField(trimmed, field).slice(0, MAX_LABEL_LENGTH);
    }
  }

  // Determine label based on language
  const label = computeLabel(result, language);
  if (!label) return null;

  return { label, ...result } as unknown as IdentifySuccessResponse;
}

/**
 * Compute the label field based on language-specific priority.
 */
function computeLabel(fields: Record<string, string>, language: TargetLanguage): string {
  switch (language) {
    case 'korean':
      return (fields.thai || fields.korean || fields.english || '').slice(0, MAX_LABEL_LENGTH);
    case 'japanese':
      return (fields.thai || fields.kanji || fields.english || '').slice(0, MAX_LABEL_LENGTH);
    case 'chinese':
      return (fields.thai || fields.hanzi || fields.english || '').slice(0, MAX_LABEL_LENGTH);
    case 'english':
      return (fields.thai || fields.word || '').slice(0, MAX_LABEL_LENGTH);
  }
}

function isValidBase64(str: string): boolean {
  if (str.length === 0) return false;
  try {
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    if (!base64Regex.test(str)) return false;
    atob(str);
    return true;
  } catch {
    return false;
  }
}

function isValidLanguage(lang: unknown): lang is TargetLanguage {
  return typeof lang === 'string' && ['english', 'japanese', 'korean', 'chinese'].includes(lang);
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
  const languageParam = (body as Record<string, unknown>).language;

  // Determine target language (default to 'korean' for backward compatibility)
  const language: TargetLanguage = isValidLanguage(languageParam) ? languageParam : 'korean';

  // Validate base64 format
  if (!isValidBase64(image)) {
    return errorResponse('invalid_input', 400);
  }

  // Check decoded image size does not exceed 20MB
  const decodedSize = (image.length * 3) / 4;
  const paddingChars = image.endsWith('==') ? 2 : image.endsWith('=') ? 1 : 0;
  const actualSize = decodedSize - paddingChars;

  if (actualSize > MAX_IMAGE_SIZE_BYTES) {
    return errorResponse('too_large', 413);
  }

  // Read custom API credentials from headers
  const customApiKey = request.headers.get('x-custom-api-key');
  const customModel = request.headers.get('x-custom-model');

  const apiKey = customApiKey;
  if (!apiKey) {
    return errorResponse('api_error', 401);
  }

  // Get language-specific prompt configuration
  const langConfig = LANGUAGE_PROMPTS[language];

  // Construct KKU IntelSphere API request
  const dataUrl = `data:image/jpeg;base64,${image}`;
  const requestBody = {
    model: customModel || 'gemini-3.1-flash-lite',
    messages: [
      {
        role: 'user' as const,
        content: [
          {
            type: 'text' as const,
            text: langConfig.prompt + langConfig.example + 'Return ONLY the JSON object and nothing else.',
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
    console.log('Language:', language);
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
        const parsed = parseIdentifyContent(recovered, language);
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

    const parsed = parseIdentifyContent(content, language);
    if (!parsed) {
      console.error('Failed to parse language-specific JSON from content:', content);
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
