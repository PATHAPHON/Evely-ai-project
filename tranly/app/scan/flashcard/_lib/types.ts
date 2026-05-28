import type { AIErrorType } from './constants';

/**
 * Request body for the POST /api/identify endpoint.
 */
export interface IdentifyRequest {
  /** Base64-encoded image data (without data URI prefix). */
  image: string;
}

/**
 * Successful response from the /api/identify endpoint.
 */
export interface IdentifySuccessResponse {
  /** Object name in Thai (kept for backwards compatibility). */
  label: string;
  /** Korean word (Hangul). */
  korean: string;
  /** Korean reading written in Thai script (e.g. "ซากวา"). */
  reading: string;
  /** Korean pronunciation written in English/Roman script (e.g. "sagwa"). */
  romanization: string;
  /** English word. */
  english: string;
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
