import type { ChatSuccessResponse, ReplySuggestion } from '@/app/chat/_lib/types';

/**
 * Extract a clean list of reply suggestions from a raw value. Returns undefined
 * when there are none, so the field is simply omitted.
 */
function extractSuggestions(value: unknown): ReplySuggestion[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const suggestions: ReplySuggestion[] = [];
  for (const raw of value) {
    if (typeof raw !== 'object' || raw === null) continue;
    const rec = raw as Record<string, unknown>;
    const korean = typeof rec.korean === 'string' ? rec.korean.trim() : '';
    const translation =
      typeof rec.translation === 'string' ? rec.translation.trim() : '';
    if (korean.length > 0) {
      suggestions.push({ korean, translation });
    }
  }
  return suggestions.length > 0 ? suggestions.slice(0, 4) : undefined;
}

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

  if (Array.isArray(record.sentences) && record.sentences.length > 0) {
    return record.sentences.every((s) =>
      typeof s === 'object' && s !== null &&
      typeof (s as Record<string, unknown>).korean === 'string' &&
      ((s as Record<string, unknown>).korean as string).trim().length > 0 &&
      typeof (s as Record<string, unknown>).reading === 'string' &&
      ((s as Record<string, unknown>).reading as string).trim().length > 0 &&
      typeof (s as Record<string, unknown>).romanization === 'string' &&
      ((s as Record<string, unknown>).romanization as string).trim().length > 0 &&
      typeof (s as Record<string, unknown>).translation === 'string' &&
      ((s as Record<string, unknown>).translation as string).trim().length > 0
    );
  }

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
  const rawSentences = obj.sentences;
  let sentences: ChatSuccessResponse['sentences'] = undefined;

  if (Array.isArray(rawSentences)) {
    sentences = [];
    for (const s of rawSentences) {
      if (typeof s === 'object' && s !== null) {
        const rec = s as Record<string, unknown>;
        sentences.push({
          korean: typeof rec.korean === 'string' ? rec.korean.trim() : '',
          reading: typeof rec.reading === 'string' ? rec.reading.trim() : '',
          romanization:
            typeof rec.romanization === 'string' ? rec.romanization.trim() : '',
          translation:
            typeof rec.translation === 'string' ? rec.translation.trim() : '',
          english: typeof rec.english === 'string' ? rec.english.trim() : '',
        });
      }
    }
  }

  const korean = typeof obj.korean === 'string' ? obj.korean.trim() : '';
  const reading = typeof obj.reading === 'string' ? obj.reading.trim() : '';
  const romanization =
    typeof obj.romanization === 'string' ? obj.romanization.trim() : '';
  const translation =
    typeof obj.translation === 'string' ? obj.translation.trim() : '';
  const english = typeof obj.english === 'string' ? obj.english.trim() : '';

  if (!sentences && korean.length > 0) {
    sentences = [{ korean, reading, romanization, translation, english }];
  }

  const response: ChatSuccessResponse = {
    sentences,
    korean: korean || (sentences ? sentences.map((s) => s.korean).join(' ') : ''),
    reading: reading || (sentences ? sentences.map((s) => s.reading).join(' ') : ''),
    romanization:
      romanization || (sentences ? sentences.map((s) => s.romanization).join(' ') : ''),
    translation:
      translation || (sentences ? sentences.map((s) => s.translation).join(' ') : ''),
    english: english || (sentences ? sentences.map((s) => s.english).join(' ') : ''),
  };

  const suggestions = extractSuggestions(obj.suggestions);
  if (suggestions !== undefined) {
    response.suggestions = suggestions;
  }
  if (typeof obj.ended === 'boolean') {
    response.ended = obj.ended;
  }

  return isValidChatResponse(response) ? response : null;
}

/**
 * Try to extract a ChatSuccessResponse from a raw string using regex field extraction.
 * Used as a fallback when JSON parsing fails.
 */
function extractChatResponseFromString(src: string): ChatSuccessResponse | null {
  const korean = extractStringField(src, 'korean');
  const reading = extractStringField(src, 'reading');
  const romanization = extractStringField(src, 'romanization');
  const translation = extractStringField(src, 'translation');
  const english = extractStringField(src, 'english');

  const response: ChatSuccessResponse = {
    sentences: korean ? [{ korean, reading, romanization, translation, english }] : undefined,
    korean,
    reading,
    romanization,
    translation,
    english,
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
