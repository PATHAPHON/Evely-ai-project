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
  imageBlob: Blob | null;
  imageUrl?: string | null;
  thaiTranslation: string;
  createdAt: number;
}

/** Word record for English: includes the word and IPA phonetic transcription. */
export interface EnglishWordRecord extends BaseWordRecord {
  language: 'english';
  word: string;
  ipa: string;
}

/** Word record type (English only). */
export type WordRecord = EnglishWordRecord;
