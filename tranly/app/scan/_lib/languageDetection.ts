/**
 * Language character detection module.
 *
 * Provides character set regex patterns for English,
 * along with functions to extract words and detect language in a text string.
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
 * Character set regex patterns for supported language (English only).
 */
export const CHARACTER_RANGES: CharacterRange[] = [
  { language: 'english', regex: /[A-Za-z]/ },
];

/**
 * Global regex patterns for matching sequences of characters.
 * Used for word extraction.
 */
const WORD_PATTERNS: Record<TargetLanguage, RegExp> = {
  // English words: sequences of basic Latin letters
  english: /[A-Za-z]+/g,
};

/**
 * Extracts words from text that match the target language's character set.
 *
 * @param text - The input text to extract words from
 * @param language - The target language to extract words for
 * @returns An array of extracted words
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
 * Detects the predominant language in a text string.
 * Since we only support English, returns 'english' if any Latin characters are found.
 *
 * @param text - The input text to analyze
 * @returns The detected TargetLanguage, or null if no language could be detected
 */
export function detectTextLanguage(text: string): TargetLanguage | null {
  if (!text) return null;

  for (const char of text) {
    if (/[A-Za-z]/.test(char)) {
      return 'english';
    }
  }

  return null;
}
