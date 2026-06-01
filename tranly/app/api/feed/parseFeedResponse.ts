import type { FeedWord, KoreanFeedWord, JapaneseFeedWord, ChineseFeedWord, EnglishFeedWord } from '@/app/home/_lib/types';
import type { TargetLanguage } from '@/app/_lib/wordTypes';

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
 * Required fields for each language's feed word.
 */
const REQUIRED_FIELDS: Record<TargetLanguage, string[]> = {
  korean: ['korean', 'reading', 'romanization', 'english', 'thai'],
  japanese: ['kanji', 'hiragana', 'romaji', 'thai'],
  chinese: ['hanzi', 'pinyin', 'thai'],
  english: ['word', 'ipa', 'thai'],
};

/**
 * Validate that an object has all required fields for the given language as non-empty strings.
 */
function isValidFeedWordForLanguage(obj: unknown, language: TargetLanguage): boolean {
  if (typeof obj !== 'object' || obj === null) return false;
  const record = obj as Record<string, unknown>;
  const requiredFields = REQUIRED_FIELDS[language];
  return requiredFields.every(
    (field) => typeof record[field] === 'string' && (record[field] as string).trim().length > 0
  );
}

/**
 * Try to extract a FeedWord from a raw object by trimming string fields,
 * based on the target language.
 */
function extractFeedWord(obj: Record<string, unknown>, language: TargetLanguage): FeedWord | null {
  switch (language) {
    case 'korean': {
      const word: KoreanFeedWord = {
        language: 'korean',
        korean: typeof obj.korean === 'string' ? obj.korean.trim() : '',
        reading: typeof obj.reading === 'string' ? obj.reading.trim() : '',
        romanization: typeof obj.romanization === 'string' ? obj.romanization.trim() : '',
        english: typeof obj.english === 'string' ? obj.english.trim() : '',
        thai: typeof obj.thai === 'string' ? obj.thai.trim() : '',
      };
      return isValidFeedWordForLanguage(word, language) ? word : null;
    }
    case 'japanese': {
      const word: JapaneseFeedWord = {
        language: 'japanese',
        kanji: typeof obj.kanji === 'string' ? obj.kanji.trim() : '',
        hiragana: typeof obj.hiragana === 'string' ? obj.hiragana.trim() : '',
        romaji: typeof obj.romaji === 'string' ? obj.romaji.trim() : '',
        thai: typeof obj.thai === 'string' ? obj.thai.trim() : '',
      };
      return isValidFeedWordForLanguage(word, language) ? word : null;
    }
    case 'chinese': {
      const word: ChineseFeedWord = {
        language: 'chinese',
        hanzi: typeof obj.hanzi === 'string' ? obj.hanzi.trim() : '',
        pinyin: typeof obj.pinyin === 'string' ? obj.pinyin.trim() : '',
        thai: typeof obj.thai === 'string' ? obj.thai.trim() : '',
      };
      return isValidFeedWordForLanguage(word, language) ? word : null;
    }
    case 'english': {
      const word: EnglishFeedWord = {
        language: 'english',
        word: typeof obj.word === 'string' ? obj.word.trim() : '',
        ipa: typeof obj.ipa === 'string' ? obj.ipa.trim() : '',
        thai: typeof obj.thai === 'string' ? obj.thai.trim() : '',
      };
      return isValidFeedWordForLanguage(word, language) ? word : null;
    }
  }
}

/**
 * Try to extract a FeedWord from a raw string chunk using regex field extraction.
 * Used as a fallback when JSON parsing fails for individual objects.
 */
function extractFeedWordFromString(src: string, language: TargetLanguage): FeedWord | null {
  const fields = REQUIRED_FIELDS[language];
  const extracted: Record<string, string> = {};
  for (const field of fields) {
    extracted[field] = extractStringField(src, field);
  }
  return extractFeedWord(extracted as Record<string, unknown>, language);
}

/**
 * Parse the KKU API response content string and extract an array of FeedWord objects
 * for the specified target language.
 *
 * Handles:
 * - Markdown code fences (```json ... ```)
 * - Extra prose before/after JSON
 * - Backslash-escaped content (double-encoded JSON)
 * - Malformed JSON with partial field extraction via regex
 * - Both array format and individual objects
 */
export function parseFeedResponse(content: string, language: TargetLanguage = 'korean'): FeedWord[] {
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
      const word = extractFeedWord(item as Record<string, unknown>, language);
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
        const word = extractFeedWord(item as Record<string, unknown>, language);
        if (word) words.push(word);
      }
      if (words.length > 0) return words;
    }
    // Single object — try to extract as one word
    const single = extractFeedWord(record, language);
    if (single) return [single];
  }

  // JSON.parse failed or returned no valid words — try to find array in content
  const arrayMatch = trimmed.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    const arrParsed = tryParseJson(arrayMatch[0]);
    if (Array.isArray(arrParsed)) {
      const words: FeedWord[] = [];
      for (const item of arrParsed) {
        const word = extractFeedWord(item as Record<string, unknown>, language);
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
        const word = extractFeedWord(obj as Record<string, unknown>, language);
        if (word) {
          words.push(word);
          continue;
        }
      }
      // Fall back to regex extraction
      const word = extractFeedWordFromString(block, language);
      if (word) words.push(word);
    }
    if (words.length > 0) return words;
  }

  return [];
}
