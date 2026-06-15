import type { TargetLanguage } from '@/app/_lib/wordTypes';

export type ProficiencyLevel = 'beginner' | 'intermediate' | 'advanced';

export type SpeechLang = 'en-US' 

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
  /** A reply the user could send next, in the target language. */
  englishText: string;
  /** Thai meaning of the suggested reply, so the learner understands it. */
  translation: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  englishText: string;
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
    englishText: string;
    reading: string;
    romanization: string;
    translation: string;
    english: string;
    /** English meaning split into clickable phrase chunks (joined = english). */
    englishPhrases?: string[];
  }>;
  type?: 'text';
  /** Grammar correctness and correction explanation */
  grammarCorrect?: boolean;
  grammarNotes?: string;
  /** Transient: true while waiting for /api/translate response; never persisted. */
  isTranslating?: boolean;
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
  englishText: string;
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
  englishText: string;
  reading: string;
  romanization: string;
  translation: string;
  english: string;
  /** 2–3 suggested replies the user could send next. */
  suggestions?: ReplySuggestion[];
  /** True when the AI has concluded the conversation (goal reached). */
  ended?: boolean;
  sentences?: Array<{
    englishText: string;
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
