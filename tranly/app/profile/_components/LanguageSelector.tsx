'use client';

import { useLanguagePreference, type TranslationLanguage } from '@/app/_lib/hooks/useLanguagePreference';
import { useStrings } from '@/app/_lib/utils/strings';

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
              className={`w-full rounded-xl border px-4 py-3 text-left transition-all cursor-pointer ${
                isActive
                  ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold shadow-sm'
                  : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1e1f20] text-gray-700 dark:text-gray-250 hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-99'
              }`}
            >
              <span className="font-bold">{option.label}</span>
              <span className={`ml-2 text-xs ${isActive ? 'text-blue-500/80 dark:text-blue-400/80 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                — {option.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
