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
