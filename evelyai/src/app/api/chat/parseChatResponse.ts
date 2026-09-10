import type { ChatSuccessResponse, ReplySuggestion } from '@/shared/types/chatTypes';

/**
 * Response parsing is split into a chain of strategy classes, each trying one
 * parsing technique on the raw model output. The orchestrator `parseChatResponse`
 * runs the chain in order and returns the first success.
 */

// ─── Shared extraction helpers (module-private) ────────────────────────────

/** Extract a clean list of reply suggestions from a raw value. Returns undefined
 * when there are none, so the field is simply omitted. */
function extractSuggestions(value: unknown): ReplySuggestion[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const suggestions: ReplySuggestion[] = [];
  for (const raw of value) {
    if (typeof raw !== 'object' || raw === null) continue;
    const rec = raw as Record<string, unknown>;
    const rawText = rec.englishText;
    const englishText = typeof rawText === 'string' ? rawText.trim() : '';
    const translation =
      typeof rec.translation === 'string' ? rec.translation.trim() : '';
    if (englishText.length > 0) {
      suggestions.push({ englishText, translation });
    }
  }
  return suggestions.length > 0 ? suggestions.slice(0, 4) : undefined;
}

/** Attempt to parse a string as JSON. Returns null on failure. */
function tryParseJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

/** Extract a string field value from a JSON-like string using regex.
 * Handles escaped quotes within values. */
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

/** Validate that an object has all required ChatSuccessResponse fields as non-empty strings. */
function isValidChatResponse(obj: unknown): obj is ChatSuccessResponse {
  if (typeof obj !== 'object' || obj === null) return false;
  const record = obj as Record<string, unknown>;

  if (Array.isArray(record.sentences) && record.sentences.length > 0) {
    return record.sentences.every((s) => {
      if (typeof s !== 'object' || s === null) return false;
      const sr = s as Record<string, unknown>;
      const text = sr.englishText;
      return typeof text === 'string' && (text as string).trim().length > 0;
    });
  }

  const text = record.englishText;
  return typeof text === 'string' && (text as string).trim().length > 0;
}

/** Try to extract a ChatSuccessResponse from a raw object by trimming string fields. */
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
        const rawEt = rec.englishText;
        const rawEmotion = rec.emotion;
        const sObj: {
          englishText: string;
          translation: string;
          english: string;
          emotion?: string;
        } = {
          englishText: typeof rawEt === 'string' ? rawEt.trim() : '',
          translation:
            typeof rec.translation === 'string' ? rec.translation.trim() : '',
          english: typeof rec.english === 'string' ? rec.english.trim() : '',
        };
        if (typeof rawEmotion === 'string' && rawEmotion.trim().length > 0) {
          const sanitized = rawEmotion.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
          if (sanitized) {
            sObj.emotion = sanitized;
          }
        }
        sentences.push(sObj);
      }
    }
  }

  const rawEt = obj.englishText;
  const englishText = typeof rawEt === 'string' ? rawEt.trim() : '';
  const translation =
    typeof obj.translation === 'string' ? obj.translation.trim() : '';
  const english = typeof obj.english === 'string' ? obj.english.trim() : '';

  if (!sentences && englishText.length > 0) {
    const rawEmotion = typeof obj.emotion === 'string' ? obj.emotion.trim() : undefined;
    const sObj: {
      englishText: string;
      translation: string;
      english: string;
      emotion?: string;
    } = { englishText, translation, english };
    if (rawEmotion) {
      const sanitized = rawEmotion.toLowerCase().replace(/[^a-z0-9_-]/g, '');
      if (sanitized) {
        sObj.emotion = sanitized;
      }
    }
    sentences = [sObj];
  }

  const response: ChatSuccessResponse = {
    sentences,
    englishText: englishText || (sentences ? sentences.map((s) => s.englishText).join(' ') : ''),
    translation:
      translation || (sentences ? sentences.map((s) => s.translation).join(' ') : ''),
    english: english || (sentences ? sentences.map((s) => s.english).join(' ') : ''),
  };

  // Compile ttsText with inline audio tags if at least one sentence has an emotion tag
  if (sentences && sentences.some((s) => Boolean(s.emotion))) {
    const parts = sentences.map((s) => {
      const tag = s.emotion ? `[${s.emotion}] ` : '';
      return `${tag}${s.englishText}`.trim();
    }).filter(Boolean);
    if (parts.length > 0) {
      response.ttsText = parts.join(' ');
    }
  }

  const suggestions = extractSuggestions(obj.suggestions);
  if (suggestions !== undefined) {
    response.suggestions = suggestions;
  }
  if (typeof obj.grammarCorrect === 'boolean') {
    response.grammarCorrect = obj.grammarCorrect;
  } else if (typeof obj.grammarCorrect === 'string') {
    const trimmed = obj.grammarCorrect.trim().toLowerCase();
    if (trimmed === 'true') response.grammarCorrect = true;
    else if (trimmed === 'false') response.grammarCorrect = false;
  }
  if (typeof obj.grammarNotes === 'string') {
    response.grammarNotes = obj.grammarNotes.trim();
  }
  if (typeof obj.originalText === 'string' && obj.originalText.trim().length > 0) {
    response.originalText = obj.originalText.trim();
  }
  if (typeof obj.correctedText === 'string' && obj.correctedText.trim().length > 0) {
    response.correctedText = obj.correctedText.trim();
  }
  if (typeof obj.grammarError === 'string' && obj.grammarError.trim().length > 0) {
    response.grammarError = obj.grammarError.trim();
  }

  return isValidChatResponse(response) ? response : null;
}

/** Try to extract a ChatSuccessResponse from a raw string using regex field extraction.
 * Used as a fallback when JSON parsing fails. */
function extractChatResponseFromString(src: string): ChatSuccessResponse | null {
  const englishText = extractStringField(src, 'englishText');
  const translation = extractStringField(src, 'translation');
  const english = extractStringField(src, 'english');
  const originalText = extractStringField(src, 'originalText');
  const correctedText = extractStringField(src, 'correctedText');
  const grammarNotes = extractStringField(src, 'grammarNotes');

  const response: ChatSuccessResponse = {
    sentences: englishText ? [{ englishText, translation, english }] : undefined,
    englishText,
    translation,
    english,
  };

  if (originalText) response.originalText = originalText;
  if (correctedText) response.correctedText = correctedText;
  if (grammarNotes) response.grammarNotes = grammarNotes;

  const grammarCorrectMatch = src.match(/"grammarCorrect"\s*:\s*(true|false)/i);
  if (grammarCorrectMatch) {
    response.grammarCorrect = grammarCorrectMatch[1].toLowerCase() === 'true';
  }

  return isValidChatResponse(response) ? response : null;
}

// ─── Parser strategies ─────────────────────────────────────────────────────

/** A single strategy for turning raw model output into a parsed response. */
export abstract class ResponseParser {
  abstract parse(content: string): ChatSuccessResponse | null;
}

/**
 * Tries every ```...``` code block (thinking models emit multiple blocks).
 * For each block: parse as JSON first, then fall back to regex extraction.
 */
export class FencedBlockParser extends ResponseParser {
  parse(content: string): ChatSuccessResponse | null {
    const fenceRe = /```(?:json)?\s*([\s\S]*?)\s*```/gi;
    let fenceMatch: RegExpExecArray | null;
    while ((fenceMatch = fenceRe.exec(content)) !== null) {
      const block = fenceMatch[1].trim();
      const parsed = tryParseJson(block);
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        const result = extractChatResponse(parsed as Record<string, unknown>);
        if (result) return result;
      }
      const regexResult = extractChatResponseFromString(block);
      if (regexResult) return regexResult;
    }
    return null;
  }
}

/**
 * Handles double-encoded JSON (backslash-escaped quotes). When detected,
 * unescapes the content, then runs the flat-JSON, object-scan, and regex
 * strategies against the unescaped text.
 */
export class DoubleEncodedParser extends ResponseParser {
  parse(content: string): ChatSuccessResponse | null {
    if (/\\"/.test(content) && !/[^\\]"/.test(content.slice(0, 50))) {
      try {
        const unescaped = JSON.parse(`"${content.replace(/\n/g, '\\n')}"`);
        if (typeof unescaped === 'string') {
          const candidate = unescaped.trim();
          const flat = new FlatJsonParser().parse(candidate);
          if (flat) return flat;
          const scanned = new ObjectScanParser().parse(candidate);
          if (scanned) return scanned;
          return extractChatResponseFromString(candidate);
        }
      } catch {
        // fall through to the rest of the chain
      }
    }
    return null;
  }
}

/** Tries parsing the whole content as a single JSON object. */
export class FlatJsonParser extends ResponseParser {
  parse(content: string): ChatSuccessResponse | null {
    const parsed = tryParseJson(content);
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return extractChatResponse(parsed as Record<string, unknown>);
    }
    return null;
  }
}

/** Finds all {...} objects in the content and tries each. */
export class ObjectScanParser extends ResponseParser {
  parse(content: string): ChatSuccessResponse | null {
    const objectRe = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)?\}/g;
    let objectMatch: RegExpExecArray | null;
    while ((objectMatch = objectRe.exec(content)) !== null) {
      const objParsed = tryParseJson(objectMatch[0]);
      if (typeof objParsed === 'object' && objParsed !== null && !Array.isArray(objParsed)) {
        const result = extractChatResponse(objParsed as Record<string, unknown>);
        if (result) return result;
      }
    }
    return null;
  }
}

/** Last resort: extracts fields via regex from the entire content. */
export class RegexParser extends ResponseParser {
  parse(content: string): ChatSuccessResponse | null {
    return extractChatResponseFromString(content);
  }
}

// ─── Chain orchestration ───────────────────────────────────────────────────

const PARSER_CHAIN: ResponseParser[] = [
  new FencedBlockParser(),
  new DoubleEncodedParser(),
  new FlatJsonParser(),
  new ObjectScanParser(),
  new RegexParser(),
];

/**
 * Parse the LLM API response content string and extract a ChatSuccessResponse object.
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

  for (const parser of PARSER_CHAIN) {
    const result = parser.parse(trimmed);
    if (result) return result;
  }

  throw new Error(
    'Invalid response format: missing required field (englishText)'
  );
}