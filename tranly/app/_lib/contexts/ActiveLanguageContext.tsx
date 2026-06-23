'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { supabase } from '@/app/_lib/supabase/supabaseClient';
import type { TargetLanguage } from '../types/wordTypes';

export interface ActiveLanguageContextValue {
  activeLanguage: TargetLanguage;
  setActiveLanguage: (lang: TargetLanguage) => void;
  /** Error message from the most recent language switch failure, cleared on next successful switch */
  switchError: string | null;
  /** Clear the switch error manually */
  clearSwitchError: () => void;
}

export const STORAGE_KEY = 'tranly:active-language';
export const LEGACY_STORAGE_KEY = 'tarnly:active-language';
export const DEFAULT_LANGUAGE: TargetLanguage = 'english';

const VALID_LANGUAGES: readonly TargetLanguage[] = [
  'english',
];

function isValidLanguage(value: unknown): value is TargetLanguage {
  return typeof value === 'string' && VALID_LANGUAGES.includes(value as TargetLanguage);
}

function getStoredLanguage(): string | null {
  if (typeof window === 'undefined') return null;
  const primary = localStorage.getItem(STORAGE_KEY);
  if (primary !== null) return primary;
  const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
  if (legacy !== null) {
    localStorage.setItem(STORAGE_KEY, legacy);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    return legacy;
  }
  return null;
}

function setStoredLanguage(value: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, value);
  localStorage.removeItem(LEGACY_STORAGE_KEY);
}

export const ActiveLanguageContext = createContext<ActiveLanguageContextValue | null>(null);

export function ActiveLanguageProvider({ children }: { children: ReactNode }) {
  const [activeLanguage, setActiveLanguageState] = useState<TargetLanguage>(DEFAULT_LANGUAGE);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const previousLanguageRef = useRef<TargetLanguage>(DEFAULT_LANGUAGE);

  // Read persisted value from localStorage and get user ID on mount
  useEffect(() => {
    const stored = getStoredLanguage();
    if (isValidLanguage(stored)) {
      setActiveLanguageState(stored);
      previousLanguageRef.current = stored;
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

  const clearSwitchError = useCallback(() => {
    setSwitchError(null);
  }, []);

  const setActiveLanguage = useCallback((lang: TargetLanguage) => {
    if (!isValidLanguage(lang)) return;
    const prev = previousLanguageRef.current;
    if (prev === lang) return;

    // Clear any previous error
    setSwitchError(null);
    // Optimistically update
    setActiveLanguageState(lang);
    setStoredLanguage(lang);
    previousLanguageRef.current = lang;

    // Attempt to query database and update target_language in profiles
    const probeSwitch = async () => {
      try {
        if (userId) {
          // Sync language to profiles table
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ target_language: lang })
            .eq('id', userId);

          if (updateError) throw updateError;
        }

        // Probe connectivity by doing a simple select check
        const { error: probeError } = await supabase
          .from('words')
          .select('id')
          .limit(1);

        if (probeError) throw probeError;
      } catch {
        // Rollback on actual failure
        setActiveLanguageState(prev);
        setStoredLanguage(prev);
        previousLanguageRef.current = prev;
        setSwitchError('Language switch failed: database update failed. Reverted to previous language.');
      }
    };

    probeSwitch();
  }, [userId]);

  return (
    <ActiveLanguageContext.Provider
      value={{ activeLanguage, setActiveLanguage, switchError, clearSwitchError }}
    >
      {children}
    </ActiveLanguageContext.Provider>
  );
}

export function useActiveLanguage(): ActiveLanguageContextValue {
  const context = useContext(ActiveLanguageContext);
  if (!context) {
    throw new Error('useActiveLanguage must be used within an ActiveLanguageProvider');
  }
  return context;
}
