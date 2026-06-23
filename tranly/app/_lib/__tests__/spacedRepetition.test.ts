import { describe, it, expect } from 'vitest';
import {
  recalculateProgress,
  createInitialProgress,
  DEFAULT_PROGRESS,
} from '../utils/spacedRepetition';

const base = { box: 1, interval: 1, easeFactor: 2.5, repetitions: 0 };

describe('spacedRepetition', () => {
  describe('DEFAULT_PROGRESS', () => {
    it('has correct initial values', () => {
      expect(DEFAULT_PROGRESS.box).toBe(1);
      expect(DEFAULT_PROGRESS.interval).toBe(1);
      expect(DEFAULT_PROGRESS.easeFactor).toBe(2.5);
      expect(DEFAULT_PROGRESS.repetitions).toBe(0);
    });
  });

  describe('recalculateProgress — fail path (quality < 3)', () => {
    it('resets box to 1, interval to 1, repetitions to 0 on q=0', () => {
      const r = recalculateProgress({ ...base, box: 5, interval: 30, repetitions: 8 }, 0);
      expect(r.box).toBe(1);
      expect(r.interval).toBe(1);
      expect(r.repetitions).toBe(0);
    });

    it('resets on q=2 as well', () => {
      const r = recalculateProgress({ ...base, box: 3, interval: 10, repetitions: 3 }, 2);
      expect(r.box).toBe(1);
      expect(r.interval).toBe(1);
      expect(r.repetitions).toBe(0);
    });

    it('still adjusts easeFactor downward on fail', () => {
      // q=0: EF adjustment = 0.1 - 5*(0.08+5*0.02) = 0.1 - 5*0.18 = 0.1-0.9 = -0.8
      const r = recalculateProgress({ ...base, easeFactor: 2.5 }, 0);
      expect(r.easeFactor).toBeCloseTo(1.7, 5);
    });

    it('clamps easeFactor to 1.3 minimum on very low quality', () => {
      const r = recalculateProgress({ ...base, easeFactor: 1.3 }, 0);
      expect(r.easeFactor).toBe(1.3);
    });

    it('sets nextReviewAt to tomorrow', () => {
      const before = new Date();
      const r = recalculateProgress(base, 1);
      const tomorrow = new Date(before);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const diff = Math.abs(r.nextReviewAt.getTime() - tomorrow.getTime());
      expect(diff).toBeLessThan(5000);
    });
  });

  describe('recalculateProgress — pass path (quality >= 3)', () => {
    it('increments repetitions on pass', () => {
      const r = recalculateProgress(base, 4);
      expect(r.repetitions).toBe(1);
    });

    it('first pass (rep 0→1): interval = 1 day', () => {
      const r = recalculateProgress({ ...base, repetitions: 0 }, 4);
      expect(r.interval).toBe(1);
    });

    it('second pass (rep 1→2): interval = 6 days', () => {
      const r = recalculateProgress({ ...base, interval: 1, repetitions: 1 }, 4);
      expect(r.repetitions).toBe(2);
      expect(r.interval).toBe(6);
    });

    it('third pass (rep 2→3): interval = round(current.interval * EF)', () => {
      // EF after q=4: 2.5 + (0.1 - 1*(0.08+0.02)) = 2.5 + 0 = 2.5
      const r = recalculateProgress({ ...base, interval: 6, repetitions: 2, easeFactor: 2.5 }, 4);
      expect(r.repetitions).toBe(3);
      expect(r.interval).toBe(Math.round(6 * 2.5));
    });

    it('increments box on pass', () => {
      const r = recalculateProgress(base, 4);
      expect(r.box).toBe(2);
    });

    it('adjusts easeFactor via SM-2 formula on q=5', () => {
      // q=5: EF' = 2.5 + (0.1 - 0*(0.08+0)) = 2.5 + 0.1 = 2.6
      const r = recalculateProgress(base, 5);
      expect(r.easeFactor).toBeCloseTo(2.6, 5);
    });

    it('adjusts easeFactor via SM-2 formula on q=3', () => {
      // q=3: EF' = 2.5 + (0.1 - 2*(0.08+2*0.02)) = 2.5 + (0.1 - 2*0.12) = 2.5 - 0.14 = 2.36
      const r = recalculateProgress(base, 3);
      expect(r.easeFactor).toBeCloseTo(2.36, 5);
    });

    it('nextReviewAt is in the future', () => {
      const before = new Date();
      const r = recalculateProgress(base, 4);
      expect(r.nextReviewAt.getTime()).toBeGreaterThan(before.getTime());
    });

    it('ensures interval is at least 1', () => {
      const r = recalculateProgress({ ...base, interval: 0, repetitions: 5 }, 3);
      expect(r.interval).toBeGreaterThanOrEqual(1);
    });

    it('clamps quality: decimal rounds correctly', () => {
      const r4 = recalculateProgress(base, 3.7);
      const r3 = recalculateProgress(base, 3);
      // 3.7 rounds to 4, 3 stays 3 — different EF
      expect(r4.easeFactor).not.toBeCloseTo(r3.easeFactor, 5);
    });
  });

  describe('createInitialProgress', () => {
    it('returns default box, interval, easeFactor, repetitions', () => {
      const r = createInitialProgress();
      expect(r.box).toBe(1);
      expect(r.interval).toBe(1);
      expect(r.easeFactor).toBe(2.5);
      expect(r.repetitions).toBe(0);
    });

    it('sets nextReviewAt to 1 day from now', () => {
      const before = new Date();
      const r = createInitialProgress();
      const expected = new Date(before);
      expected.setDate(expected.getDate() + 1);
      const diff = Math.abs(r.nextReviewAt.getTime() - expected.getTime());
      expect(diff).toBeLessThan(5000);
    });

    it('sets lastReviewedAt to approximately now', () => {
      const before = new Date();
      const r = createInitialProgress();
      const diff = Math.abs(r.lastReviewedAt.getTime() - before.getTime());
      expect(diff).toBeLessThan(1000);
    });
  });
});
