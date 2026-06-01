import type { LessonConfig } from '@/app/chat/_lib/lessonTypes';

/**
 * Hand-off store for a lesson configured by the AI guide on `/chat` and played
 * on the separate `/lesson/play` route. The config (which includes the chosen
 * word context) is kept in sessionStorage rather than the URL so it survives a
 * client navigation without bloating the address bar.
 */
const PENDING_LESSON_KEY = 'tarnly:pending-lesson';

export function setPendingLesson(config: LessonConfig): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(PENDING_LESSON_KEY, JSON.stringify(config));
  } catch {
    // Storage unavailable (private mode / quota) — the play route falls back to
    // its "no lesson" screen.
  }
}

/**
 * Read and clear the pending lesson. Returns null if none is queued (e.g. the
 * play route was opened or refreshed directly).
 */
export function takePendingLesson(): LessonConfig | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(PENDING_LESSON_KEY);
    if (!raw) return null;
    window.sessionStorage.removeItem(PENDING_LESSON_KEY);
    return JSON.parse(raw) as LessonConfig;
  } catch {
    return null;
  }
}
