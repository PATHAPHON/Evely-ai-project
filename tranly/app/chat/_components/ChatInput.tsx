'use client';

import {
  useState,
  useCallback,
  useEffect,
  useRef,
  type KeyboardEvent,
} from 'react';
import { Send, Mic, XCircle, Plus, BookOpen, Loader2 } from 'lucide-react';
import type { SavedWord } from '../_lib/types/types';
import { validateMessage } from '../_lib/utils/validateMessage';
import { useStrings } from '@/app/_lib/utils/strings';

export interface ChatInputProps {
  onSend: (text: string) => void;
  isLoading: boolean;
  sttSupported: boolean;
  isListening: boolean;
  isTranscribing?: boolean;
  onStartListening: () => void;
  onStopListening: () => void;
  transcript: string;
  /** Optional word chips shown above the input (e.g. guided-learning selections). */
  selectedWords?: SavedWord[];
  onRemoveWord?: (wordId: string) => void;
  /** Fully disables the input (e.g. the conversation has ended). */
  disabled?: boolean;
  /** Placeholder override (e.g. shown when disabled). */
  placeholder?: string;
  /** When true, shows the (+) quick-action menu. */
  skillsEnabled?: boolean;
  /** Changing this key clears the input text. */
  resetKey?: string | number;
  /** Opens the full-screen voice conversation mode. */
  onVoiceMode?: () => void;
}

export default function ChatInput({
  onSend,
  isLoading,
  sttSupported,
  isListening,
  isTranscribing = false,
  onStartListening,
  onStopListening,
  transcript,
  selectedWords = [],
  onRemoveWord,
  disabled = false,
  placeholder,
  skillsEnabled = false,
  resetKey,
  onVoiceMode,
}: ChatInputProps) {
  const t = useStrings();
  const [inputValue, setInputValue] = useState('');
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (transcript) {
      // Append incoming speech-to-text transcript to the input
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInputValue((prev) => (prev ? `${prev} ${transcript}` : transcript));
    }
  }, [transcript]);

  useEffect(() => {
    // Reset input when parent bumps resetKey (e.g. after send)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInputValue('');
    setPlusMenuOpen(false);
  }, [resetKey]);

  const handleChange = useCallback((value: string) => {
    setInputValue(value.slice(0, 500));
  }, []);

  const canSend = validateMessage(inputValue) && !isLoading && !disabled && !isTranscribing;

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
              className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary-bg px-3 py-1 text-xs font-semibold text-primary"
            >
              {word.englishText}
              <button
                type="button"
                onClick={() => onRemoveWord?.(word.id)}
                aria-label={t.chat.removeWordAria(word.englishText)}
                className="text-primary/70 hover:text-primary cursor-pointer"
              >
                <XCircle size={13} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative flex flex-col bg-card-bg border border-border-color shadow-soft-md focus-within:shadow-soft-lg rounded-[28px]">
        <div className={`flex items-center gap-2 pr-3 ${skillsEnabled ? 'pl-3' : 'pl-6'} py-3`}>
          {/* Plus quick-action menu */}
          {skillsEnabled && (
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setPlusMenuOpen((v) => !v)}
                disabled={isLoading || disabled || isTranscribing}
                aria-label={t.chat.optionsMenuAria}
                aria-expanded={plusMenuOpen}
                className="flex h-12 w-12 items-center justify-center rounded-full text-foreground/60 hover:bg-background/80 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={22} className={`transition-transform duration-200 ${plusMenuOpen ? 'rotate-45' : ''}`} />
              </button>
              {plusMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setPlusMenuOpen(false)} />
                  <div
                    className="absolute bottom-full mb-5 left-0 z-50 w-64 rounded-2xl border border-border-color bg-card-bg p-2 shadow-soft-lg flex flex-col gap-0.5"
                    style={{ animation: 'fadeSlideUp 100ms ease-out', transformOrigin: 'bottom left' }}
                  >
                    <button
                      type="button"
                      onClick={() => setPlusMenuOpen(false)}
                      className="w-full flex items-center gap-2.5 text-left px-3.5 py-2.5 rounded-xl text-sm font-bold text-foreground/80 hover:bg-background/80 transition-colors cursor-pointer"
                    >
                      <BookOpen size={16} className="text-primary" />
                      <span>{t.chat.guidedLearning}</span>
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
            placeholder={placeholder ?? t.chat.inputPlaceholder}
            maxLength={500}
            disabled={isLoading || disabled || isTranscribing}
            aria-label={t.chat.inputAria}
            className="min-w-0 flex-1 text-lg py-1 outline-none bg-transparent text-foreground placeholder:text-foreground/45 disabled:cursor-not-allowed font-sans"
          />

          {sttSupported && (
            <button
              type="button"
              onClick={handleMicClick}
              disabled={disabled || isTranscribing}
              aria-label={isListening ? t.chat.micStop : t.chat.micStart}
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                isListening
                  ? 'bg-incorrect text-white animate-pulse'
                  : 'text-foreground/60 hover:bg-background/80'
              }`}
            >
              {isTranscribing ? (
                <Loader2 size={22} className="animate-spin text-primary" />
              ) : (
                <Mic size={22} />
              )}
            </button>
          )}
          {inputValue.trim() ? (
            <button type="button" onClick={handleSend} disabled={!canSend} aria-label={t.chat.sendAria}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary hover:bg-primary-hover text-white transition-all duration-200 active:scale-95 cursor-pointer disabled:bg-transparent disabled:text-foreground/30 disabled:cursor-not-allowed"
            >
              <Send size={18} />
            </button>
          ) : (
            <button
              type="button"
              onClick={onVoiceMode}
              disabled={disabled || isTranscribing || !onVoiceMode}
              aria-label={t.chat.voiceModeAria}
              className="flex h-12 w-14 shrink-0 items-center justify-center rounded-full bg-primary-bg text-primary transition-all duration-200 hover:bg-primary-bg/70 active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
                <rect x="2" y="6" width="2" height="6" rx="1" fill="currentColor" />
                <rect x="8" y="3" width="2" height="12" rx="1" fill="currentColor" />
                <rect x="14" y="6" width="2" height="6" rx="1" fill="currentColor" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
