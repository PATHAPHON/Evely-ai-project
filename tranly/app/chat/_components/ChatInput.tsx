'use client';

import {
  useState,
  useCallback,
  useEffect,
  useRef,
  type KeyboardEvent,
} from 'react';
import {
  SendOutlined,
  AudioOutlined,
  CloseCircleFilled,
  PlusOutlined,
  ReadOutlined,
} from '@ant-design/icons';
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
  /** When true, shows the (+) quick-action menu. */
  skillsEnabled?: boolean;
  /** Changing this key clears the input text. */
  resetKey?: string | number;
}

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
  skillsEnabled = false,
  resetKey,
}: ChatInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (transcript) {
      setInputValue((prev) => (prev ? `${prev} ${transcript}` : transcript));
    }
  }, [transcript]);

  useEffect(() => {
    setInputValue('');
    setPlusMenuOpen(false);
  }, [resetKey]);

  const handleChange = useCallback((value: string) => {
    setInputValue(value.slice(0, 500));
  }, []);

  const canSend = validateMessage(inputValue) && !isLoading && !disabled;

  const handleSend = useCallback(() => {
    if (!canSend) return;
    onSend(inputValue.trim());
    setInputValue('');
  }, [canSend, inputValue, onSend]);

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
    <div className="w-full relative">
      {/* Word context tags */}
      {selectedWords.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3 px-2">
          {selectedWords.map((word) => (
            <span
              key={word.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/30 px-3 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300"
            >
              {word.englishText}
              <button
                type="button"
                onClick={() => onRemoveWord(word.id)}
                aria-label={`Remove ${word.englishText}`}
                className="text-blue-400 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-300 cursor-pointer"
              >
                <CloseCircleFilled style={{ fontSize: 13 }} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative flex flex-col bg-white dark:bg-[#1e1f20] shadow-[0_2px_16px_rgba(0,0,0,0.10)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.45)] focus-within:shadow-[0_4px_20px_rgba(0,0,0,0.14)] rounded-full">
        <div className={`flex items-center gap-2 pr-3 ${skillsEnabled ? 'pl-3' : 'pl-6'} py-3`}>
          {/* Plus quick-action menu */}
          {skillsEnabled && (
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setPlusMenuOpen((v) => !v)}
                disabled={isLoading || disabled}
                aria-label="เปิดเมนูตัวเลือก"
                aria-expanded={plusMenuOpen}
                className="flex h-12 w-12 items-center justify-center rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <PlusOutlined style={{ fontSize: 22 }} className={`transition-transform duration-200 ${plusMenuOpen ? 'rotate-45' : ''}`} />
              </button>
              {plusMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setPlusMenuOpen(false)} />
                  <div
                    className="absolute bottom-full mb-5 left-0 z-50 w-64 rounded-2xl border border-gray-200/60 dark:border-gray-800/40 bg-white dark:bg-[#1e1f20] p-2 shadow-lg flex flex-col gap-0.5"
                    style={{ animation: 'fadeSlideUp 100ms ease-out', transformOrigin: 'bottom left' }}
                  >
                    <button
                      type="button"
                      onClick={() => setPlusMenuOpen(false)}
                      className="w-full flex items-center gap-2.5 text-left px-3.5 py-2.5 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                    >
                      <ReadOutlined style={{ fontSize: 16 }} className="text-blue-600" />
                      <span>การเรียนรู้แบบมีคำแนะนำ</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder ?? 'ถาม Evely'}
            maxLength={500}
            disabled={isLoading || disabled}
            aria-label="Chat message input"
            className="min-w-0 flex-1 text-lg py-1 outline-none bg-transparent text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-600 disabled:cursor-not-allowed font-sans"
          />

          {sttSupported && (
            <button type="button" onClick={handleMicClick} disabled={disabled} aria-label={isListening ? 'Stop recording' : 'Start recording'}
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${isListening ? 'bg-red-500 text-white animate-pulse' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'}`}
            >
              <AudioOutlined style={{ fontSize: 22 }} />
            </button>
          )}
          {inputValue.trim() ? (
            <button type="button" onClick={handleSend} disabled={!canSend} aria-label="Send message"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 text-white transition-all duration-200 active:scale-95 cursor-pointer disabled:bg-transparent disabled:text-gray-300 dark:disabled:text-gray-700 disabled:cursor-not-allowed"
            >
              <SendOutlined style={{ fontSize: 18 }} />
            </button>
          ) : (
            <span aria-hidden="true" className="flex h-12 w-14 shrink-0 items-center justify-center rounded-full bg-[#d3e3fd] dark:bg-[#33415c] text-gray-700 dark:text-gray-200">
              <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
                <rect x="2" y="6" width="2" height="6" rx="1" fill="currentColor" />
                <rect x="8" y="3" width="2" height="12" rx="1" fill="currentColor" />
                <rect x="14" y="6" width="2" height="6" rx="1" fill="currentColor" />
              </svg>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
