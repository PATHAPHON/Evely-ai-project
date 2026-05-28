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
}: ChatInputProps) {
  const [inputValue, setInputValue] = useState('');

  // When transcript changes from STT, insert it into the input field
  useEffect(() => {
    if (transcript) {
      setInputValue((prev) => (prev ? `${prev} ${transcript}` : transcript));
    }
  }, [transcript]);

  const canSend = validateMessage(inputValue) && !isLoading;

  const handleSend = useCallback(() => {
    const trimmed = inputValue.trim();
    if (!trimmed || !validateMessage(inputValue) || isLoading) return;
    onSend(trimmed);
    setInputValue('');
  }, [inputValue, isLoading, onSend]);

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
              className="inline-flex items-center gap-1 rounded-lg border-2 border-black bg-[#E6F4FF] px-2 py-0.5 text-sm font-medium"
            >
              {word.korean}
              <button
                type="button"
                onClick={() => onRemoveWord(word.id)}
                aria-label={`Remove ${word.korean}`}
                className="text-gray-500 hover:text-black cursor-pointer"
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
        <div className="flex-1 rounded-xl border-3 border-black bg-white shadow-[4px_4px_0_#000000]">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value.slice(0, 500))}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            maxLength={500}
            disabled={isLoading}
            aria-label="Chat message input"
            className="w-full rounded-xl px-4 py-3 text-base outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
        </div>

        {/* Microphone button — hidden if STT not supported */}
        {sttSupported && (
          <button
            type="button"
            onClick={handleMicClick}
            aria-label={isListening ? 'Stop recording' : 'Start recording'}
            className={`flex h-12 w-12 items-center justify-center rounded-xl border-3 border-black shadow-[4px_4px_0_#000000] transition-all duration-100 active:translate-y-[2px] active:shadow-[1px_1px_0_#000000] cursor-pointer ${
              isListening
                ? 'bg-red-500 text-white animate-pulse'
                : 'bg-white text-black'
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
          className="flex h-12 w-12 items-center justify-center rounded-xl border-3 border-black bg-[#4096FF] text-white shadow-[4px_4px_0_#000000] transition-all duration-100 active:translate-y-[2px] active:shadow-[1px_1px_0_#000000] cursor-pointer disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed disabled:shadow-[4px_4px_0_#666666]"
        >
          <SendOutlined style={{ fontSize: 20 }} />
        </button>
      </div>
    </div>
  );
}
