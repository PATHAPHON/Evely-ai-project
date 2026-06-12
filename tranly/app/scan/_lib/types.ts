/**
 * Camera error types representing different failure scenarios.
 */
export type CameraError = {
  type:
    | 'permission_denied'
    | 'not_found'
    | 'stream_interrupted'
    | 'capture_failed';
  message: string;
};

/**
 * Represents a captured image stored in IndexedDB.
 */
export interface CapturedImage {
  id: string;
  blob: Blob;
  createdAt: number;
}

/**
 * State for the Camera View page (/scan).
 */
export interface CameraPageState {
  stream: MediaStream | null;
  isCapturing: boolean;
  error: CameraError | null;
}

/**
 * State for the Photo Preview page (/scan/preview).
 */
export interface PreviewPageState {
  imageBlob: Blob | null;
  isSaving: boolean;
  error: string | null;
}

import type { AIErrorType } from './constants';
import type { TargetLanguage } from '@/app/_lib/wordTypes';

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

