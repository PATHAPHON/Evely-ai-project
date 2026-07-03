import type { useWordBank } from '@/shared/hooks/useWordBank';
import { shuffle } from './utils/shuffle';

export type WordBank = ReturnType<typeof useWordBank>['words'];

export interface GameProps {
  /** Target word in the language being learned. */
  word: string;
  /** Thai translation of the target word. */
  thai: string;
  /** Full word bank, used to generate distractors. */
  wordBank: WordBank;
  /** Called once the round is scored with an SM-2 quality (0-5). */
  onDone: (quality: number) => void;
}

/**
 * Picks up to `count` distractor entries from the word bank, excluding the
 * target word. Returns whatever is available (may be fewer than requested).
 */
export function pickDistractors(
  wordBank: WordBank,
  targetWord: string,
  count: number
): { word: string; thai: string }[] {
  const target = targetWord.toLowerCase().trim();
  const pool = wordBank.filter(
    (w) => w.word.toLowerCase().trim() !== target && w.thai && w.thai.trim()
  );
  shuffle(pool);
  return pool.slice(0, Math.max(0, count)).map((w) => ({
    word: w.word,
    thai: w.thai as string,
  }));
}
