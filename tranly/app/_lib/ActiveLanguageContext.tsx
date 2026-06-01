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
import type { TargetLanguage } from './wordTypes';

export interface ActiveLanguageContextValue {
  activeLanguage: TargetLanguage;
  setActiveLanguage: (lang: TargetLanguage) => void;
  /** Error message from the most recent language switch failure, cleared on next successful switch */
  switchError: string | null;
  /** Clear the switch error manually */
  clearSwitchError: () => void;
}

export const STORAGE_KEY = 'tarnly:active-language';
export const DEFAULT_LANGUAGE: TargetLanguage = 'korean';
export const SWITCH_TIMEOUT_MS = 500;

const VALID_LANGUAGES: readonly TargetLanguage[] = [
  'english',
  'japanese',
  'korean',
  'chinese',
];

function isValidLanguage(value: unknown): value is TargetLanguage {
  return typeof value === 'string' && VALID_LANGUAGES.includes(value as TargetLanguage);
}

export const ActiveLanguageContext = createContext<ActiveLanguageContextValue | null>(null);

export function ActiveLanguageProvider({ children }: { children: ReactNode }) {
  const [activeLanguage, setActiveLanguageState] = useState<TargetLanguage>(DEFAULT_LANGUAGE);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const previousLanguageRef = useRef<TargetLanguage>(DEFAULT_LANGUAGE);

  // Read persisted value from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isValidLanguage(stored)) {
      setActiveLanguageState(stored);
      previousLanguageRef.current = stored;
    }
  }, []);

  const clearSwitchError = useCallback(() => {
    setSwitchError(null);
  }, []);

  const setActiveLanguage = useCallback((lang: TargetLanguage) => {
    const prev = previousLanguageRef.current;
    // Clear any previous error
    setSwitchError(null);
    // Optimistically update
    setActiveLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang);
    previousLanguageRef.current = lang;

    // Validate the switch by attempting a quick IndexedDB probe with timeout
    const timeoutId = setTimeout(() => {
      // If we reach here, the data load took too long — rollback
      setActiveLanguageState(prev);
      localStorage.setItem(STORAGE_KEY, prev);
      previousLanguageRef.current = prev;
      setSwitchError('Language switch failed: data load timed out. Reverted to previous language.');
    }, SWITCH_TIMEOUT_MS);

    // Attempt to open the database and query the language index
    const probeSwitch = async () => {
      try {
        const { openDatabase, queryByLanguage } = await import('./db');
        const db = await openDatabase();
        // Probe the words store for the new language to validate connectivity
        await queryByLanguage(db, 'words', lang);
        // Success — clear the timeout
        clearTimeout(timeoutId);
      } catch {
        // IndexedDB query failed — rollback
        clearTimeout(timeoutId);
        setActiveLanguageState(prev);
        localStorage.setItem(STORAGE_KEY, prev);
        previousLanguageRef.current = prev;
        setSwitchError('Language switch failed: could not load data. Reverted to previous language.');
      }
    };

    probeSwitch();
  }, []);

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
