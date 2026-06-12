/**
 * Word status derivation logic for the Clickable Word Learning feature.
 *
 * Determines a word's learning status by checking the user's word bank
 * and rejected words set. Priority: word bank > rejected_words > unknown.
 */

/** The learning status of a word. */
export type WordStatus = 'unknown' | 'known' | 'needs_review' | 'rejected';

/** Color mapping for each word status in light and dark modes. */
export const STATUS_COLORS: Record<WordStatus, { light: string; dark: string }> = {
  unknown: { light: '#1a1a1a', dark: '#e5e5e5' },
  known: { light: '#16a34a', dark: '#4ade80' },
  needs_review: { light: '#ca8a04', dark: '#facc15' },
  rejected: { light: '#6b7280', dark: '#9ca3af' },
};

/** In-memory word bank entry used for status derivation. */
export interface WordBankEntry {
  id: string;
  word: string;
  thai: string | null;
  ipa: string | null;
  partOfSpeech: string | null;
  imageUrl: string | null;
  nextReviewAt: Date;
  lastReviewedAt: Date | null;
  box: number;
  interval: number;
  easeFactor: number;
}

/**
 * Derives the learning status of a word based on the user's word bank
 * and rejected words set.
 *
 * Lookup is case-insensitive (normalized to lowercase).
 *
 * Priority:
 *   1. Word exists in word bank → "known" or "needs_review" (based on nextReviewAt)
 *   2. Word exists in rejected set → "rejected"
 *   3. Otherwise → "unknown"
 *
 * @param word - The word to look up
 * @param wordBank - Map of lowercase words to their bank entries
 * @param rejectedSet - Set of lowercase rejected word keys
 * @returns The derived WordStatus
 */
export function deriveWordStatus(
  word: string,
  wordBank: Map<string, WordBankEntry>,
  rejectedSet: Set<string>
): WordStatus {
  const normalizedWord = word.toLowerCase().trim();

  const entry = wordBank.get(normalizedWord);
  if (entry) {
    if (entry.nextReviewAt <= new Date()) {
      return 'needs_review';
    }
    return 'known';
  }

  if (rejectedSet.has(normalizedWord)) {
    return 'rejected';
  }

  return 'unknown';
}
