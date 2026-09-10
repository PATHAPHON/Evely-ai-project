import type { TargetLanguage } from '@/shared/types/wordTypes';

export type SpeechLang = 'en-US' 

export type ChatErrorType =
  | 'invalid_input'
  | 'api_error'
  | 'rate_limit'
  | 'upstream_busy'
  | 'timeout'
  | 'network_error';

export interface ConversationSessionRecord {
  id: string;
  topic: string;
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
  translation: string;
  english: string;
  rawText: string;
  timestamp: string;
  status: 'sent' | 'pending' | 'error';
  /** Suggested replies the user can tap (assistant messages only). */
  suggestions?: ReplySuggestion[];
  sentences?: Array<{
    englishText: string;
    translation: string;
    english: string;
    emotion?: string;
  }>;
  /** Pre-compiled text with audio emotion tags for TTS playback. */
  ttsText?: string;
  type?: 'text';
  /** Grammar correctness and correction explanation */
  grammarCorrect?: boolean;
  grammarNotes?: string;
  originalText?: string;
  correctedText?: string;
  grammarError?: string;
  /** True when suggestions are locked (free tier). */
  suggestionsLocked?: boolean;
  /** Transient: true while waiting for /api/translate response; never persisted. */
  isTranslating?: boolean;
}

export interface SessionConfig {
  /** Learning language the AI should converse in. */
  language: TargetLanguage;
}

export interface SavedWord {
  id: string;
  englishText: string;
  english: string;
  thai: string;
  source: 'word-store' | 'feed-words';
}

export interface ChatRequest {
  messages: ChatMessagePayload[];
  /** Learning language the AI should converse in (defaults to English). */
  language?: TargetLanguage;
}

export interface ChatMessagePayload {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatSuccessResponse {
  englishText: string;
  translation: string;
  english: string;
  /** 2–3 suggested replies the user could send next. */
  suggestions?: ReplySuggestion[];
  /** True when suggestions are premium-only and this user is on free tier. */
  suggestionsLocked?: boolean;
  sentences?: Array<{
    englishText: string;
    translation: string;
    english: string;
    emotion?: string;
  }>;
  /** Optional pre-compiled TTS text with audio emotion tags */
  ttsText?: string;
  grammarCorrect?: boolean;
  grammarNotes?: string;
  originalText?: string;
  correctedText?: string;
  grammarError?: string;
  fallback?: boolean;
}

export interface ChatErrorResponse {
  error: {
    type: ChatErrorType;
    message: string;
  };
}
