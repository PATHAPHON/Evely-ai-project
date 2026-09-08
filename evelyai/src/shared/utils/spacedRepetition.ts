/**
 * Spaced repetition algorithm (SM-2) for word learning progress.
 *
 * Implements the SM-2 algorithm: quality score 0-5 drives ease factor and
 * interval. Scores < 3 reset progress; scores >= 3 advance it.
 * EF formula: EF' = EF + (0.1 - (5-q) * (0.08 + (5-q) * 0.02)), min 1.3
 *
 * The WordProgress class encapsulates a word's review state plus the SM-2
 * algorithm that advances it, so state and behavior live together.
 */
export class WordProgress {
  constructor(
    readonly box: number,
    readonly interval: number,
    readonly easeFactor: number,
    readonly repetitions: number,
    readonly nextReviewAt: Date,
    readonly lastReviewedAt: Date | null = null,
  ) {}

  /**
   * Creates the default initial progress for a newly added word.
   * Sets nextReviewAt to 1 day from now and lastReviewedAt to now.
   */
  static createInitial(): WordProgress {
    const now = new Date();
    const nextReviewAt = new Date(now);
    nextReviewAt.setDate(nextReviewAt.getDate() + 1);

    return new WordProgress(1, 1, 2.5, 0, nextReviewAt, now);
  }

  /**
   * Recalculates progress after a review with a quality score.
   *
   * quality 0-2 (fail): reset repetitions to 0, interval to 1, box to 1.
   * quality 3-5 (pass): advance repetitions, calculate new interval via SM-2,
   *   increment box, update ease factor.
   *
   * Interval schedule on pass:
   *   - repetitions == 1 → 1 day
   *   - repetitions == 2 → 6 days
   *   - repetitions > 2  → round(previous interval × new ease factor)
   *
   * Pure: returns a new instance and leaves `this` untouched.
   */
  review(quality: number): WordProgress {
    const q = Math.max(0, Math.min(5, Math.round(quality)));

    const newEaseFactor = Math.max(
      1.3,
      this.easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    );

    const nextReviewAt = new Date();

    if (q < 3) {
      // Fail: reset path — word goes back to day 1.
      nextReviewAt.setDate(nextReviewAt.getDate() + 1);
      return new WordProgress(1, 1, newEaseFactor, 0, nextReviewAt);
    }

    const newRepetitions = this.repetitions + 1;

    let newInterval: number;
    if (newRepetitions === 1) {
      newInterval = 1;
    } else if (newRepetitions === 2) {
      newInterval = 6;
    } else {
      newInterval = Math.round(this.interval * newEaseFactor);
    }

    newInterval = Math.max(1, newInterval);
    nextReviewAt.setDate(nextReviewAt.getDate() + newInterval);

    return new WordProgress(
      this.box + 1,
      newInterval,
      newEaseFactor,
      newRepetitions,
      nextReviewAt
    );
  }

  /** Whether the word is due for review (its scheduled review time has passed). */
  needsReview(): boolean {
    return this.nextReviewAt <= new Date();
  }
}