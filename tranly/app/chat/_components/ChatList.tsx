'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import type { ChatMessage } from '../_lib/types/types';
import AIMessage from './AIMessage';
import UserMessage from './UserMessage';
import { useStrings } from '@/app/_lib/utils/strings';

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
  const t = useStrings();
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
      aria-label={t.chat.messagesAria}
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
    <div className="flex justify-start items-center gap-1 text-foreground/50 py-3">
      <span className="w-2 h-2 rounded-full bg-foreground/50 loading-dot" />
      <span className="w-2 h-2 rounded-full bg-foreground/50 loading-dot" style={{ animationDelay: '0.15s' }} />
      <span className="w-2 h-2 rounded-full bg-foreground/50 loading-dot" style={{ animationDelay: '0.3s' }} />
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
  const t = useStrings();
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] rounded-2xl border border-incorrect/20 bg-incorrect/5 p-4 shadow-soft-sm">
        <div className="flex items-start gap-2.5">
          <AlertCircle className="text-incorrect mt-0.5" size={16} />
          <div>
            <p className="text-sm text-incorrect font-semibold">{error}</p>
            <button
              type="button"
              onClick={onRetry}
              aria-label={t.chat.retryAria}
              className="mt-3 rounded-xl border border-border-color bg-background px-4 py-2 text-xs font-bold text-foreground shadow-soft-sm hover:bg-card-bg/60 cursor-pointer transition-all duration-100"
            >
              {t.chat.retry}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
