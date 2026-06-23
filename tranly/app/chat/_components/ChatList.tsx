'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import {
  LoadingOutlined,
  SoundOutlined,
  ExclamationCircleOutlined,
  LikeOutlined,
  DislikeOutlined,
  CopyOutlined,
  EllipsisOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
  CloseOutlined,
} from '@ant-design/icons';
import type { ChatMessage } from '../_lib/types/types';
import WordRenderer from '@/app/_components/WordRenderer';

interface ChatListProps {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onSpeak: (messageId: string, text?: string) => void;
}

/**
 * Renders a vertical scrollable message list with auto-scroll to bottom.
 * AI messages aligned left with clean Gemini bubbles.
 * User messages aligned right in a soft Gemini blue bubble.
 */
export default function ChatList({
  messages,
  isLoading,
  error,
  onRetry,
  onSpeak,
}: ChatListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastUserMsgRef = useRef<HTMLDivElement>(null);
  const prevUserCountRef = useRef(0);
  const [spacerHeight, setSpacerHeight] = useState(0);

  useLayoutEffect(() => {
    const userCount = messages.filter((m) => m.role === 'user').length;
    const delta = userCount - prevUserCountRef.current;
    prevUserCountRef.current = userCount;

    const el = scrollRef.current;
    if (!el) return;

    if (delta > 1) {
      // bulk load (restore session) → jump to bottom
      setSpacerHeight(0);
      el.scrollTo({ top: el.scrollHeight });
      return;
    }

    if (delta === 1 && lastUserMsgRef.current) {
      const anchor = lastUserMsgRef.current;
      setSpacerHeight(Math.max(0, el.clientHeight - anchor.offsetHeight));
      requestAnimationFrame(() => {
        anchor.scrollIntoView({ block: 'start', behavior: 'smooth' });
      });
    }
  }, [messages]);

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto p-4"
      role="log"
      aria-live="polite"
      aria-label="Conversation messages"
    >
      <div className="max-w-2xl mx-auto w-full space-y-5 pb-[380px]">
        {(() => {
          const lastUserIndex = messages.reduce(
            (acc, m, i) => (m.role === 'user' ? i : acc),
            -1
          );
          return messages.map((message, index) => {
            if (message.status === 'pending') {
              // Show partial streaming content if available, otherwise hide
              const hasPartial =
                (message.sentences && message.sentences.length > 0) ||
                message.englishText.length > 0;
              if (!hasPartial) return null;
              return <AIMessage key={message.id} message={message} onSpeak={onSpeak} />;
            }
            if (message.role === 'assistant') {
              return <AIMessage key={message.id} message={message} onSpeak={onSpeak} />;
            }
            return (
              <div key={message.id} ref={index === lastUserIndex ? lastUserMsgRef : undefined}>
                <UserMessage message={message} />
              </div>
            );
          });
        })()}

        {isLoading && !messages.some(
          (m) => m.status === 'pending' && ((m.sentences && m.sentences.length > 0) || m.englishText.length > 0)
        ) && <LoadingBubble />}

        {error && <ErrorBanner error={error} onRetry={onRetry} />}

        <div aria-hidden style={{ height: spacerHeight }} />
      </div>
    </div>
  );
}

function AIMessage({
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

function UserMessage({
  message,
}: {
  message: ChatMessage;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Slash commands are instructions, not language content — render them plain
  // instead of chipping every English word as vocab.
  const isCommand = message.rawText.trimStart().startsWith('/');

  return (
    <div className="flex justify-end items-start w-full">
      <div className="animate-user-bubble-pop-in max-w-[85%] rounded-[28px] bg-[#f0f4f9] dark:bg-[#1e1f20]/60 text-gray-900 dark:text-gray-100 p-4 px-6 shadow-sm">
        {isCommand ? (
          <div className="text-base text-gray-900 dark:text-gray-100">
            {message.rawText}
          </div>
        ) : message.isTranslating && !message.englishText ? (
          <div className="flex flex-col gap-2 animate-pulse" aria-hidden="true">
            <div className="flex gap-1.5 flex-wrap">
              <div className="h-6 w-14 rounded-lg bg-gray-200 dark:bg-[#3d3d5c]" />
              <div className="h-6 w-10 rounded-lg bg-gray-200 dark:bg-[#3d3d5c]" />
              <div className="h-6 w-16 rounded-lg bg-gray-200 dark:bg-[#3d3d5c]" />
              <div className="h-6 w-12 rounded-lg bg-gray-200 dark:bg-[#3d3d5c]" />
            </div>
            <div className="h-4 w-3/4 rounded-lg bg-gray-200 dark:bg-[#3d3d5c]" />
            <div className="h-3.5 w-2/3 rounded-lg bg-gray-200 dark:bg-[#3d3d5c]" />
          </div>
        ) : message.englishText ? (
          <div className="flex flex-col gap-1">
            <div className="text-xl font-bold text-gray-950 dark:text-white flex items-center gap-2 flex-wrap">
              <WordRenderer text={message.englishText} textClassName="text-xl font-bold text-gray-950 dark:text-white" />
              {message.grammarCorrect === true && (
                <span className="inline-flex items-center" title="ไวยากรณ์ถูกต้อง">
                  <CheckCircleFilled className="text-emerald-500 dark:text-emerald-400 text-lg" />
                </span>
              )}
              {message.grammarCorrect === false && (
                <button
                  type="button"
                  onClick={() => setIsExpanded(!isExpanded)}
                  title="พบจุดผิดไวยากรณ์ (คลิกเพื่อดูรายละเอียด)"
                  aria-label="Toggle grammar error details"
                  className="inline-flex items-center cursor-pointer text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition-colors focus:outline-none"
                >
                  <CloseCircleFilled className={`text-lg transition-transform duration-200 ${isExpanded ? 'scale-110' : ''}`} />
                </button>
              )}
            </div>
            {message.reading && (
              <p className="text-[15px] text-gray-600 dark:text-gray-300 font-medium leading-relaxed">{message.reading}</p>
            )}
            {message.translation && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{message.translation}</p>
            )}
            {message.romanization && (
              <p className="text-sm italic text-gray-500 dark:text-gray-400">{message.romanization}</p>
            )}
            {message.grammarCorrect === false && message.grammarNotes && (
              <div className="hidden">
                {/* Keep logic in place if needed, but we render the popup outside the main bubble */}
              </div>
            )}
          </div>
        ) : (
          <div className="text-base text-gray-900 dark:text-gray-100">
            <WordRenderer text={message.rawText} textClassName="text-base text-gray-900 dark:text-gray-100" />
          </div>
        )}
      </div>

      {/* Grammar Error Popup Modal */}
      {message.grammarCorrect === false && message.grammarNotes && isExpanded && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-[1.5px] transition-opacity duration-300"
          onClick={() => setIsExpanded(false)}
        >
          <div 
            className="w-full max-w-md rounded-3xl border border-red-200 dark:border-red-950 bg-white dark:bg-[#1e1f20] p-6 shadow-2xl transition-all duration-300 transform scale-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="font-bold flex items-center gap-2 text-red-600 dark:text-red-400 text-lg">
                <ExclamationCircleOutlined className="text-xl" />
                <span>ข้อผิดพลาดทางไวยากรณ์</span>
              </div>
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                aria-label="Close details"
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors cursor-pointer text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none"
              >
                <CloseOutlined style={{ fontSize: 16 }} />
              </button>
            </div>

            {/* Content */}
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">ประโยคของคุณ</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white leading-relaxed">{message.englishText}</p>
              </div>

              <div className="p-4 rounded-2xl bg-red-50/50 dark:bg-red-950/20 border border-red-200/50 dark:border-red-900/30 text-sm text-red-700 dark:text-red-300 leading-relaxed">
                {message.grammarNotes}
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="px-5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-sm font-bold text-gray-700 dark:text-gray-200 transition-colors cursor-pointer focus:outline-none"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LoadingBubble() {
  return (
    <div className="flex justify-start items-center gap-2 text-gray-400 dark:text-gray-500 py-3">
      <LoadingOutlined style={{ fontSize: 16 }} spin />
      <span className="text-sm font-medium">กำลังเตรียมคำตอบ...</span>
    </div>
  );
}

function ErrorBanner({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] rounded-2xl border border-red-200 dark:border-red-950 bg-red-50/50 dark:bg-red-950/20 p-4 shadow-sm">
        <div className="flex items-start gap-2.5">
          <ExclamationCircleOutlined
            className="text-red-500 mt-0.5"
            style={{ fontSize: 16 }}
          />
          <div>
            <p className="text-sm text-red-700 dark:text-red-300 font-semibold">{error}</p>
            <button
              type="button"
              onClick={onRetry}
              aria-label="Retry sending message"
              className="mt-3 rounded-xl border border-gray-250 dark:border-gray-800 bg-white dark:bg-[#202124] px-4 py-2 text-xs font-bold text-gray-800 dark:text-gray-200 shadow-sm transition-all duration-100 hover:bg-gray-50 cursor-pointer"
            >
              ลองใหม่อีกครั้ง
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
