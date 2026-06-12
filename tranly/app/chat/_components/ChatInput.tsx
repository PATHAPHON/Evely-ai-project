'use client';

import {
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type KeyboardEvent,
} from 'react';
import {
  SendOutlined,
  AudioOutlined,
  CloseCircleFilled,
  PlusOutlined,
  ThunderboltOutlined,
  ScanOutlined,
} from '@ant-design/icons';
import { useScanAction } from '@/app/scan/_lib/useScanAction';
import type { SavedWord } from '../_lib/types';
import { validateMessage } from '../_lib/validateMessage';
import {
  getMatchingSkills,
  composeMessage,
  parseInlineExam,
} from '../_lib/chatInputSkills';

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
  /**
   * When true, allows invoking /exam inline (typing "/" autocomplete or
   * committing a "/exam " chip). Disabled inside an ongoing conversation so
   * exams aren't created in a chat that already has messages.
   */
  allowInlineSkill?: boolean;
  /**
   * Called when the (+) menu's "ทำข้อสอบด่วน" is pressed. The page starts a
   * fresh chat; the input is then prefilled with "/exam " locally. Typing
   * "/exam" by hand (via autocomplete) stays in the current chat instead.
   */
  onNewExamChat?: () => void;
  /** Changing this key resets/clears the input text and active skill command. */
  resetKey?: string | number;
}

/**
 * Chat input component with text field, send button, microphone button,
 * recording indicator, and removable word context tags.
 *
 * Supports slash skills (e.g. `/exam <topic>`): typing "/" opens an
 * autocomplete menu, and the (+) menu inserts the skill prefix.
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
  skillsEnabled = false,
  allowInlineSkill = true,
  onNewExamChat,
  resetKey,
}: ChatInputProps) {
  const [inputValue, setInputValue] = useState('');
  // The committed slash skill, shown as a chip (e.g. "/exam"). When set, the
  // text field holds only the topic; on send we recompose "<skill> <topic>".
  const [skill, setSkill] = useState<string | null>(null);
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { hasGetUserMedia, fileInputRef, startScan, handleFileChange } =
    useScanAction(isLoading || disabled);

  // When transcript changes from STT, insert it into the input field
  useEffect(() => {
    if (transcript) {
      setInputValue((prev) => (prev ? `${prev} ${transcript}` : transcript));
    }
  }, [transcript]);

  // Reset input value when resetKey changes
  useEffect(() => {
    setInputValue('');
    setSkill(null);
  }, [resetKey]);

  // The "/" autocomplete is active while the user is typing the skill token
  // (a leading "/" with no space yet, and no chip committed yet).
  const matchingSkills = useMemo(
    () =>
      getMatchingSkills({
        skillsEnabled,
        allowInlineSkill,
        committedSkill: skill,
        inputValue,
      }),
    [skillsEnabled, allowInlineSkill, skill, inputValue],
  );
  const showSkillMenu = matchingSkills.length > 0;

  // Commit a skill into a chip and clear the slash text; the field now holds
  // the topic only.
  const commitSkill = useCallback((command: string) => {
    setSkill(command);
    setInputValue('');
    setPlusMenuOpen(false);
    inputRef.current?.focus();
  }, []);

  const handleChange = useCallback(
    (value: string) => {
      const v = value.slice(0, 500);
      // Typing/pasting "/exam " (with a trailing space) collapses into a chip.
      if (skill === null && allowInlineSkill) {
        const examTopic = parseInlineExam(v);
        if (examTopic !== null) {
          setSkill('/exam');
          setInputValue(examTopic);
          return;
        }
      }
      setInputValue(v);
    },
    [skill, allowInlineSkill],
  );

  // The message actually sent: "<skill> <topic>" when a chip is active.
  const composedMessage = composeMessage(skill, inputValue);
  const canSend = validateMessage(composedMessage) && !isLoading && !disabled;

  const handleSend = useCallback(() => {
    if (!validateMessage(composedMessage) || isLoading || disabled) return;
    onSend(composedMessage);
    setInputValue('');
    setSkill(null);
  }, [composedMessage, isLoading, disabled, onSend]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      // While the skill menu is open, Enter/Tab commits the top skill chip
      // instead of sending the half-typed "/exam".
      if (showSkillMenu && (e.key === 'Enter' || e.key === 'Tab')) {
        e.preventDefault();
        commitSkill(matchingSkills[0].command);
        return;
      }
      // Backspace on an empty field removes the skill chip.
      if (e.key === 'Backspace' && inputValue === '' && skill) {
        e.preventDefault();
        setSkill(null);
        return;
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend, showSkillMenu, matchingSkills, commitSkill, inputValue, skill],
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
        <div className="flex flex-wrap gap-2 mb-3 px-2">
          {selectedWords.map((word) => (
            <span
              key={word.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/30 px-3 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300"
            >
              {word.korean}
              <button
                type="button"
                onClick={() => onRemoveWord(word.id)}
                aria-label={`Remove ${word.korean}`}
                className="text-blue-400 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-300 cursor-pointer"
              >
                <CloseCircleFilled style={{ fontSize: 13 }} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input pill: text field, mic, and send live inside one capsule */}
      <div className={`relative flex items-center gap-2 rounded-full bg-white dark:bg-[#1e1f20] ${skillsEnabled ? 'pl-3' : 'pl-6'} pr-3 py-3 shadow-[0_2px_16px_rgba(0,0,0,0.10)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.45)] transition-all focus-within:shadow-[0_4px_20px_rgba(0,0,0,0.14)]`}>
        {/* Slash-skill autocomplete menu */}
        {showSkillMenu && (
          <div
            className="absolute bottom-full mb-3 left-0 z-50 w-72 rounded-2xl border border-gray-200/60 dark:border-gray-800/40 bg-white dark:bg-[#1e1f20] p-2 shadow-lg flex flex-col gap-0.5"
            style={{ animation: 'fadeSlideUp 100ms ease-out', transformOrigin: 'bottom left' }}
          >
            {matchingSkills.map((skill) => (
              <button
                key={skill.command}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  commitSkill(skill.command);
                }}
                className="w-full flex items-center gap-2.5 text-left px-3.5 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              >
                <ThunderboltOutlined style={{ fontSize: 16 }} className="text-amber-500" />
                <span className="flex flex-col">
                  <span className="text-sm font-bold text-gray-800 dark:text-gray-200">
                    {skill.command}
                  </span>
                  <span className="text-xs text-gray-400">{skill.description}</span>
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Plus button: opens the quick-action menu */}
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
              <PlusOutlined
                style={{ fontSize: 22 }}
                className={`transition-transform duration-200 ${plusMenuOpen ? 'rotate-45' : ''}`}
              />
            </button>
            {plusMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setPlusMenuOpen(false)} />
                <div
                  className="absolute bottom-full mb-5 left-0 z-50 w-56 rounded-2xl border border-gray-200/60 dark:border-gray-800/40 bg-white dark:bg-[#1e1f20] p-2 shadow-lg flex flex-col gap-0.5"
                  style={{ animation: 'fadeSlideUp 100ms ease-out', transformOrigin: 'bottom left' }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      // Quick exam = start a fresh chat, then commit /exam chip.
                      onNewExamChat?.();
                      commitSkill('/exam');
                    }}
                    className="w-full flex items-center gap-2.5 text-left px-3.5 py-2.5 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                  >
                    <ThunderboltOutlined style={{ fontSize: 16 }} className="text-amber-500" />
                    <span>ทำข้อสอบด่วน</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPlusMenuOpen(false);
                      startScan();
                    }}
                    className="w-full flex items-center gap-2.5 text-left px-3.5 py-2.5 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                  >
                    <ScanOutlined style={{ fontSize: 16 }} className="text-blue-600" />
                    <span>สแกนคำ</span>
                  </button>
                </div>
              </>
            )}
            {/* Hidden file input for non-secure context scan fallback */}
            {!hasGetUserMedia && (
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
                aria-hidden="true"
              />
            )}
          </div>
        )}

        {/* Committed skill chip (e.g. the "exam" frame for /exam) */}
        {skill && (
          <span className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 px-2.5 py-1 text-sm font-bold text-gray-600 dark:text-gray-300">
            <ThunderboltOutlined style={{ fontSize: 13 }} />
            {skill.replace('/', '')}
          </span>
        )}

        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            skill
              ? 'พิมพ์หัวข้อข้อสอบ (เว้นว่างเพื่อสุ่ม)'
              : placeholder ?? 'ถาม Evely'
          }
          maxLength={500}
          disabled={isLoading || disabled}
          aria-label="Chat message input"
          className="min-w-0 flex-1 text-lg py-1 outline-none bg-transparent text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-600 disabled:cursor-not-allowed font-sans"
        />

        {/* Microphone button — hidden if STT not supported */}
        {sttSupported && (
          <button
            type="button"
            onClick={handleMicClick}
            disabled={disabled}
            aria-label={isListening ? 'Stop recording' : 'Start recording'}
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              isListening
                ? 'bg-red-500 text-white animate-pulse'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'
            }`}
          >
            <AudioOutlined style={{ fontSize: 22 }} />
          </button>
        )}

        {/* Right action: waveform chip when idle, send button once there's content */}
        {skill || inputValue.trim() ? (
          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            aria-label="Send message"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 text-white transition-all duration-200 active:scale-95 cursor-pointer disabled:bg-transparent disabled:text-gray-300 dark:disabled:text-gray-700 disabled:cursor-not-allowed"
          >
            <SendOutlined style={{ fontSize: 18 }} />
          </button>
        ) : (
          <span
            aria-hidden="true"
            className="flex h-12 w-14 shrink-0 items-center justify-center rounded-full bg-[#d3e3fd] dark:bg-[#33415c] text-gray-700 dark:text-gray-200"
          >
            <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
              <rect x="2" y="6" width="2" height="6" rx="1" fill="currentColor" />
              <rect x="8" y="3" width="2" height="12" rx="1" fill="currentColor" />
              <rect x="14" y="6" width="2" height="6" rx="1" fill="currentColor" />
            </svg>
          </span>
        )}
      </div>
    </div>
  );
}
