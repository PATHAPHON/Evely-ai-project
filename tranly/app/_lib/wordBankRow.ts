import type { WordBankEntry } from './wordStatusDerivation';

/** Shape of a `words` row joined with its `word_progress` (as returned by Supabase). */
export interface WordProgressRow {
  box?: number | null;
  interval?: number | null;
  ease_factor?: number | null;
  last_reviewed_at?: string | null;
  next_review_at?: string | null;
}

export interface WordRow {
  id: string;
  word?: string | null;
  thai?: string | null;
  ipa?: string | null;
  part_of_speech?: string | null;
  image_url?: string | null;
  word_progress?: WordProgressRow | WordProgressRow[] | null;
}

/** Detect Supabase errors that mean the auth session has expired. */
export function isAuthExpiredError(
  error: { message?: string; code?: string } | null
): boolean {
  if (!error) return false;
  const msg = (error.message || '').toLowerCase();
  return (
    msg.includes('jwt expired') ||
    msg.includes('invalid claim') ||
    msg.includes('not authenticated') ||
    error.code === 'PGRST301' ||
    error.code === '401'
  );
}

/**
 * Map a `words` row (joined with `word_progress`) into an in-memory WordBankEntry.
 * `wordKey` is the normalized cache key (lowercased word) to store under.
 */
export function rowToWordBankEntry(row: WordRow, wordKey: string): WordBankEntry {
  const progress = Array.isArray(row.word_progress)
    ? row.word_progress[0]
    : row.word_progress;

  return {
    id: row.id,
    word: wordKey,
    thai: row.thai || null,
    ipa: row.ipa || null,
    partOfSpeech: row.part_of_speech || null,
    imageUrl: row.image_url || null,
    nextReviewAt: progress?.next_review_at
      ? new Date(progress.next_review_at)
      : new Date(0),
    lastReviewedAt: progress?.last_reviewed_at
      ? new Date(progress.last_reviewed_at)
      : null,
    box: progress?.box ?? 1,
    interval: progress?.interval ?? 1,
    easeFactor: progress?.ease_factor ?? 2.5,
  };
}
