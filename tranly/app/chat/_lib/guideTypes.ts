import type { LessonConfig } from './lessonTypes';
import type { ProficiencyLevel, SavedWord, SessionConfig } from './types';

/** Which experience the learner chose in the first guide question. */
export type GuideMode = 'chat' | 'lesson';

/**
 * The steps of the fixed-sequence interview, asked in this order:
 *   mode → words → topic → level → summary
 * The (optional) word step comes before topic so the learner can pick a topic
 * that fits the vocabulary they chose. The chat branch never asks for a goal —
 * it stays open-ended so the AI sets its own objective.
 */
export type GuideStep = 'mode' | 'words' | 'topic' | 'level' | 'summary';

/** Answers collected so far across the interview. */
export interface GuideAnswers {
  mode: GuideMode | null;
  topic: string;
  level: ProficiencyLevel | null;
  /** Chat objective — always left empty so the AI picks its own (open-ended). */
  goal: string;
  wordContext: SavedWord[];
}

/** The finished interview, ready to hand off to an existing engine. */
export type GuideOutcome =
  | { kind: 'chat'; config: SessionConfig }
  | { kind: 'lesson'; config: LessonConfig };

export const EMPTY_GUIDE_ANSWERS: GuideAnswers = {
  mode: null,
  topic: '',
  level: null,
  goal: '',
  wordContext: [],
};
