import type { useWordBank } from '@/shared/hooks/useWordBank';
import { shuffle } from './utils/shuffle';
import { matchingQuality, speakQuality, typingQuality } from './quality';

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

/** Matches the `animate-card-out` CSS transition duration. */
export const EXIT_ANIM_MS = 450;

/**
 * A single round of a mini-game. Encapsulates the lifecycle every round
 * shares — score, play the exit animation, then hand the quality back to the
 * caller — via the template method `finish`. Subclasses supply their own
 * scoring (`score`), which maps a game outcome to an SM-2 quality (0-5).
 */
export abstract class GameRound {
  private _isExiting = false;

  constructor(
    protected readonly props: GameProps,
    /** Called when the exit animation starts so the view can re-render. */
    private readonly onExitStart: () => void = () => {},
  ) {}

  /** Whether the round is playing its exit animation. */
  get isExiting(): boolean {
    return this._isExiting;
  }

  /** Template: score → exit animation → onDone handoff shared by every round. */
  finish(quality: number): void {
    if (this._isExiting) return;
    this._isExiting = true;
    this.onExitStart();
    setTimeout(() => this.props.onDone(quality), EXIT_ANIM_MS);
  }
}

/** Matching game: quality decreases with the number of wrong attempts. */
export class MatchingRound extends GameRound {
  score(mistakes: number): number {
    return matchingQuality(mistakes);
  }
}

/** Typing game: quality from edit distance between input and target. */
export class TypingRound extends GameRound {
  score(input: string, target: string): number {
    return typingQuality(input, target);
  }
}

/** Speak game: quality from attempts and whether the target was recognized. */
export class SpeakRound extends GameRound {
  score(attempts: number, gotIt: boolean): number {
    return speakQuality(attempts, gotIt);
  }
}