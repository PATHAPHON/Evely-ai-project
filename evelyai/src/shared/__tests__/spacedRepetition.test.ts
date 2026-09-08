import { describe, it, expect } from 'vitest';
import { WordProgress } from '../utils/spacedRepetition';

/** Build a WordProgress with default values, overriding any field. */
function make(overrides: Partial<WordProgress> = {}): WordProgress {
  return new WordProgress(
    overrides.box ?? 1,
    overrides.interval ?? 1,
    overrides.easeFactor ?? 2.5,
    overrides.repetitions ?? 0,
    overrides.nextReviewAt ?? new Date(),
    overrides.lastReviewedAt ?? null,
  );
}

describe('spacedRepetition', () => {
  describe('WordProgress.createInitial', () => {
    it('returns default box, interval, easeFactor, repetitions', () => {
      const r = WordProgress.createInitial();
      expect(r.box).toBe(1);
      expect(r.interval).toBe(1);
      expect(r.easeFactor).toBe(2.5);
      expect(r.repetitions).toBe(0);
    });

    it('sets nextReviewAt to 1 day from now', () => {
      const before = new Date();
      const r = WordProgress.createInitial();
      const expected = new Date(before);
      expected.setDate(expected.getDate() + 1);
      const diff = Math.abs(r.nextReviewAt.getTime() - expected.getTime());
      expect(diff).toBeLessThan(5000);
    });

    it('sets lastReviewedAt to approximately now', () => {
      const before = new Date();
      const r = WordProgress.createInitial();
      const diff = Math.abs(r.lastReviewedAt!.getTime() - before.getTime());
      expect(diff).toBeLessThan(1000);
    });
  });

  describe('review — fail path (quality < 3)', () => {
    it('resets box to 1, interval to 1, repetitions to 0 on q=0', () => {
      const r = make({ box: 5, interval: 30, repetitions: 8 }).review(0);
      expect(r.box).toBe(1);
      expect(r.interval).toBe(1);
      expect(r.repetitions).toBe(0);
    });

    it('resets on q=2 as well', () => {
      const r = make({ box: 3, interval: 10, repetitions: 3 }).review(2);
      expect(r.box).toBe(1);
      expect(r.interval).toBe(1);
      expect(r.repetitions).toBe(0);
    });

    it('still adjusts easeFactor downward on fail', () => {
      // q=0: EF adjustment = 0.1 - 5*(0.08+5*0.02) = 0.1 - 5*0.18 = 0.1-0.9 = -0.8
      const r = make({ easeFactor: 2.5 }).review(0);
      expect(r.easeFactor).toBeCloseTo(1.7, 5);
    });

    it('clamps easeFactor to 1.3 minimum on very low quality', () => {
      const r = make({ easeFactor: 1.3 }).review(0);
      expect(r.easeFactor).toBe(1.3);
    });

    it('sets nextReviewAt to tomorrow', () => {
      const before = new Date();
      const r = make().review(1);
      const tomorrow = new Date(before);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const diff = Math.abs(r.nextReviewAt.getTime() - tomorrow.getTime());
      expect(diff).toBeLessThan(5000);
    });

    it('leaves the original instance untouched (pure)', () => {
      const original = make({ box: 5, interval: 30, repetitions: 8 });
      original.review(0);
      expect(original.box).toBe(5);
      expect(original.interval).toBe(30);
      expect(original.repetitions).toBe(8);
    });
  });

  describe('review — pass path (quality >= 3)', () => {
    it('increments repetitions on pass', () => {
      const r = make().review(4);
      expect(r.repetitions).toBe(1);
    });

    it('first pass (rep 0→1): interval = 1 day', () => {
      const r = make({ repetitions: 0 }).review(4);
      expect(r.interval).toBe(1);
    });

    it('second pass (rep 1→2): interval = 6 days', () => {
      const r = make({ interval: 1, repetitions: 1 }).review(4);
      expect(r.repetitions).toBe(2);
      expect(r.interval).toBe(6);
    });

    it('third pass (rep 2→3): interval = round(current.interval * EF)', () => {
      // EF after q=4: 2.5 + (0.1 - 1*(0.08+0.02)) = 2.5 + 0 = 2.5
      const r = make({ interval: 6, repetitions: 2, easeFactor: 2.5 }).review(4);
      expect(r.repetitions).toBe(3);
      expect(r.interval).toBe(Math.round(6 * 2.5));
    });

    it('increments box on pass', () => {
      const r = make().review(4);
      expect(r.box).toBe(2);
    });

    it('adjusts easeFactor via SM-2 formula on q=5', () => {
      // q=5: EF' = 2.5 + (0.1 - 0*(0.08+0)) = 2.5 + 0.1 = 2.6
      const r = make().review(5);
      expect(r.easeFactor).toBeCloseTo(2.6, 5);
    });

    it('adjusts easeFactor via SM-2 formula on q=3', () => {
      // q=3: EF' = 2.5 + (0.1 - 2*(0.08+2*0.02)) = 2.5 + (0.1 - 2*0.12) = 2.5 - 0.14 = 2.36
      const r = make().review(3);
      expect(r.easeFactor).toBeCloseTo(2.36, 5);
    });

    it('nextReviewAt is in the future', () => {
      const before = new Date();
      const r = make().review(4);
      expect(r.nextReviewAt.getTime()).toBeGreaterThan(before.getTime());
    });

    it('ensures interval is at least 1', () => {
      const r = make({ interval: 0, repetitions: 5 }).review(3);
      expect(r.interval).toBeGreaterThanOrEqual(1);
    });

    it('clamps quality: decimal rounds correctly', () => {
      const r4 = make().review(3.7);
      const r3 = make().review(3);
      // 3.7 rounds to 4, 3 stays 3 — different EF
      expect(r4.easeFactor).not.toBeCloseTo(r3.easeFactor, 5);
    });
  });

  describe('needsReview', () => {
    it('returns true when nextReviewAt is in the past', () => {
      const p = make({ nextReviewAt: new Date(Date.now() - 86400000) });
      expect(p.needsReview()).toBe(true);
    });

    it('returns false when nextReviewAt is in the future', () => {
      const p = make({ nextReviewAt: new Date(Date.now() + 86400000) });
      expect(p.needsReview()).toBe(false);
    });
  });
});