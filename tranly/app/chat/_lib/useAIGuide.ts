'use client';

import { useCallback, useMemo, useState } from 'react';
import { validateTopic } from './validateTopic';
import type { TargetLanguage } from '@/app/_lib/wordTypes';
import {
  EMPTY_GUIDE_ANSWERS,
  type GuideAnswers,
  type GuideMode,
  type GuideOutcome,
  type GuideStep,
} from './guideTypes';

/**
 * The fixed question order for each branch. `mode` is always first; once the
 * learner picks a branch the rest of the path is known. The chat branch adds a
 * `goal` step that the lesson branch doesn't have.
 */
export function stepSequence(mode: GuideMode | null): GuideStep[] {
  if (mode === null) return ['mode'];
  // Both branches ask the same questions; the chat's objective is left open so
  // the AI can decide it on its own rather than asking the learner.
  return ['mode', 'words', 'topic', 'level', 'summary'];
}

/**
 * Build the handoff config from collected answers, or null if the required
 * answers (mode, a valid topic, level) aren't all present yet.
 */
export function buildOutcome(
  answers: GuideAnswers,
  language: TargetLanguage
): GuideOutcome | null {
  const { mode, topic, level, goal, wordContext } = answers;
  if (mode === null || level === null || !validateTopic(topic)) return null;

  if (mode === 'lesson') {
    return {
      kind: 'lesson',
      config: {
        topic: topic.trim(),
        proficiencyLevel: level,
        wordContext,
        language,
      },
    };
  }

  return {
    kind: 'chat',
    config: {
      topic: topic.trim(),
      proficiencyLevel: level,
      wordContext,
      goal: goal.trim(),
      language,
    },
  };
}

export interface UseAIGuideReturn {
  answers: GuideAnswers;
  currentStep: GuideStep;
  /** Steps already answered, in order — used to render the chat history. */
  answeredSteps: GuideStep[];
  /** Merge a partial answer and advance to the next step. */
  answer: (partial: Partial<GuideAnswers>) => void;
  /** Advance without changing answers (skip an optional step). */
  skip: () => void;
  /** Go back one step. */
  back: () => void;
  /** Restart the interview. */
  reset: () => void;
  isComplete: boolean;
  buildOutcome: () => GuideOutcome | null;
}

export function useAIGuide(language: TargetLanguage): UseAIGuideReturn {
  const [answers, setAnswers] = useState<GuideAnswers>(EMPTY_GUIDE_ANSWERS);
  const [stepIndex, setStepIndex] = useState(0);

  const sequence = useMemo(() => stepSequence(answers.mode), [answers.mode]);
  const clampedIndex = Math.min(stepIndex, sequence.length - 1);
  const currentStep = sequence[clampedIndex];

  const answer = useCallback((partial: Partial<GuideAnswers>) => {
    setAnswers((prev) => ({ ...prev, ...partial }));
    setStepIndex((prev) => prev + 1);
  }, []);

  const skip = useCallback(() => {
    setStepIndex((prev) => prev + 1);
  }, []);

  const back = useCallback(() => {
    setStepIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const reset = useCallback(() => {
    setAnswers(EMPTY_GUIDE_ANSWERS);
    setStepIndex(0);
  }, []);

  const answeredSteps = useMemo(
    () => sequence.slice(0, clampedIndex),
    [sequence, clampedIndex]
  );

  return {
    answers,
    currentStep,
    answeredSteps,
    answer,
    skip,
    back,
    reset,
    isComplete: currentStep === 'summary',
    buildOutcome: () => buildOutcome(answers, language),
  };
}
