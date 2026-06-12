/**
 * Spaced repetition algorithm (SM-2 variant) for word learning progress.
 *
 * Implements box-based scheduling where each successful review increments the box,
 * adjusts the ease factor, and calculates the next review interval.
 */

/** Default initial values for a new word's progress record. */
export const DEFAULT_PROGRESS = {
  box: 1,
  interval: 1,
  easeFactor: 2.5,
} as const;

/** Input state for recalculation. */
export interface ProgressState {
  box: number;
  interval: number;
  easeFactor: number;
}

/** Output state after recalculation, including the next scheduled review date. */
export interface RecalculatedProgress {
  box: number;
  interval: number;
  easeFactor: number;
  nextReviewAt: Date;
}

/**
 * Recalculates spaced repetition progress after a successful review.
 *
 * - Increments box by 1
 * - Increases ease factor by 0.1, clamped to minimum 1.3
 * - Calculates new interval:
 *   - Box 1 → 1 day
 *   - Box 2 → 3 days
 *   - Box 3+ → previous interval × new ease factor (rounded)
 * - Sets nextReviewAt to now + new interval days
 */
export function recalculateProgress(current: ProgressState): RecalculatedProgress {
  const newBox = current.box + 1;
  const newEaseFactor = Math.max(1.3, current.easeFactor + 0.1);

  let newInterval: number;
  if (newBox === 1) {
    newInterval = 1;
  } else if (newBox === 2) {
    newInterval = 3;
  } else {
    newInterval = Math.round(current.interval * newEaseFactor);
  }

  // Ensure interval is always at least 1 day
  newInterval = Math.max(1, newInterval);

  const nextReviewAt = new Date();
  nextReviewAt.setDate(nextReviewAt.getDate() + newInterval);

  return { box: newBox, interval: newInterval, easeFactor: newEaseFactor, nextReviewAt };
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
    nextReviewAt,
    lastReviewedAt: now,
  };
}
