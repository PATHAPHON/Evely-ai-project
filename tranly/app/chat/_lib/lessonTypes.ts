import type { TargetLanguage } from '@/app/_lib/wordTypes';
import type { ChatErrorType, SavedWord } from './types';

export type ExerciseType =
  | 'multiple_choice'
  | 'fill_blank'
  | 'matching'
  | 'listening';

export interface MatchingPair {
  englishText: string;
  thai: string;
  /** Pronunciation shown above the target-language word. */
  reading?: string;
}

export interface LessonExercise {
  id: string;
  type: ExerciseType;
  /** Instruction or question shown to the learner (Thai or English). */
  prompt: string;
  /** Target English text — listening TTS source, fill-blank sentence, or display word. */
  englishText?: string;
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
  wordContext: SavedWord[];
  /** Learning language the lesson should be generated in. */
  language: TargetLanguage;
}

export interface LessonRequest {
  topic: string;
  wordContext?: string[];
  /** Learning language the lesson should be generated in (defaults to Korean). */
  language?: TargetLanguage;
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
