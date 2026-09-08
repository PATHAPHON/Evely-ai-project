'use client';

import { useCallback, useEffect, useState } from 'react';
import { safeLocalStorage } from '@/shared/utils/safeStorage';

export type Theme = 'light' | 'dark';

export const STORAGE_KEY = 'tarnly:theme';
const DEFAULT_THEME: Theme = 'light';

function getStoredTheme(): Theme {
  const stored = safeLocalStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return DEFAULT_THEME;
}

function applyThemeClass(theme: Theme) {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(DEFAULT_THEME);

  useEffect(() => {
    // Hydrate theme from localStorage after mount to avoid SSR mismatch
    const stored = getStoredTheme();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setThemeState(stored);
    applyThemeClass(stored);
  }, []);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    safeLocalStorage.setItem(STORAGE_KEY, newTheme);
    applyThemeClass(newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next: Theme = prev === 'light' ? 'dark' : 'light';
      safeLocalStorage.setItem(STORAGE_KEY, next);
      applyThemeClass(next);
      return next;
    });
  }, []);

  return { theme, toggleTheme, setTheme };
}
