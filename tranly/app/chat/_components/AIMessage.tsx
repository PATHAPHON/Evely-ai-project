'use client';

import {
  SoundOutlined,
  LikeOutlined,
  DislikeOutlined,
  CopyOutlined,
  EllipsisOutlined,
} from '@ant-design/icons';
import type { ChatMessage } from '../_lib/types/types';
import WordRenderer from '@/app/_components/WordRenderer';

export default function AIMessage({
  message,
  onSpeak,
}: {
  message: ChatMessage;
  onSpeak: (messageId: string, text?: string) => void;
}) {
  const sentences = message.sentences || [];
  const hasSentences = sentences.length > 0;

  return (
    <div className="flex justify-start items-start w-full">
      <div className="animate-bubble-pop-in max-w-[85%] w-full transition-all duration-300">
        <div className="text-gray-900 dark:text-gray-100">
          {hasSentences ? (
            <div className="flex flex-col gap-4">
              {sentences.map((s, idx) => (
                <div key={idx} className="flex flex-col">
                  {idx > 0 && (
                    <div className="border-t border-gray-200/50 dark:border-gray-800/40 my-3 w-full" />
                  )}
                  <p className="text-base font-medium leading-relaxed">
                    <WordRenderer text={s.english || s.englishText || ''} textClassName="text-base font-semibold text-gray-900 dark:text-white" />
                  </p>
                  {s.reading && (
                    <p className="text-[15px] text-gray-600 dark:text-gray-300 font-medium leading-relaxed mt-1">
                      {s.reading}
                    </p>
                  )}
                  {s.translation && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                      {s.translation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div>
              <p className="text-base font-medium leading-relaxed">
                <WordRenderer text={message.english || message.englishText || ''} textClassName="text-base font-semibold text-gray-900 dark:text-white" />
              </p>
              {message.reading && (
                <p className="text-[15px] text-gray-600 dark:text-gray-300 font-medium leading-relaxed mt-1">
                  {message.reading}
                </p>
              )}
              {message.translation && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                  {message.translation}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Action buttons bar */}
        <div className="flex justify-between items-center mt-3 text-gray-400 dark:text-gray-500 w-full max-w-md">
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Like response"
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors cursor-pointer text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <LikeOutlined style={{ fontSize: 16 }} />
            </button>
            <button
              type="button"
              aria-label="Dislike response"
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors cursor-pointer text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <DislikeOutlined style={{ fontSize: 16 }} />
            </button>
            <button
              type="button"
              onClick={() => {
                const textToCopy = hasSentences
                  ? sentences.map(s => s.translation || s.reading).join('\n')
                  : message.translation || message.englishText;
                navigator.clipboard.writeText(textToCopy);
              }}
              aria-label="Copy text"
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors cursor-pointer text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <CopyOutlined style={{ fontSize: 16 }} />
            </button>
            <button
              type="button"
              aria-label="More options"
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors cursor-pointer text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <EllipsisOutlined style={{ fontSize: 16 }} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => onSpeak(message.id)}
            aria-label="Play pronunciation"
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors cursor-pointer text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <SoundOutlined style={{ fontSize: 18 }} />
          </button>
        </div>
      </div>
    </div>
  );
}
