'use client';

import { useState, useCallback, useEffect, type KeyboardEvent } from 'react';
import { SendOutlined, AudioOutlined, CloseCircleFilled } from '@ant-design/icons';
import type { SavedWord } from '../_lib/types';
import { validateMessage } from '../_lib/validateMessage';

export interface ChatInputProps {
  onSend: (text: string) => void;
  isLoading: boolean;
  sttSupported: boolean;
  isListening: boolean;
  onStartListening: () => void;
  onStopListening: () => void;
  transcript: string;
  selectedWords: SavedWord[];
  onRemoveWord: (wordId: string) => void;
  /** Fully disables the input (e.g. the conversation has ended). */
  disabled?: boolean;
  /** Placeholder override (e.g. shown when disabled). */
  placeholder?: string;
}

/**
 * Chat input component with text field, send button, microphone button,
 * recording indicator, and removable word context tags.
 * Styled with Neobrutalist design (border 3px solid, box-shadow 4px 4px 0).
 */
export default function ChatInput({
  onSend,
  isLoading,
  sttSupported,
  isListening,
  onStartListening,
  onStopListening,
  transcript,
  selectedWords,
  onRemoveWord,
  disabled = false,
  placeholder,
}: ChatInputProps) {
  const [inputValue, setInputValue] = useState('');

  // When transcript changes from STT, insert it into the input field
  useEffect(() => {
    if (transcript) {
      setInputValue((prev) => (prev ? `${prev} ${transcript}` : transcript));
    }
  }, [transcript]);

  const canSend = validateMessage(inputValue) && !isLoading && !disabled;

  const handleSend = useCallback(() => {
    const trimmed = inputValue.trim();
    if (!trimmed || !validateMessage(inputValue) || isLoading || disabled) return;
    onSend(trimmed);
    setInputValue('');
  }, [inputValue, isLoading, disabled, onSend]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const handleMicClick = useCallback(() => {
    if (isListening) {
      onStopListening();
    } else {
      onStartListening();
    }
  }, [isListening, onStartListening, onStopListening]);

  return (
    <div className="w-full">
      {/* Word context tags */}
      {selectedWords.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2 px-1">
          {selectedWords.map((word) => (
            <span
              key={word.id}
              className="inline-flex items-center gap-1 rounded-lg border-2 border-border-color bg-[#E6F4FF] dark:bg-[#1a3a5c] px-2 py-0.5 text-sm font-medium text-text-primary"
            >
              {word.korean}
              <button
                type="button"
                onClick={() => onRemoveWord(word.id)}
                aria-label={`Remove ${word.korean}`}
                className="text-text-secondary hover:text-text-primary cursor-pointer"
              >
                <CloseCircleFilled style={{ fontSize: 14 }} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input row */}
      <div className="flex items-center gap-2">
        {/* Text input */}
        <div className="flex-1 rounded-xl border-3 border-border-color bg-card-bg shadow-nb-md">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value.slice(0, 500))}
            onKeyDown={handleKeyDown}
            placeholder={placeholder ?? 'Type a message...'}
            maxLength={500}
            disabled={isLoading || disabled}
            aria-label="Chat message input"
            className="w-full rounded-xl px-4 py-3 text-base outline-none bg-transparent text-text-primary placeholder:text-text-secondary disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
          />
        </div>

        {/* Microphone button — hidden if STT not supported */}
        {sttSupported && (
          <button
            type="button"
            onClick={handleMicClick}
            disabled={disabled}
            aria-label={isListening ? 'Stop recording' : 'Start recording'}
            className={`flex h-12 w-12 items-center justify-center rounded-xl border-3 border-border-color shadow-nb-md transition-all duration-100 active:translate-y-[2px] active:shadow-[1px_1px_0_var(--shadow-color)] disabled:opacity-50 disabled:cursor-not-allowed ${
              isListening
                ? 'bg-red-500 text-white animate-pulse'
                : 'bg-card-bg text-text-primary'
            }`}
          >
            <AudioOutlined style={{ fontSize: 20 }} />
          </button>
        )}

        {/* Send button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          aria-label="Send message"
          className="flex h-12 w-12 items-center justify-center rounded-xl border-3 border-border-color bg-[#4096FF] text-white shadow-nb-md transition-all duration-100 active:translate-y-[2px] active:shadow-[1px_1px_0_var(--shadow-color)] cursor-pointer disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed disabled:shadow-[4px_4px_0_#666666]"
        >
          <SendOutlined style={{ fontSize: 20 }} />
        </button>
      </div>
    </div>
  );
}
