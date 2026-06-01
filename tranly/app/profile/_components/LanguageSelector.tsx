'use client';

import { useLanguagePreference, type TranslationLanguage } from '@/app/_lib/useLanguagePreference';
import { useStrings } from '@/app/_lib/strings';

const LANGUAGE_OPTIONS: { value: TranslationLanguage; label: string; description: string }[] = [
  { value: 'thai', label: 'Thai', description: 'Show Thai translation & pronunciation' },
  { value: 'english', label: 'English', description: 'Show English translation only' },
];

export default function LanguageSelector() {
  const { language, setLanguage } = useLanguagePreference();
  const t = useStrings();

  return (
    <div className="w-full">
      <p className="text-sm font-semibold text-text-primary mb-3">
        {t.profile.translationLanguage}
      </p>
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
                  ? 'bg-accent-green text-white shadow-nb-sm translate-x-[2px] translate-y-[2px]'
                  : 'bg-card-bg text-text-primary shadow-nb-md active:translate-x-[2px] active:translate-y-[2px] active:shadow-nb-sm'
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
