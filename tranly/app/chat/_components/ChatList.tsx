'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  LoadingOutlined,
  SoundOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import type { ChatMessage } from '../_lib/types';
import { useLanguagePreference } from '@/app/_lib/useLanguagePreference';
import Mascot from './Mascot';
import SlothMascot from '@/app/profile/_components/SlothMascot';

interface ChatListProps {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onSpeak: (messageId: string) => void;
}

/**
 * Renders a vertical scrollable message list with auto-scroll to bottom.
 * AI messages aligned left with Korean text, pronunciation, romanization, translation, and audio button.
 * User messages aligned right showing raw text.
 * Shows loading indicator when waiting for AI response.
 * Shows error message with retry button on API failure.
 */
export default function ChatList({
  messages,
  isLoading,
  error,
  onRetry,
  onSpeak,
}: ChatListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new message or loading state change
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, error, scrollToBottom]);

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto p-4 space-y-4"
      role="log"
      aria-live="polite"
      aria-label="Conversation messages"
    >
      {messages.length === 0 && !isLoading && !error && (
        <p className="text-center text-text-secondary mt-8">
          Type a message below to start the conversation
        </p>
      )}

      {(() => {
        // The freshest AI reply gets the happy hop; older ones idle.
        let lastAssistantId: string | null = null;
        for (const m of messages) {
          if (m.role === 'assistant' && m.status !== 'pending') lastAssistantId = m.id;
        }
        return messages.map((message) => {
          if (message.status === 'pending') return null;
          return message.role === 'assistant' ? (
            <AIMessage
              key={message.id}
              message={message}
              onSpeak={onSpeak}
              isLatest={message.id === lastAssistantId}
              onType={scrollToBottom}
            />
          ) : (
            <UserMessage key={message.id} message={message} onSpeak={onSpeak} />
          );
        });
      })()}

      {isLoading && <LoadingBubble />}

      {error && <ErrorBanner error={error} onRetry={onRetry} />}
    </div>
  );
}

function AIMessage({
  message,
  onSpeak,
  isLatest = false,
  onType,
}: {
  message: ChatMessage;
  onSpeak: (messageId: string) => void;
  isLatest?: boolean;
  onType?: () => void;
}) {
  const { language } = useLanguagePreference();

  // Determine if this is a brand new message requiring typewriter animation
  const isRecent = new Date().getTime() - new Date(message.timestamp).getTime() < 10000;
  const shouldAnimate = isLatest && isRecent;
  const chars = Array.from(message.korean);
  const [shown, setShown] = useState(shouldAnimate ? 0 : chars.length);

  useEffect(() => {
    if (!shouldAnimate) return;
    if (shown >= chars.length) return;
    const t = setTimeout(() => {
      setShown((n) => n + 1);
      onType?.();
    }, 25); // 25ms per character reveal
    return () => clearTimeout(t);
  }, [shown, chars.length, shouldAnimate, onType]);

  const isDone = !shouldAnimate || shown >= chars.length;

  return (
    <div className="flex justify-start items-end gap-2">
      <div className="animate-mascot-pop-in shrink-0">
        <Mascot state={isLatest ? (isDone ? 'happy' : 'thinking') : 'idle'} size={40} />
      </div>
      <div className="animate-bubble-pop-in max-w-[85%] rounded-2xl border-3 border-border-color bg-card-bg p-4 shadow-nb-md transition-all duration-300">
        {/* Korean text */}
        <p className="text-2xl font-bold text-text-primary mb-1">
          {shouldAnimate ? chars.slice(0, shown).join('') : message.korean}
        </p>

        {/* Translation & auxiliary info (fades/expands in smoothly) */}
        <div
          className={`transition-all duration-300 ease-out origin-top ${
            isDone ? 'opacity-100 max-h-[500px]' : 'opacity-0 max-h-0 overflow-hidden'
          }`}
        >
          {/* Romanization */}
          <p className="text-sm text-text-secondary italic mb-1 mt-1">
            {message.romanization}
          </p>

          {/* Translation — language based on user preference */}
          {language === 'thai' ? (
            <div className="mt-1">
              <p className="text-base text-text-secondary mb-0.5">{message.reading}</p>
              <p className="text-base text-text-secondary">{message.translation}</p>
            </div>
          ) : (
            <p className="text-base text-text-secondary mt-1">{message.english}</p>
          )}

          {/* Audio button */}
          <button
            type="button"
            onClick={() => onSpeak(message.id)}
            aria-label="Play Korean pronunciation"
            className="mt-2 flex h-8 w-8 items-center justify-center rounded-lg border-2 border-border-color bg-[#4096FF] text-white shadow-nb-sm transition-all duration-100 active:translate-y-[1px] active:shadow-[1px_1px_0_var(--shadow-color)] cursor-pointer"
          >
            <SoundOutlined style={{ fontSize: 14 }} />
          </button>
        </div>
      </div>
    </div>
  );
}

function UserMessage({
  message,
  onSpeak,
}: {
  message: ChatMessage;
  onSpeak: (messageId: string) => void;
}) {
  return (
    <div className="flex justify-end items-end gap-2">
      <div className="animate-user-bubble-pop-in max-w-[85%] rounded-2xl border-3 border-border-color bg-[#E6F4FF] dark:bg-[#1a3a5c] p-4 shadow-nb-md">
        {message.korean ? (
          <>
            <p className="text-2xl font-bold text-text-primary mb-1">{message.korean}</p>
            {message.reading && (
              <p className="text-base text-text-secondary mb-0.5">{message.reading}</p>
            )}
            {message.romanization && (
              <p className="text-sm text-text-secondary italic mb-1">{message.romanization}</p>
            )}
            <p className="text-base text-text-secondary mt-1">{message.rawText}</p>
            <button
              type="button"
              onClick={() => onSpeak(message.id)}
              aria-label="Play Korean pronunciation"
              className="mt-2 flex h-8 w-8 items-center justify-center rounded-lg border-2 border-border-color bg-[#4096FF] text-white shadow-nb-sm transition-all duration-100 active:translate-y-[1px] active:shadow-[1px_1px_0_var(--shadow-color)] cursor-pointer"
            >
              <SoundOutlined style={{ fontSize: 14 }} />
            </button>
          </>
        ) : (
          <p className="text-base text-text-primary">{message.rawText}</p>
        )}
      </div>
      <div className="animate-mascot-pop-in shrink-0">
        <SlothMascot size={40} />
      </div>
    </div>
  );
}

function LoadingBubble() {
  return (
    <div className="flex justify-start items-end gap-2">
      <div className="animate-mascot-pop-in shrink-0">
        <Mascot state="thinking" size={40} />
      </div>
      <div className="animate-bubble-pop-in rounded-2xl border-3 border-border-color bg-card-bg p-4 shadow-nb-md">
        <div className="flex items-center gap-2 text-text-secondary">
          <LoadingOutlined style={{ fontSize: 18 }} spin />
          <span className="text-sm">Generating response...</span>
        </div>
      </div>
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
      <div className="max-w-[85%] rounded-2xl border-3 border-red-500 bg-red-50 dark:bg-red-900/30 p-4 shadow-[4px_4px_0_#EF4444]">
        <div className="flex items-start gap-2">
          <ExclamationCircleOutlined
            className="text-red-500 mt-0.5"
            style={{ fontSize: 16 }}
          />
          <div>
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            <button
              type="button"
              onClick={onRetry}
              aria-label="Retry sending message"
              className="mt-2 rounded-lg border-2 border-border-color bg-card-bg px-3 py-1 text-sm font-medium text-text-primary shadow-nb-sm transition-all duration-100 active:translate-y-[1px] active:shadow-[1px_1px_0_var(--shadow-color)] cursor-pointer"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
