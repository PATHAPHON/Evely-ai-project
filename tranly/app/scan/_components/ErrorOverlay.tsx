"use client";

import { CameraError } from "../_lib/types";

/**
 * Maps CameraError types to Thai user-facing messages.
 */
const ERROR_MESSAGES: Record<CameraError["type"], string> = {
  permission_denied: "Please allow camera access in your device settings.",
  not_found: "No camera found on this device.",
  stream_interrupted: "Camera connection lost.",
  capture_failed: "Capture failed. Please try again.",
};

/**
 * Error types that allow retrying the camera stream.
 */
const RETRYABLE_ERRORS: CameraError["type"][] = [
  "stream_interrupted",
  "capture_failed",
];

interface ErrorOverlayProps {
  error: CameraError;
  onRetry: () => void;
  onDismiss: () => void;
}

/**
 * Full-screen overlay displaying contextual Thai error messages
 * with retry or dismiss actions based on the error type.
 *
 * Requirements: 1.3, 2.5, 5.4
 */
export default function ErrorOverlay({
  error,
  onRetry,
  onDismiss,
}: ErrorOverlayProps) {
  const message = ERROR_MESSAGES[error.type];
  const isRetryable = RETRYABLE_ERRORS.includes(error.type);

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 px-6"
      role="alert"
      aria-live="assertive"
    >
      <div className="w-full max-w-sm rounded-xl border-3 border-black bg-white p-6 shadow-nb-lg dark:border-border-color dark:bg-card-bg">
        <p className="mb-6 text-center text-lg font-semibold text-black dark:text-text-primary">
          {message}
        </p>

        {isRetryable ? (
          <button
            type="button"
            onClick={onRetry}
            className="w-full rounded-lg border-3 border-black bg-accent-green px-4 py-3 text-base font-bold text-white shadow-nb-md transition-all duration-100 active:translate-y-[2px] active:shadow-nb-sm dark:border-border-color cursor-pointer"
          >
            Try again
          </button>
        ) : (
          <button
            type="button"
            onClick={onDismiss}
            className="w-full rounded-lg border-3 border-black bg-accent-red px-4 py-3 text-base font-bold text-white shadow-nb-md transition-all duration-100 active:translate-y-[2px] active:shadow-nb-sm dark:border-border-color cursor-pointer"
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}
