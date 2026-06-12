import type { FeedWordRecord } from "./types";

/**
 * Render the word's native script onto a canvas and return a JPEG Blob — used as
 * a placeholder image when a feed word is bookmarked into the Word page,
 * since feed words don't have an associated photo.
 */
export async function generateWordPlaceholderBlob(text: string): Promise<Blob | null> {
  if (typeof document === "undefined") return null;
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#FFF0F6";
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = "#000000";
  ctx.font = "bold 96px 'Apple SD Gothic Neo', 'Noto Sans KR', 'Noto Sans JP', 'Noto Sans SC', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, size / 2, size / 2 + 8);

  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.9);
  });
}

/**
 * Gets the primary display word from a FeedWordRecord.
 */
export function getPrimaryWord(word: FeedWordRecord): string {
  return word.word || '';
}

export function getTodayDateKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Fisher-Yates shuffle returning a new array. */
export function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** State of the current card's drag/exit animation. */
export interface CardTransformState {
  isDragging: boolean;
  exiting: boolean;
  exitingDirection: 'left' | 'right' | null;
  dragX: number;
  dragY: number;
}

/** Compute the CSS transform string for the current card based on drag/exit state. */
export function computeCardTransform({
  isDragging,
  exiting,
  exitingDirection,
  dragX,
  dragY,
}: CardTransformState): string {
  if (isDragging) {
    return `translate(${dragX}px, ${dragY}px) rotate(${dragX * 0.04}deg) scale(0.98)`;
  }
  if (exiting) {
    if (exitingDirection === 'right') {
      return `translate(600px, ${dragY}px) rotate(20deg) scale(0.95)`;
    }
    if (exitingDirection === 'left') {
      return `translate(-600px, ${dragY}px) rotate(-20deg) scale(0.95)`;
    }
    return `translate(0px, 0px) rotate(0deg) scale(1)`;
  }
  return `translate(${dragX}px, ${dragY}px) rotate(${dragX * 0.04}deg) scale(1)`;
}
