'use client';

import { useCallback, useEffect, useState } from 'react';

export type TranslationLanguage = 'thai' | 'english';

const STORAGE_KEY = 'tarnly:translation-language';

export function useLanguagePreference() {
  const [language, setLanguageState] = useState<TranslationLanguage>('thai');

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'thai' || stored === 'english') {
      setLanguageState(stored);
    }
  }, []);

  const setLanguage = useCallback((lang: TranslationLanguage) => {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang);
  }, []);

  return { language, setLanguage };
}
