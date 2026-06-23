/**
 * Spaced repetition algorithm (SM-2) for word learning progress.
 *
 * Implements the SM-2 algorithm: quality score 0-5 drives ease factor and
 * interval. Scores < 3 reset progress; scores >= 3 advance it.
 * EF formula: EF' = EF + (0.1 - (5-q) * (0.08 + (5-q) * 0.02)), min 1.3
 */

/** Default initial values for a new word's progress record. */
export const DEFAULT_PROGRESS = {
  box: 1,
  interval: 1,
  easeFactor: 2.5,
  repetitions: 0,
} as const;

/** Input state for recalculation. */
export interface ProgressState {
  box: number;
  interval: number;
  easeFactor: number;
  repetitions: number;
}

/** Output state after recalculation, including the next scheduled review date. */
export interface RecalculatedProgress {
  box: number;
  interval: number;
  easeFactor: number;
  repetitions: number;
  nextReviewAt: Date;
}

/**
 * Recalculates spaced repetition progress after a review with a quality score.
 *
 * quality 0-2 (fail): reset repetitions to 0, interval to 1, box to 1.
 * quality 3-5 (pass): advance repetitions, calculate new interval via SM-2,
 *   increment box, update ease factor.
 *
 * Interval schedule on pass:
 *   - repetitions == 1 → 1 day
 *   - repetitions == 2 → 6 days
 *   - repetitions > 2  → round(previous interval × new ease factor)
 */
export function recalculateProgress(
  current: ProgressState,
  quality: number
): RecalculatedProgress {
  // Clamp quality to valid range
  const q = Math.max(0, Math.min(5, Math.round(quality)));

  // SM-2 ease factor formula
  const newEaseFactor = Math.max(
    1.3,
    current.easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  );

  const nextReviewAt = new Date();

  if (q < 3) {
    // ponytail: reset path — word goes back to day 1
    nextReviewAt.setDate(nextReviewAt.getDate() + 1);
    return {
      box: 1,
      interval: 1,
      easeFactor: newEaseFactor,
      repetitions: 0,
      nextReviewAt,
    };
  }

  const newRepetitions = current.repetitions + 1;

  let newInterval: number;
  if (newRepetitions === 1) {
    newInterval = 1;
  } else if (newRepetitions === 2) {
    newInterval = 6;
  } else {
    newInterval = Math.round(current.interval * newEaseFactor);
  }

  newInterval = Math.max(1, newInterval);
  nextReviewAt.setDate(nextReviewAt.getDate() + newInterval);

  return {
    box: current.box + 1,
    interval: newInterval,
    easeFactor: newEaseFactor,
    repetitions: newRepetitions,
    nextReviewAt,
  };
}

/**
 * Creates the default initial progress values for a newly added word.
 * Sets nextReviewAt to 1 day from now and lastReviewedAt to now.
 */
export function createInitialProgress(): RecalculatedProgress & { lastReviewedAt: Date } {
  const now = new Date();
  const nextReviewAt = new Date(now);
  nextReviewAt.setDate(nextReviewAt.getDate() + DEFAULT_PROGRESS.interval);

  return {
    box: DEFAULT_PROGRESS.box,
    interval: DEFAULT_PROGRESS.interval,
    easeFactor: DEFAULT_PROGRESS.easeFactor,
    repetitions: DEFAULT_PROGRESS.repetitions,
    nextReviewAt,
    lastReviewedAt: now,
  };
}
