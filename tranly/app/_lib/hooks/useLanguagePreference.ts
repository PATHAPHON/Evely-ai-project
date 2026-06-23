'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/app/_lib/supabase/supabaseClient';

export type TranslationLanguage = 'thai' | 'english';

const STORAGE_KEY = 'tarnly:translation-language';

export function useLanguagePreference() {
  const [language, setLanguageState] = useState<TranslationLanguage>('thai');
  const [userId, setUserId] = useState<string | null>(null);

  // Load from local storage and get user ID on mount
  useEffect(() => {
    // Hydrate from localStorage after mount to avoid SSR hydration mismatch
    const stored = localStorage.getItem(STORAGE_KEY);
    // (default state is already 'thai', so only override when a valid value is stored)
    if (stored === 'thai' || stored === 'english') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
