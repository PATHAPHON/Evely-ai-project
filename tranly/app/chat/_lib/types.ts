export type ProficiencyLevel = 'beginner' | 'intermediate' | 'advanced';

export type SpeechLang = 'ko-KR' | 'th-TH' | 'en-US';

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

export interface ConversationMessageRecord {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  korean: string;
  reading: string;
  romanization: string;
  translation: string;
  english: string;
  rawText: string;
  timestamp: string;
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
}

export interface SessionConfig {
  topic: string;
  proficiencyLevel: ProficiencyLevel;
  wordContext: SavedWord[];
  /** Optional goal/objective; when set, the AI ends the chat once it's reached. */
  goal: string;
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
}

export interface ChatErrorResponse {
  error: {
    type: ChatErrorType;
    message: string;
  };
}
