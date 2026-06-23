'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { LoadingOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import type { ChatMessage } from '../_lib/types/types';
import AIMessage from './AIMessage';
import UserMessage from './UserMessage';

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
