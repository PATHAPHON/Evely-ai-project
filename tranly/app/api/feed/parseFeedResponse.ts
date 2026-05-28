import type { FeedWord } from '@/app/home/_lib/types';

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
 * Validate that an object has all required FeedWord fields as non-empty strings.
 */
function isValidFeedWord(obj: unknown): obj is FeedWord {
  if (typeof obj !== 'object' || obj === null) return false;
  const record = obj as Record<string, unknown>;
  return (
    typeof record.korean === 'string' &&
    record.korean.trim().length > 0 &&
    typeof record.reading === 'string' &&
    record.reading.trim().length > 0 &&
    typeof record.romanization === 'string' &&
    record.romanization.trim().length > 0 &&
    typeof record.english === 'string' &&
    record.english.trim().length > 0 &&
    typeof record.thai === 'string' &&
    record.thai.trim().length > 0
  );
}

/**
 * Try to extract a FeedWord from a raw object by trimming string fields.
 */
function extractFeedWord(obj: Record<string, unknown>): FeedWord | null {
  const word: FeedWord = {
    korean: typeof obj.korean === 'string' ? obj.korean.trim() : '',
    reading: typeof obj.reading === 'string' ? obj.reading.trim() : '',
    romanization:
      typeof obj.romanization === 'string' ? obj.romanization.trim() : '',
    english: typeof obj.english === 'string' ? obj.english.trim() : '',
    thai: typeof obj.thai === 'string' ? obj.thai.trim() : '',
  };
  return isValidFeedWord(word) ? word : null;
}

/**
 * Try to extract a FeedWord from a raw string chunk using regex field extraction.
 * Used as a fallback when JSON parsing fails for individual objects.
 */
function extractFeedWordFromString(src: string): FeedWord | null {
  const word: FeedWord = {
    korean: extractStringField(src, 'korean'),
    reading: extractStringField(src, 'reading'),
    romanization: extractStringField(src, 'romanization'),
    english: extractStringField(src, 'english'),
    thai: extractStringField(src, 'thai'),
  };
  return isValidFeedWord(word) ? word : null;
}

/**
 * Parse the KKU API response content string and extract an array of FeedWord objects.
 *
 * Handles:
 * - Markdown code fences (```json ... ```)
 * - Extra prose before/after JSON
 * - Backslash-escaped content (double-encoded JSON)
 * - Malformed JSON with partial field extraction via regex
 * - Both array format and individual objects
 */
export function parseFeedResponse(content: string): FeedWord[] {
  if (!content || content.trim().length === 0) return [];

  let trimmed = content.trim();

  // Strip markdown code fences: ```json ... ``` or ``` ... ```
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch) trimmed = fenceMatch[1].trim();

  // Handle double-encoded JSON (backslash-escaped quotes)
  if (/\\"/.test(trimmed) && !/[^\\]"/.test(trimmed.slice(0, 50))) {
    try {
      const unescaped = JSON.parse(`"${trimmed.replace(/\n/g, '\\n')}"`);
      if (typeof unescaped === 'string') trimmed = unescaped.trim();
    } catch {
      // Fall through to normal parsing
    }
  }

  // Try parsing the whole content as JSON first
  const parsed = tryParseJson(trimmed);

  if (Array.isArray(parsed)) {
    // Direct array of word objects
    const words: FeedWord[] = [];
    for (const item of parsed) {
      const word = extractFeedWord(item as Record<string, unknown>);
      if (word) words.push(word);
    }
    if (words.length > 0) return words;
  }

  if (typeof parsed === 'object' && parsed !== null) {
    // Could be { words: [...] } wrapper
    const record = parsed as Record<string, unknown>;
    if (Array.isArray(record.words)) {
      const words: FeedWord[] = [];
      for (const item of record.words) {
        const word = extractFeedWord(item as Record<string, unknown>);
        if (word) words.push(word);
      }
      if (words.length > 0) return words;
    }
    // Single object — try to extract as one word
    const single = extractFeedWord(record);
    if (single) return [single];
  }

  // JSON.parse failed or returned no valid words — try to find array in content
  const arrayMatch = trimmed.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    const arrParsed = tryParseJson(arrayMatch[0]);
    if (Array.isArray(arrParsed)) {
      const words: FeedWord[] = [];
      for (const item of arrParsed) {
        const word = extractFeedWord(item as Record<string, unknown>);
        if (word) words.push(word);
      }
      if (words.length > 0) return words;
    }
  }

  // Last resort: find individual {...} blocks and extract fields via regex
  const objectBlocks = trimmed.match(/\{[^{}]*\}/g);
  if (objectBlocks) {
    const words: FeedWord[] = [];
    for (const block of objectBlocks) {
      // Try JSON parse first
      const obj = tryParseJson(block);
      if (obj && typeof obj === 'object') {
        const word = extractFeedWord(obj as Record<string, unknown>);
        if (word) {
          words.push(word);
          continue;
        }
      }
      // Fall back to regex extraction
      const word = extractFeedWordFromString(block);
      if (word) words.push(word);
    }
    if (words.length > 0) return words;
  }

  return [];
}
