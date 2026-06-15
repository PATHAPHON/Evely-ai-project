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

/**
 * Record handed off to the `/word-detail` page via sessionStorage.
 *
 * This is the input contract of the word-detail view. It is shared by
 * `/words`, the inline `WordRenderer` (used in chat), and the word-detail
 * page itself.
 */
export interface FeedWordRecord {
  id: string;
  language: TargetLanguage;
  generatedDate: string;
  thai: string;
  bookmarked: boolean;
  imageBlob: Blob | null;
  imageUrl?: string | null;
  imageUrls?: string[];
  createdAt: number;
  partOfSpeech?: string;
  // English fields
  word?: string;
  ipa?: string;
}

/** sessionStorage key used to hand a word off to the `/word-detail` page. */
export const DETAIL_WORD_STORAGE_KEY = "tarnly:detail-word";
