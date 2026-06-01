import type { AIErrorType } from './constants';
import type { TargetLanguage } from '@/app/_lib/wordTypes';

/**
 * Request body for the POST /api/identify endpoint.
 */
export interface IdentifyRequest {
  /** Base64-encoded image data (without data URI prefix). */
  image: string;
  /** Target language for identification. Defaults to 'korean' if not provided. */
  language?: TargetLanguage;
}

/**
 * Successful response from the /api/identify endpoint.
 *
 * The response includes language-appropriate fields based on the requested language.
 * Fields for other languages will be absent. The `label` field is always present
 * as a primary display name (Thai word or fallback).
 *
 * Korean: korean, reading, romanization, english
 * Japanese: kanji, hiragana, romaji, english
 * Chinese: hanzi, pinyin, english
 * English: word, ipa, thai
 */
export interface IdentifySuccessResponse {
  /** Primary display label (Thai word or fallback). Always present. */
  label: string;
  // Korean fields
  /** Korean word (Hangul). Present when language is 'korean'. */
  korean?: string;
  /** Korean reading written in Thai script (e.g. "ซากวา"). Present when language is 'korean'. */
  reading?: string;
  /** Korean pronunciation in Revised Romanization (e.g. "sagwa"). Present when language is 'korean'. */
  romanization?: string;
  // Japanese fields
  /** Japanese word in Kanji. Present when language is 'japanese'. */
  kanji?: string;
  /** Hiragana reading. Present when language is 'japanese'. */
  hiragana?: string;
  /** Romaji pronunciation. Present when language is 'japanese'. */
  romaji?: string;
  // Chinese fields
  /** Chinese word in Hanzi. Present when language is 'chinese'. */
  hanzi?: string;
  /** Pinyin with tone marks or tone numbers. Present when language is 'chinese'. */
  pinyin?: string;
  // English fields
  /** English word. Present when language is 'english' or as supplementary for other languages. */
  word?: string;
  /** IPA phonetic transcription. Present when language is 'english'. */
  ipa?: string;
  // Shared fields
  /** English translation. Present for Korean, Japanese, and Chinese. */
  english?: string;
  /** Thai translation. Present in the response. */
  thai?: string;
}

/**
 * Error response from the /api/identify endpoint.
 */
export interface IdentifyErrorResponse {
  error: {
    /** Category of the error. */
    type: AIErrorType;
    /** User-facing message in Thai. */
    message: string;
  };
}

/**
 * A flashcard record stored in IndexedDB.
 */
export interface FlashcardRecord {
  /** Unique identifier generated via crypto.randomUUID(). */
  id: string;
  /** Original captured image blob. */
  imageBlob: Blob;
  /** AI-identified object name in Thai. */
  label: string;
  /** Unix timestamp (Date.now()) when the flashcard was created. */
  createdAt: number;
}
