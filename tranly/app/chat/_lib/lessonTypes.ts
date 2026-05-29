import type { ChatErrorType, ProficiencyLevel, SavedWord } from './types';

export type ExerciseType =
  | 'multiple_choice'
  | 'fill_blank'
  | 'matching'
  | 'listening';

export interface MatchingPair {
  korean: string;
  thai: string;
}

export interface LessonExercise {
  id: string;
  type: ExerciseType;
  /** Instruction or question shown to the learner (Thai or English). */
  prompt: string;
  /** Target Korean — listening TTS source, fill-blank sentence, or display word. */
  korean?: string;
  /** Korean pronunciation in Thai-script karaoke (same convention as chat). */
  reading?: string;
  romanization?: string;
  /** Thai meaning, used as the explanation after answering. */
  translation?: string;
  /** Choices for multiple_choice | fill_blank | listening. */
  options?: string[];
  /** 0-based index into options marking the correct choice. */
  answerIndex?: number;
  /** Korean ↔ Thai pairs for matching exercises (2–4 pairs). */
  pairs?: MatchingPair[];
}

export interface LessonConfig {
  topic: string;
  proficiencyLevel: ProficiencyLevel;
  wordContext: SavedWord[];
}

export interface LessonRequest {
  topic: string;
  proficiencyLevel: ProficiencyLevel;
  wordContext?: string[];
}

export interface LessonSuccessResponse {
  exercises: LessonExercise[];
}

/**
 * A persisted lesson the learner can replay. Stores the generated exercises
 * along with the config used to create them and the most recent result.
 */
export interface LessonRecord {
  id: string;
  topic: string;
  proficiencyLevel: ProficiencyLevel;
  wordContext: string[];
  exercises: LessonExercise[];
  createdAt: string;
  /** Score of the most recent completed run, or null if never finished. */
  lastScore: number | null;
  /** Total exercises (cached for display without recomputing). */
  total: number;
  /** Number of times this lesson has been completed. */
  timesCompleted: number;
}

export interface LessonErrorResponse {
  error: {
    type: ChatErrorType;
    message: string;
  };
}
