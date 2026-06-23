'use client';

import { useState, useEffect, useCallback } from 'react';
import { useActiveLanguage } from '../_lib/contexts/ActiveLanguageContext';
import type { TargetLanguage } from '../_lib/types/wordTypes';

interface LanguageOption {
  value: TargetLanguage;
  label: string;
  icon: string;
  nativeName: string;
}

const LANGUAGE_OPTIONS: LanguageOption[] = [
  { value: 'english', label: 'English', icon: '🇺🇸', nativeName: 'English' },
];

export default function GlobalLanguageSelector() {
  const { activeLanguage, setActiveLanguage, switchError, clearSwitchError } =
    useActiveLanguage();
  const [toast, setToast] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(timer);
  }, [toast]);

  // Show error toast when switchError changes
  useEffect(() => {
    if (!switchError) return;
    // Surface error prop as an auto-dismissing toast
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setErrorToast(switchError);
    setToast(null); // Clear success toast if showing
    const timer = setTimeout(() => {
      setErrorToast(null);
      clearSwitchError();
    }, 3000);
    return () => clearTimeout(timer);
  }, [switchError, clearSwitchError]);

  const handleSelect = useCallback(
    (lang: TargetLanguage) => {
      if (lang === activeLanguage) return;
      setActiveLanguage(lang);
      const selected = LANGUAGE_OPTIONS.find((o) => o.value === lang);
      setToast(`Switched to ${selected?.nativeName ?? lang}`);
    },
    [activeLanguage, setActiveLanguage],
  );

  return (
    <div className="relative">
      <div
        className="flex gap-2"
        role="radiogroup"
        aria-label="Select target language"
      >
        {LANGUAGE_OPTIONS.map((option) => {
          const isActive = option.value === activeLanguage;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={isActive}
              aria-label={option.nativeName}
              onClick={() => handleSelect(option.value)}
              className={`
                flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl
                border-2 transition-all duration-150 cursor-pointer
                ${
                  isActive
                    ? 'border-accent-blue bg-accent-blue/10 shadow-nb-sm'
                    : 'border-border-color/30 bg-card-bg hover:border-border-color/60'
                }
              `}
            >
              <span className="text-xl leading-none" aria-hidden="true">
                {option.icon}
              </span>
              <span
                className={`text-xs font-semibold ${
                  isActive ? 'text-accent-blue' : 'text-text-secondary'
                }`}
              >
                {option.nativeName}
              </span>
            </button>
          );
        })}
      </div>

      {/* Confirmation toast */}
      {toast && !errorToast && (
        <div
          role="status"
          aria-live="polite"
          className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-4 py-2
            bg-card-bg border-2 border-border-color rounded-lg shadow-nb-sm
            text-sm font-semibold text-text-primary whitespace-nowrap z-50
            animate-[fadeIn_0.15s_ease-out]"
        >
          {toast}
        </div>
      )}

      {/* Error toast */}
      {errorToast && (
        <div
          role="alert"
          aria-live="assertive"
          className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-4 py-2
            bg-red-50 border-2 border-red-400 rounded-lg shadow-nb-sm
            text-sm font-semibold text-red-700 whitespace-nowrap z-50
            animate-[fadeIn_0.15s_ease-out] dark:bg-red-900/30 dark:text-red-300 dark:border-red-600"
        >
          {errorToast}
        </div>
      )}
    </div>
  );
}
