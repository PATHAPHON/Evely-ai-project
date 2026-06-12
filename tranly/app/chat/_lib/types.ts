import type { TargetLanguage } from '@/app/_lib/wordTypes';
import type { ExamQuestion } from '@/app/exam/_lib/types';

export type ProficiencyLevel = 'beginner' | 'intermediate' | 'advanced';

export type SpeechLang = 'ko-KR' | 'th-TH' | 'en-US' | 'ja-JP' | 'zh-CN';

export type ChatErrorType =
  | 'invalid_input'
  | 'api_error'
  | 'rate_limit'
  | 'timeout'
  | 'network_error';

export interface ConversationSessionRecord {
  id: string;
  topic: string;
  proficiencyLevel: ProficiencyLevel;
  wordContext: string[];
  /** Optional goal/objective the conversation works toward (empty = open-ended). */
  goal: string;
  createdAt: string;
  endedAt: string | null;
  completed: boolean;
}


export interface ReplySuggestion {
  /** A reply the user could send next, in Korean (Hangul). */
  korean: string;
  /** Thai meaning of the suggested reply, so the learner understands it. */
  translation: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  korean: string;
  reading: string;
  romanization: string;
  translation: string;
  english: string;
  rawText: string;
  timestamp: string;
  status: 'sent' | 'pending' | 'error';
  /** Suggested replies the user can tap (assistant messages only). */
  suggestions?: ReplySuggestion[];
  /** True when this assistant message concludes the conversation (goal reached). */
  ended?: boolean;
  sentences?: Array<{
    korean: string;
    reading: string;
    romanization: string;
    translation: string;
    english: string;
    /** English meaning split into clickable phrase chunks (joined = english). */
    englishPhrases?: string[];
  }>;
  type?: 'text' | 'exam' | 'exam-link';
  examQuestions?: ExamQuestion[];
  examCategory?: 'cefr' | 'toeic';
  examLevel?: string;
  examResult?: { score: number; total: number };
  /** For `exam-link` cards: the saved exam_sets row to play at /exam?examId=... */
  examId?: string;
  /** For `exam-link` cards: the topic the user requested (display only). */
  examTopic?: string;
  /** For `exam-link` cards: number of questions in the set (display only). */
  examCount?: number;
  /** Grammar correctness and correction explanation */
  grammarCorrect?: boolean;
  grammarNotes?: string;
}

export interface SessionConfig {
  topic: string;
  proficiencyLevel: ProficiencyLevel;
  wordContext: SavedWord[];
  /** Optional goal/objective; when set, the AI ends the chat once it's reached. */
  goal: string;
  /** Learning language the AI should converse in. */
  language: TargetLanguage;
  /** Optional lesson ID for script-based sessions */
  lessonId?: string;
}

export interface SavedWord {
  id: string;
  korean: string;
  reading: string;
  romanization: string;
  english: string;
  thai: string;
  source: 'word-store' | 'feed-words';
}

export interface ChatRequest {
  messages: ChatMessagePayload[];
  proficiencyLevel: ProficiencyLevel;
  topic: string;
  wordContext?: string[];
  goal?: string;
  /** Learning language the AI should converse in (defaults to Korean). */
  language?: TargetLanguage;
}

export interface ChatMessagePayload {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatSuccessResponse {
  korean: string;
  reading: string;
  romanization: string;
  translation: string;
  english: string;
  /** 2–3 suggested replies the user could send next. */
  suggestions?: ReplySuggestion[];
  /** True when the AI has concluded the conversation (goal reached). */
  ended?: boolean;
  sentences?: Array<{
    korean: string;
    reading: string;
    romanization: string;
    translation: string;
    english: string;
    /** English meaning split into clickable phrase chunks (joined = english). */
    englishPhrases?: string[];
  }>;
  grammarCorrect?: boolean;
  grammarNotes?: string;
}

export interface ChatErrorResponse {
  error: {
    type: ChatErrorType;
    message: string;
  };
}
