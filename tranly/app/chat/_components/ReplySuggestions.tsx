'use client';

import { BulbOutlined } from '@ant-design/icons';
import { useLanguagePreference } from '@/app/_lib/useLanguagePreference';
import type { ReplySuggestion } from '../_lib/types';

interface ReplySuggestionsProps {
  suggestions: ReplySuggestion[];
  onSelect: (korean: string) => void;
  disabled?: boolean;
}

/**
 * Tappable reply suggestions shown above the chat input. They help the learner
 * respond when they aren't sure what to say — tapping one sends it as their
 * message. Each chip shows the Korean reply with its Thai meaning.
 */
export default function ReplySuggestions({
  suggestions,
  onSelect,
  disabled = false,
}: ReplySuggestionsProps) {
  const { language } = useLanguagePreference();
  const isThai = language === 'thai';

  if (suggestions.length === 0) return null;

  return (
    <div className="px-3 pt-2">
      <div className="mb-2 flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-gray-400">
        <BulbOutlined style={{ fontSize: 15 }} />
        <span>{isThai ? 'ไม่รู้จะตอบอะไร? แตะเพื่อตอบ' : 'Not sure? Tap to reply'}</span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {suggestions.map((s, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(s.korean)}
            disabled={disabled}
            className={`flex shrink-0 flex-col items-start gap-0.5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#202124] px-4 py-3 text-left transition-all ${
              disabled
                ? 'opacity-50 cursor-not-allowed'
                : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-[0.99]'
            }`}
          >
            <span className="text-base font-medium text-gray-800 dark:text-gray-200">
              {s.korean}
            </span>
            {s.translation && (
              <span className="text-sm text-gray-500 dark:text-gray-400">{s.translation}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
