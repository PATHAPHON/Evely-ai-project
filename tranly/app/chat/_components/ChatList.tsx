'use client';

import { useEffect, useRef } from 'react';
import {
  LoadingOutlined,
  SoundOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import type { ChatMessage } from '../_lib/types';
import { useLanguagePreference } from '@/app/_lib/useLanguagePreference';

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
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading, error]);

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto p-4 space-y-4"
      role="log"
      aria-live="polite"
      aria-label="Conversation messages"
    >
      {messages.length === 0 && !isLoading && !error && (
        <p className="text-center text-gray-400 mt-8">
          Type a message below to start the conversation
        </p>
      )}

      {messages.map((message) => {
        if (message.status === 'pending') return null;
        return message.role === 'assistant' ? (
          <AIMessage key={message.id} message={message} onSpeak={onSpeak} />
        ) : (
          <UserMessage key={message.id} message={message} onSpeak={onSpeak} />
        );
      })}

      {isLoading && <LoadingBubble />}

      {error && <ErrorBanner error={error} onRetry={onRetry} />}
    </div>
  );
}

function AIMessage({
  message,
  onSpeak,
}: {
  message: ChatMessage;
  onSpeak: (messageId: string) => void;
}) {
  const { language } = useLanguagePreference();

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] rounded-2xl border-3 border-black bg-white p-4 shadow-[4px_4px_0_#000000]">
        {/* Korean text */}
        <p className="text-2xl font-bold text-black mb-1">{message.korean}</p>

        {/* Romanization */}
        <p className="text-sm text-gray-500 italic mb-1">
          {message.romanization}
        </p>

        {/* Translation — language based on user preference */}
        {language === 'thai' ? (
          <>
            <p className="text-base text-gray-700 mb-0.5">{message.reading}</p>
            <p className="text-base text-gray-600">{message.translation}</p>
          </>
        ) : (
          <p className="text-base text-gray-600">{message.english}</p>
        )}

        {/* Audio button */}
        <button
          type="button"
          onClick={() => onSpeak(message.id)}
          aria-label="Play Korean pronunciation"
          className="mt-2 flex h-8 w-8 items-center justify-center rounded-lg border-2 border-black bg-[#4096FF] text-white shadow-[2px_2px_0_#000000] transition-all duration-100 active:translate-y-[1px] active:shadow-[1px_1px_0_#000000] cursor-pointer"
        >
          <SoundOutlined style={{ fontSize: 14 }} />
        </button>
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
    <div className="flex justify-end">
      <div className="max-w-[75%] rounded-2xl border-3 border-black bg-[#E6F4FF] p-3 shadow-[4px_4px_0_#000000]">
        {message.korean ? (
          <>
            <p className="text-2xl font-bold text-black mb-1">{message.korean}</p>
            {message.reading && (
              <p className="text-sm text-gray-600 mb-0.5">{message.reading}</p>
            )}
            {message.romanization && (
              <p className="text-xs text-gray-400 italic mb-1">{message.romanization}</p>
            )}
            <p className="text-xs text-gray-400 mt-1">{message.rawText}</p>
            <button
              type="button"
              onClick={() => onSpeak(message.id)}
              aria-label="Play Korean pronunciation"
              className="mt-2 flex h-8 w-8 items-center justify-center rounded-lg border-2 border-black bg-[#4096FF] text-white shadow-[2px_2px_0_#000000] transition-all duration-100 active:translate-y-[1px] active:shadow-[1px_1px_0_#000000] cursor-pointer"
            >
              <SoundOutlined style={{ fontSize: 14 }} />
            </button>
          </>
        ) : (
          <p className="text-base text-black">{message.rawText}</p>
        )}
      </div>
    </div>
  );
}

function LoadingBubble() {
  return (
    <div className="flex justify-start">
      <div className="rounded-2xl border-3 border-black bg-white p-4 shadow-[4px_4px_0_#000000]">
        <div className="flex items-center gap-2 text-gray-500">
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
      <div className="max-w-[85%] rounded-2xl border-3 border-red-500 bg-red-50 p-4 shadow-[4px_4px_0_#EF4444]">
        <div className="flex items-start gap-2">
          <ExclamationCircleOutlined
            className="text-red-500 mt-0.5"
            style={{ fontSize: 16 }}
          />
          <div>
            <p className="text-sm text-red-700">{error}</p>
            <button
              type="button"
              onClick={onRetry}
              aria-label="Retry sending message"
              className="mt-2 rounded-lg border-2 border-black bg-white px-3 py-1 text-sm font-medium shadow-[2px_2px_0_#000000] transition-all duration-100 active:translate-y-[1px] active:shadow-[1px_1px_0_#000000] cursor-pointer"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
