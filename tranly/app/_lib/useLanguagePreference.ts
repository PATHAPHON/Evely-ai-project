'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/app/_lib/supabaseClient';

export type TranslationLanguage = 'thai' | 'english';

const STORAGE_KEY = 'tarnly:translation-language';

export function useLanguagePreference() {
  const [language, setLanguageState] = useState<TranslationLanguage>('thai');
  const [userId, setUserId] = useState<string | null>(null);

  // Load from local storage and get user ID on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'thai' || stored === 'english') {
      setLanguageState(stored);
    }

    let active = true;
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (active && session?.user?.id) {
        setUserId(session.user.id);
      }
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (active) {
        setUserId(session?.user?.id || null);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const setLanguage = useCallback((lang: TranslationLanguage) => {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang);

    if (userId) {
      supabase
        .from('profiles')
        .update({ ui_language: lang === 'thai' ? 'th' : 'en' })
        .eq('id', userId)
        .then(
          ({ error }) => {
            if (error) console.error('Failed to sync translation language to database:', error);
          },
          (err) => {
            console.error('Failed to sync translation language to database:', err);
          }
        );
    }
  }, [userId]);

  return { language, setLanguage };
}
