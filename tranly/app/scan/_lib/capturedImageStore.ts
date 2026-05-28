/**
 * Simple module-level store for sharing a captured image Blob
 * between the /scan and /scan/preview pages.
 *
 * Blobs cannot be stored in sessionStorage directly, so we use
 * a module-level variable that persists across client-side navigations.
 */

let capturedBlob: Blob | null = null;

/**
 * Store a captured image Blob for the preview page to consume.
 */
export function setCapturedImage(blob: Blob): void {
  capturedBlob = blob;
}

/**
 * Retrieve the captured image Blob. Returns null if no image has been captured.
 */
export function getCapturedImage(): Blob | null {
  return capturedBlob;
}

/**
 * Clear the stored captured image (e.g., after confirming or retaking).
 */
export function clearCapturedImage(): void {
  capturedBlob = null;
}
