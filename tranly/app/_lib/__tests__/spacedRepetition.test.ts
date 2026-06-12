import { describe, it, expect } from 'vitest';
import {
  recalculateProgress,
  createInitialProgress,
  DEFAULT_PROGRESS,
} from '../spacedRepetition';

describe('spacedRepetition', () => {
  describe('DEFAULT_PROGRESS', () => {
    it('has correct initial values', () => {
      expect(DEFAULT_PROGRESS.box).toBe(1);
      expect(DEFAULT_PROGRESS.interval).toBe(1);
      expect(DEFAULT_PROGRESS.easeFactor).toBe(2.5);
    });
  });

  describe('recalculateProgress', () => {
    it('increments box by 1', () => {
      const result = recalculateProgress({ box: 1, interval: 1, easeFactor: 2.5 });
      expect(result.box).toBe(2);
    });

    it('sets interval to 3 when new box is 2', () => {
      const result = recalculateProgress({ box: 1, interval: 1, easeFactor: 2.5 });
      expect(result.box).toBe(2);
      expect(result.interval).toBe(3);
    });

    it('calculates interval as round(prev_interval * new_ease) for box >= 3', () => {
      const result = recalculateProgress({ box: 2, interval: 3, easeFactor: 2.5 });
      expect(result.box).toBe(3);
      // new ease = 2.6, interval = round(3 * 2.6) = round(7.8) = 8
      expect(result.interval).toBe(8);
    });

    it('increases ease factor by 0.1', () => {
      const result = recalculateProgress({ box: 1, interval: 1, easeFactor: 2.5 });
      expect(result.easeFactor).toBeCloseTo(2.6);
    });

    it('clamps ease factor to minimum 1.3', () => {
      const result = recalculateProgress({ box: 1, interval: 1, easeFactor: 1.2 });
      expect(result.easeFactor).toBe(1.3);
    });

    it('produces nextReviewAt strictly in the future', () => {
      const before = new Date();
      const result = recalculateProgress({ box: 1, interval: 1, easeFactor: 2.5 });
      expect(result.nextReviewAt.getTime()).toBeGreaterThan(before.getTime());
    });

    it('ensures interval is at least 1', () => {
      // Even with weird edge case inputs, interval should be >= 1
      const result = recalculateProgress({ box: 5, interval: 0, easeFactor: 1.3 });
      expect(result.interval).toBeGreaterThanOrEqual(1);
    });
  });

  describe('createInitialProgress', () => {
    it('returns default box, interval, easeFactor', () => {
      const result = createInitialProgress();
      expect(result.box).toBe(1);
      expect(result.interval).toBe(1);
      expect(result.easeFactor).toBe(2.5);
    });

    it('sets nextReviewAt to 1 day from now', () => {
      const before = new Date();
      const result = createInitialProgress();
      const expectedMin = new Date(before);
      expectedMin.setDate(expectedMin.getDate() + 1);
      // nextReviewAt should be approximately 1 day from now (within a few seconds)
      const diff = Math.abs(result.nextReviewAt.getTime() - expectedMin.getTime());
      expect(diff).toBeLessThan(5000); // within 5 seconds
    });

    it('sets lastReviewedAt to approximately now', () => {
      const before = new Date();
      const result = createInitialProgress();
      const diff = Math.abs(result.lastReviewedAt.getTime() - before.getTime());
      expect(diff).toBeLessThan(1000); // within 1 second
    });
  });
});
