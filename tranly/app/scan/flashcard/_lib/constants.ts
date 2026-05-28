/**
 * Maximum number of consecutive retry attempts for object identification.
 */
export const MAX_RETRY_COUNT = 3;

/**
 * Timeout in milliseconds for the DeepSeek API request.
 */
export const API_TIMEOUT_MS = 30_000;

/**
 * Maximum allowed image size in bytes (20MB).
 */
export const MAX_IMAGE_SIZE_BYTES = 20 * 1024 * 1024;

/**
 * Duration in milliseconds for the flashcard reveal animation.
 */
export const ANIMATION_DURATION_MS = 500;

/**
 * Error type identifiers for AI identification failures.
 */
export type AIErrorType =
  | 'api_error'
  | 'timeout'
  | 'rate_limit'
  | 'network_error'
  | 'invalid_input'
  | 'too_large';

/**
 * User-facing error messages in Thai, keyed by error type.
 */
export const ERROR_MESSAGES: Record<AIErrorType, string> = {
  api_error: 'Could not identify object. Please try again.',
  timeout: 'Connection timed out. Please try again.',
  rate_limit: 'Too many requests. Please try again later.',
  network_error: 'Network error. Please check your connection.',
  invalid_input: 'Invalid image. Please retake the photo.',
  too_large: 'Image is too large. Please retake the photo.',
};
