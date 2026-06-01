/**
 * Language character detection module.
 *
 * Provides character set regex patterns for Japanese, Korean, Chinese, and English,
 * along with functions to extract words for a specific language and detect the
 * predominant language in a text string.
 */

import { TargetLanguage } from '@/app/_lib/wordTypes';

/**
 * Character range definition mapping a language to its regex pattern.
 */
export interface CharacterRange {
  language: TargetLanguage;
  regex: RegExp;
}

/**
 * Character set regex patterns for each supported language.
 *
 * - Japanese: Hiragana (U+3040-U+309F), Katakana (U+30A0-U+30FF), Kanji (U+4E00-U+9FFF)
 * - Korean: Hangul Syllables (U+AC00-U+D7AF), Hangul Jamo (U+1100-U+11FF), Hangul Compatibility Jamo (U+3130-U+318F)
 * - Chinese: CJK Unified Ideographs (U+4E00-U+9FFF), CJK Extension A (U+3400-U+4DBF)
 * - English: Basic Latin letters (A-Z, a-z)
 */
export const CHARACTER_RANGES: CharacterRange[] = [
  { language: 'japanese', regex: /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/ },
  { language: 'korean', regex: /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/ },
  { language: 'chinese', regex: /[\u4E00-\u9FFF\u3400-\u4DBF]/ },
  { language: 'english', regex: /[A-Za-z]/ },
];

/**
 * Global regex patterns for matching sequences of characters in each language.
 * Used for word extraction.
 */
const WORD_PATTERNS: Record<TargetLanguage, RegExp> = {
  // Japanese words: sequences of hiragana, katakana, and/or kanji
  japanese: /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]+/g,
  // Korean words: sequences of hangul syllables, jamo, or compatibility jamo
  korean: /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]+/g,
  // Chinese words: sequences of CJK unified ideographs and extension A
  chinese: /[\u4E00-\u9FFF\u3400-\u4DBF]+/g,
  // English words: sequences of basic Latin letters
  english: /[A-Za-z]+/g,
};

/**
 * Extracts words/characters from text that match the target language's character set.
 *
 * For CJK languages (Japanese, Korean, Chinese), a "word" is a contiguous sequence
 * of characters belonging to that language's character set.
 * For English, a "word" is a contiguous sequence of Latin letters.
 *
 * @param text - The input text to extract words from
 * @param language - The target language to extract words for
 * @returns An array of extracted words/character sequences
 */
export function extractWordsForLanguage(
  text: string,
  language: TargetLanguage
): string[] {
  if (!text) return [];

  const pattern = WORD_PATTERNS[language];
  // Reset lastIndex in case the regex was used before
  pattern.lastIndex = 0;

  const matches = text.match(pattern);
  return matches ?? [];
}

/**
 * Detects the predominant language in a text string by counting characters
 * that match each language's character set.
 *
 * Returns the language with the highest character count, or null if no
 * characters match any supported language.
 *
 * Note: CJK Unified Ideographs (U+4E00-U+9FFF) overlap between Japanese and Chinese.
 * Japanese is distinguished by the presence of hiragana or katakana characters.
 * If only CJK ideographs are present without kana, Chinese is preferred.
 *
 * @param text - The input text to analyze
 * @returns The detected TargetLanguage, or null if no language could be detected
 */
export function detectTextLanguage(text: string): TargetLanguage | null {
  if (!text) return null;

  const counts: Record<TargetLanguage, number> = {
    japanese: 0,
    korean: 0,
    chinese: 0,
    english: 0,
  };

  // Count characters for each language
  for (const char of text) {
    // Check for Japanese-specific characters (hiragana/katakana)
    if (/[\u3040-\u309F\u30A0-\u30FF]/.test(char)) {
      counts.japanese++;
    }
    // Check for Korean characters
    else if (/[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/.test(char)) {
      counts.korean++;
    }
    // CJK Unified Ideographs - shared between Japanese and Chinese
    else if (/[\u4E00-\u9FFF]/.test(char)) {
      // If we've already seen kana, attribute to Japanese; otherwise Chinese
      counts.chinese++;
    }
    // CJK Extension A - Chinese only
    else if (/[\u3400-\u4DBF]/.test(char)) {
      counts.chinese++;
    }
    // English characters
    else if (/[A-Za-z]/.test(char)) {
      counts.english++;
    }
  }

  // If Japanese has kana characters, reassign shared CJK ideographs to Japanese
  if (counts.japanese > 0) {
    // Count CJK ideographs in the text and add them to Japanese count
    let cjkCount = 0;
    for (const char of text) {
      if (/[\u4E00-\u9FFF]/.test(char)) {
        cjkCount++;
      }
    }
    counts.japanese += cjkCount;
    counts.chinese -= cjkCount;
  }

  // Find the language with the highest count
  let maxCount = 0;
  let detectedLanguage: TargetLanguage | null = null;

  for (const [language, count] of Object.entries(counts) as [TargetLanguage, number][]) {
    if (count > maxCount) {
      maxCount = count;
      detectedLanguage = language;
    }
  }

  return detectedLanguage;
}
