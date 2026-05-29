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
      <div className="mb-1 flex items-center gap-1 text-xs font-bold text-text-secondary">
        <BulbOutlined style={{ fontSize: 12 }} />
        <span>{isThai ? 'ไม่รู้จะตอบอะไร? แตะเพื่อตอบ' : 'Not sure? Tap to reply'}</span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {suggestions.map((s, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(s.korean)}
            disabled={disabled}
            className={`flex shrink-0 flex-col items-start rounded-xl border-3 border-border-color bg-card-bg px-3 py-2 text-left shadow-[3px_3px_0_#000000] dark:shadow-[3px_3px_0_rgba(0,0,0,0.4)] transition-all ${
              disabled
                ? 'opacity-50 cursor-not-allowed'
                : 'cursor-pointer active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_#000000] dark:active:shadow-[1px_1px_0_rgba(0,0,0,0.4)]'
            }`}
          >
            <span className="text-sm font-bold text-text-primary">
              {s.korean}
            </span>
            {s.translation && (
              <span className="text-xs text-text-secondary">{s.translation}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
