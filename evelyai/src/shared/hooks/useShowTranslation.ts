'use client';

import { useCallback, useEffect, useState } from 'react';

export const STORAGE_KEY = 'evelyai:show-translation';
export const LEGACY_STORAGE_KEY = 'tranly:show-translation';

/** Current show-translation preference (defaults to true). Safe during SSR. */
export function readShowTranslation(): boolean {
  if (typeof localStorage === 'undefined') return true;
  const current = localStorage.getItem(STORAGE_KEY);
  if (current !== null) return current !== 'false';
  const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
  if (legacy !== null) {
    localStorage.setItem(STORAGE_KEY, legacy);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    return legacy !== 'false';
  }
  return true;
}

export function useShowTranslation() {
  const [showTranslation, setShowTranslation] = useState(readShowTranslation);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY || e.key === LEGACY_STORAGE_KEY) {
        setShowTranslation(e.newValue !== 'false');
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const toggleShowTranslation = useCallback(() => {
    setShowTranslation((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: String(next) }));
      return next;
    });
  }, []);

  return { showTranslation, toggleShowTranslation };
}
