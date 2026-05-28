import type { ChatSuccessResponse } from '@/app/chat/_lib/types';

/**
 * Attempt to parse a string as JSON. Returns null on failure.
 */
function tryParseJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

/**
 * Extract a string field value from a JSON-like string using regex.
 * Handles escaped quotes within values.
 */
function extractStringField(src: string, key: string): string {
  const re = new RegExp(`"${key}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`, 'i');
  const m = src.match(re);
  if (!m) return '';
  try {
    return JSON.parse(`"${m[1]}"`).trim();
  } catch {
    return m[1].trim();
  }
}

/**
 * Validate that an object has all required ChatSuccessResponse fields as non-empty strings.
 */
function isValidChatResponse(obj: unknown): obj is ChatSuccessResponse {
  if (typeof obj !== 'object' || obj === null) return false;
  const record = obj as Record<string, unknown>;
  return (
    typeof record.korean === 'string' &&
    record.korean.trim().length > 0 &&
    typeof record.reading === 'string' &&
    record.reading.trim().length > 0 &&
    typeof record.romanization === 'string' &&
    record.romanization.trim().length > 0 &&
    typeof record.translation === 'string' &&
    record.translation.trim().length > 0
  );
}

/**
 * Try to extract a ChatSuccessResponse from a raw object by trimming string fields.
 */
function extractChatResponse(
  obj: Record<string, unknown>
): ChatSuccessResponse | null {
  const response: ChatSuccessResponse = {
    korean: typeof obj.korean === 'string' ? obj.korean.trim() : '',
    reading: typeof obj.reading === 'string' ? obj.reading.trim() : '',
    romanization:
      typeof obj.romanization === 'string' ? obj.romanization.trim() : '',
    translation:
      typeof obj.translation === 'string' ? obj.translation.trim() : '',
    english: typeof obj.english === 'string' ? obj.english.trim() : '',
  };
  return isValidChatResponse(response) ? response : null;
}

/**
 * Try to extract a ChatSuccessResponse from a raw string using regex field extraction.
 * Used as a fallback when JSON parsing fails.
 */
function extractChatResponseFromString(src: string): ChatSuccessResponse | null {
  const response: ChatSuccessResponse = {
    korean: extractStringField(src, 'korean'),
    reading: extractStringField(src, 'reading'),
    romanization: extractStringField(src, 'romanization'),
    translation: extractStringField(src, 'translation'),
    english: extractStringField(src, 'english'),
  };
  return isValidChatResponse(response) ? response : null;
}

/**
 * Parse the KKU API response content string and extract a ChatSuccessResponse object.
 *
 * Handles:
 * - Markdown code fences (```json ... ```)
 * - Extra prose before/after JSON
 * - Backslash-escaped content (double-encoded JSON)
 * - Malformed JSON with partial field extraction via regex
 *
 * Throws an error if the response cannot be parsed into a valid ChatSuccessResponse.
 */
export function parseChatResponse(content: string): ChatSuccessResponse {
  if (!content || content.trim().length === 0) {
    throw new Error('Empty response content');
  }

  const trimmed = content.trim();

  // Try every ```...``` code block (thinking models emit multiple blocks)
  const fenceRe = /```(?:json)?\s*([\s\S]*?)\s*```/gi;
  let fenceMatch: RegExpExecArray | null;
  while ((fenceMatch = fenceRe.exec(trimmed)) !== null) {
    const block = fenceMatch[1].trim();
    const parsed = tryParseJson(block);
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      const result = extractChatResponse(parsed as Record<string, unknown>);
      if (result) return result;
    }
    const regexResult = extractChatResponseFromString(block);
    if (regexResult) return regexResult;
  }

  // Handle double-encoded JSON (backslash-escaped quotes)
  let candidate = trimmed;
  if (/\\"/.test(candidate) && !/[^\\]"/.test(candidate.slice(0, 50))) {
    try {
      const unescaped = JSON.parse(`"${candidate.replace(/\n/g, '\\n')}"`);
      if (typeof unescaped === 'string') candidate = unescaped.trim();
    } catch {
      // fall through
    }
  }

  // Try parsing the whole content as JSON
  const parsed = tryParseJson(candidate);
  if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
    const result = extractChatResponse(parsed as Record<string, unknown>);
    if (result) return result;
  }

  // Find all {...} objects in the content and try each
  const objectRe = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)?\}/g;
  let objectMatch: RegExpExecArray | null;
  while ((objectMatch = objectRe.exec(candidate)) !== null) {
    const objParsed = tryParseJson(objectMatch[0]);
    if (typeof objParsed === 'object' && objParsed !== null && !Array.isArray(objParsed)) {
      const result = extractChatResponse(objParsed as Record<string, unknown>);
      if (result) return result;
    }
  }

  // Last resort: extract fields via regex from the entire content
  const regexResult = extractChatResponseFromString(candidate);
  if (regexResult) return regexResult;

  throw new Error(
    'Invalid response format: missing required fields (korean, reading, romanization, translation)'
  );
}
