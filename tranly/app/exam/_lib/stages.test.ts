import { describe, expect, it } from 'vitest';
import {
  EXAM_STAGES,
  getCurrentStageId,
  getStageIndex,
  isStageUnlocked,
} from './stages';
import { CEFR_LEVELS } from './types';

describe('EXAM_STAGES integrity', () => {
  it('has 32 stages, 8 per level', () => {
    expect(EXAM_STAGES).toHaveLength(32);
    for (const level of CEFR_LEVELS) {
      expect(EXAM_STAGES.filter((s) => s.level === level)).toHaveLength(8);
    }
  });

  it('has unique ids', () => {
    const ids = EXAM_STAGES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('is ordered A1 → A2 → B1 → B2', () => {
    const order = EXAM_STAGES.map((s) => CEFR_LEVELS.indexOf(s.level));
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it('every stage has non-empty topic, emoji and titles', () => {
    for (const s of EXAM_STAGES) {
      expect(s.topic.trim()).not.toBe('');
      expect(s.emoji.trim()).not.toBe('');
      expect(s.titleEn.trim()).not.toBe('');
      expect(s.titleTh.trim()).not.toBe('');
    }
  });
});

describe('isStageUnlocked', () => {
  const first = EXAM_STAGES[0].id;
  const second = EXAM_STAGES[1].id;
  const third = EXAM_STAGES[2].id;

  it('first stage is always unlocked', () => {
    expect(isStageUnlocked(first, new Set())).toBe(true);
  });

  it('stage N+1 unlocks only after stage N is completed', () => {
    expect(isStageUnlocked(second, new Set())).toBe(false);
    expect(isStageUnlocked(second, new Set([first]))).toBe(true);
    expect(isStageUnlocked(third, new Set([first]))).toBe(false);
  });

  it('completed stages stay unlocked', () => {
    expect(isStageUnlocked(second, new Set([second]))).toBe(true);
  });

  it('unknown stage id is locked', () => {
    expect(isStageUnlocked('nope', new Set([first]))).toBe(false);
  });
});

describe('getCurrentStageId', () => {
  it('returns the first stage when nothing is completed', () => {
    expect(getCurrentStageId(new Set())).toBe(EXAM_STAGES[0].id);
  });

  it('returns the first uncompleted stage', () => {
    expect(getCurrentStageId(new Set([EXAM_STAGES[0].id]))).toBe(
      EXAM_STAGES[1].id
    );
  });

  it('returns null when every stage is completed', () => {
    expect(getCurrentStageId(new Set(EXAM_STAGES.map((s) => s.id)))).toBeNull();
  });
});

describe('getStageIndex', () => {
  it('returns ordinal position or -1', () => {
    expect(getStageIndex(EXAM_STAGES[5].id)).toBe(5);
    expect(getStageIndex('nope')).toBe(-1);
  });
});
