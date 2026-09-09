/**
 * Core type definitions for multi-language word records.
 *
 * Each supported target language has a specific word record interface
 * with fields appropriate for that language's writing system.
 */

/** The target language supported by the app (English only). */
export type TargetLanguage = 'english';

/** Common fields shared by all word records regardless of language. */
export interface BaseWordRecord {
  id: string;
  language: TargetLanguage;
  thaiTranslation: string;
  createdAt: number;
}

/** Word record for English. */
export interface EnglishWordRecord extends BaseWordRecord {
  language: 'english';
  word: string;
}

/** Word record type (English only). */
export type WordRecord = EnglishWordRecord;

/**
 * Input contract of the word-detail popup (`WordDetailPopup`).
 * Shared by `/words` and the inline `WordRenderer` (used in chat).
 */
export interface FeedWordRecord {
  id: string;
  language: TargetLanguage;
  generatedDate: string;
  thai: string;
  bookmarked: boolean;
  createdAt: number;
  partOfSpeech?: string;
  // English fields
  word?: string;
  nextReviewAt?: Date | string | null;
  interval?: number | null;
}
