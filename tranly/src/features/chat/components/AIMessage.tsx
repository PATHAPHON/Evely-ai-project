'use client';

import { Volume2, ThumbsUp, ThumbsDown, Copy, MoreHorizontal } from 'lucide-react';
import type { ChatMessage } from '@/shared/types/chatTypes';
import WordRenderer from '@/shared/components/WordRenderer';
import { useStrings } from '@/shared/utils/strings';
import { useShowTranslation } from '@/shared/hooks/useShowTranslation';

export default function AIMessage({
  message,
  onSpeak,
}: {
  message: ChatMessage;
  onSpeak: (messageId: string, text?: string) => void;
}) {
  const t = useStrings();
  const { showTranslation } = useShowTranslation();
  const sentences = message.sentences?.length
    ? message.sentences
    : [{ english: message.english, englishText: message.englishText, translation: message.translation }];
  const hasSentences = (message.sentences?.length ?? 0) > 0;

  return (
    <div className="flex justify-start items-start w-full">
      <div className="animate-bubble-pop-in w-full transition-all duration-300">
        <div className="text-foreground">
          <div className="flex flex-col gap-4">
            {sentences.map((s, idx) => (
              <div key={idx} className="flex flex-col">
                <p className="text-base font-medium leading-loose">
                  <WordRenderer text={s.english || s.englishText || ''} textClassName="text-base font-semibold text-foreground" reveal />
                </p>
                {showTranslation && s.translation && (
                  <p className="text-sm text-foreground/60 mt-1 leading-relaxed">
                    {s.translation}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Action buttons bar */}
        <div className="flex justify-between items-center mt-3 text-foreground/45 w-full max-w-md">
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label={t.chat.likeAria}
              className="p-1.5 hover:bg-card-bg rounded-full transition-colors cursor-pointer text-foreground/60 hover:text-foreground"
            >
              <ThumbsUp size={16} />
            </button>
            <button
              type="button"
              aria-label={t.chat.dislikeAria}
              className="p-1.5 hover:bg-card-bg rounded-full transition-colors cursor-pointer text-foreground/60 hover:text-foreground"
            >
              <ThumbsDown size={16} />
            </button>
            <button
              type="button"
              onClick={() => {
                const textToCopy = hasSentences
                  ? sentences.map(s => s.translation).join('\n')
                  : message.translation || message.englishText;
                navigator.clipboard.writeText(textToCopy);
              }}
              aria-label={t.chat.copyAria}
              className="p-1.5 hover:bg-card-bg rounded-full transition-colors cursor-pointer text-foreground/60 hover:text-foreground"
            >
              <Copy size={16} />
            </button>
            <button
              type="button"
              aria-label={t.chat.moreAria}
              className="p-1.5 hover:bg-card-bg rounded-full transition-colors cursor-pointer text-foreground/60 hover:text-foreground"
            >
              <MoreHorizontal size={16} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => onSpeak(message.id)}
            aria-label={t.chat.playAria}
            className="p-1.5 hover:bg-card-bg rounded-full transition-colors cursor-pointer text-foreground/60 hover:text-foreground"
          >
            <Volume2 size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
