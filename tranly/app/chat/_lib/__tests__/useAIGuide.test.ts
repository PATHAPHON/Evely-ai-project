import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { buildOutcome, stepSequence, useAIGuide } from '../useAIGuide';
import { EMPTY_GUIDE_ANSWERS, type GuideAnswers } from '../guideTypes';
import type { SavedWord } from '../types';

const word: SavedWord = {
  id: 'w1',
  korean: '사과',
  reading: 'ซากวา',
  romanization: 'sagwa',
  english: 'apple',
  thai: 'แอปเปิ้ล',
  source: 'word-store',
};

describe('stepSequence', () => {
  it('only asks the mode question until a branch is chosen', () => {
    expect(stepSequence(null)).toEqual(['mode']);
  });

  it('asks words before topic on the lesson path', () => {
    expect(stepSequence('lesson')).toEqual(['mode', 'words', 'topic', 'level', 'summary']);
  });

  it('uses the same questions for chat (goal stays open-ended, never asked)', () => {
    expect(stepSequence('chat')).toEqual(['mode', 'words', 'topic', 'level', 'summary']);
  });
});

describe('buildOutcome', () => {
  const base: GuideAnswers = {
    ...EMPTY_GUIDE_ANSWERS,
    topic: '  อาหารเกาหลี  ',
    level: 'beginner',
    wordContext: [word],
  };

  it('returns null until mode, topic and level are all valid', () => {
    expect(buildOutcome(EMPTY_GUIDE_ANSWERS, 'korean')).toBeNull();
    expect(buildOutcome({ ...base, mode: 'lesson', topic: 'x' }, 'korean')).toBeNull(); // topic too short
    expect(buildOutcome({ ...base, mode: 'lesson', level: null }, 'korean')).toBeNull();
  });

  it('builds a trimmed lesson config carrying the language', () => {
    const outcome = buildOutcome({ ...base, mode: 'lesson' }, 'japanese');
    expect(outcome).toEqual({
      kind: 'lesson',
      config: {
        topic: 'อาหารเกาหลี',
        proficiencyLevel: 'beginner',
        wordContext: [word],
        language: 'japanese',
      },
    });
  });

  it('builds a chat config with an open-ended (empty) goal and the language', () => {
    const outcome = buildOutcome({ ...base, mode: 'chat' }, 'chinese');
    expect(outcome).toEqual({
      kind: 'chat',
      config: {
        topic: 'อาหารเกาหลี',
        proficiencyLevel: 'beginner',
        wordContext: [word],
        goal: '',
        language: 'chinese',
      },
    });
  });
});

describe('useAIGuide flow', () => {
  it('walks the lesson branch to a complete outcome', () => {
    const { result } = renderHook(() => useAIGuide('korean'));

    expect(result.current.currentStep).toBe('mode');

    act(() => result.current.answer({ mode: 'lesson' }));
    expect(result.current.currentStep).toBe('words');

    // Skip the optional word step.
    act(() => result.current.skip());
    expect(result.current.currentStep).toBe('topic');

    act(() => result.current.answer({ topic: 'การทักทาย' }));
    expect(result.current.currentStep).toBe('level');

    act(() => result.current.answer({ level: 'intermediate' }));
    expect(result.current.currentStep).toBe('summary');
    expect(result.current.isComplete).toBe(true);

    expect(result.current.buildOutcome()).toEqual({
      kind: 'lesson',
      config: {
        topic: 'การทักทาย',
        proficiencyLevel: 'intermediate',
        wordContext: [],
        language: 'korean',
      },
    });
  });

  it('walks the chat branch (no goal step) and supports going back', () => {
    const { result } = renderHook(() => useAIGuide('korean'));

    act(() => result.current.answer({ mode: 'chat' }));
    act(() => result.current.skip()); // words
    act(() => result.current.answer({ topic: 'ช้อปปิ้ง' }));
    expect(result.current.currentStep).toBe('level');

    act(() => result.current.answer({ level: 'beginner' }));
    expect(result.current.currentStep).toBe('summary');

    act(() => result.current.back());
    expect(result.current.currentStep).toBe('level');

    act(() => result.current.answer({ level: 'advanced' }));
    expect(result.current.currentStep).toBe('summary');

    const outcome = result.current.buildOutcome();
    expect(outcome?.kind).toBe('chat');
    expect(outcome).toMatchObject({
      config: { proficiencyLevel: 'advanced', goal: '' },
    });
  });

  it('reset returns to the first question', () => {
    const { result } = renderHook(() => useAIGuide('korean'));
    act(() => result.current.answer({ mode: 'lesson' }));
    act(() => result.current.reset());
    expect(result.current.currentStep).toBe('mode');
    expect(result.current.answers).toEqual(EMPTY_GUIDE_ANSWERS);
  });
});
