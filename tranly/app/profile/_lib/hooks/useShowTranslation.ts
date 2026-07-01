'use client';

import { useCallback, useEffect, useState } from 'react';

export const STORAGE_KEY = 'tranly:show-translation';

/** Current show-translation preference (defaults to true). Safe during SSR. */
export function readShowTranslation(): boolean {
  return typeof localStorage === 'undefined' || localStorage.getItem(STORAGE_KEY) !== 'false';
}

export function useShowTranslation() {
  const [showTranslation, setShowTranslation] = useState(readShowTranslation);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setShowTranslation(e.newValue !== 'false');
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const toggleShowTranslation = useCallback(() => {
    setShowTranslation((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: String(next) }));
      return next;
    });
  }, []);

  return { showTranslation, toggleShowTranslation };
}
