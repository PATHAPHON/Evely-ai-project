'use client';

import { useLanguagePreference, type TranslationLanguage } from '@/app/_lib/useLanguagePreference';

const LANGUAGE_OPTIONS: { value: TranslationLanguage; label: string; description: string }[] = [
  { value: 'thai', label: 'Thai', description: 'Show Thai translation & pronunciation' },
  { value: 'english', label: 'English', description: 'Show English translation only' },
];

export default function LanguageSelector() {
  const { language, setLanguage } = useLanguagePreference();

  return (
    <div className="rounded-2xl border-3 border-border-color bg-card-bg p-4 shadow-[4px_4px_0_#000000] dark:shadow-[4px_4px_0_rgba(0,0,0,0.4)]">
      <p className="text-sm font-semibold text-text-primary mb-3">Translation Language</p>
      <div className="flex flex-col gap-2">
        {LANGUAGE_OPTIONS.map((option) => {
          const isActive = language === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setLanguage(option.value)}
              className={`w-full rounded-xl border-3 border-border-color px-4 py-3 text-left transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#52C41A] text-white shadow-[2px_2px_0_#000000] dark:shadow-[2px_2px_0_rgba(0,0,0,0.4)] translate-x-[2px] translate-y-[2px]'
                  : 'bg-card-bg text-text-primary shadow-[4px_4px_0_#000000] dark:shadow-[4px_4px_0_rgba(0,0,0,0.4)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_#000000] dark:active:shadow-[2px_2px_0_rgba(0,0,0,0.4)]'
              }`}
            >
              <span className="font-bold">{option.label}</span>
              <span className={`ml-2 text-sm ${isActive ? 'text-white/80' : 'text-text-secondary'}`}>
                — {option.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
