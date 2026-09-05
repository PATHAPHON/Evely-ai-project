/**
 * Safe wrapper around window.localStorage to protect against:
 * 1. SSR (window is undefined)
 * 2. SecurityError (e.g. cookies/storage blocked in iframe or private mode)
 * 3. QuotaExceededError (localStorage quota exhausted)
 */
export const safeLocalStorage = {
  getItem(key: string): string | null {
    if (typeof window === 'undefined') return null;
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },

  setItem(key: string, value: string): boolean {
    if (typeof window === 'undefined') return false;
    try {
      window.localStorage.setItem(key, value);
      return true;
    } catch (err) {
      console.warn(`safeLocalStorage: failed to set item for key "${key}":`, err);
      return false;
    }
  },

  removeItem(key: string): boolean {
    if (typeof window === 'undefined') return false;
    try {
      window.localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  },
};
