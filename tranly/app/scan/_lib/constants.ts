/**
 * Default camera constraints preferring the rear-facing camera
 * with at least 720p resolution for legible text recognition.
 */
export const DEFAULT_CONSTRAINTS: MediaStreamConstraints = {
  video: {
    facingMode: { ideal: 'environment' },
    width: { ideal: 1280 },
    height: { ideal: 720 },
  },
  audio: false,
};

/**
 * Fallback constraints without facingMode for devices where
 * the rear camera is unavailable or the constraint is unsupported.
 */
export const FALLBACK_CONSTRAINTS: MediaStreamConstraints = {
  video: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
  },
  audio: false,
};

/**
 * IndexedDB configuration for storing captured images.
 */
export const INDEXED_DB_CONFIG = {
  dbName: 'tarnly-images',
  storeName: 'captures',
  keyPath: 'id',
  indexes: {
    createdAt: 'createdAt',
  },
} as const;
