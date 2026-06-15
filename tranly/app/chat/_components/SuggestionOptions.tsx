'use client';

import { useRef, useState } from 'react';
import { BulbOutlined, EditOutlined, EnterOutlined } from '@ant-design/icons';
import WordRenderer from '@/app/_components/WordRenderer';

export interface SuggestionOption {
  /** The answer text sent when this option is picked. */
  text: string;
  /** Optional second line (e.g. the Thai translation of a reply). */
  subtext?: string;
}

interface SuggestionOptionsProps {
  /** Quick-reply options the user can tap to answer. */
  options: SuggestionOption[];
  /** Send an answer — either a tapped choice or the user's typed text. */
  onSelect: (text: string) => void;
  /** Skip the suggestions and show the plain input again. */
  onSkip: () => void;
  /** Optional callback to collapse/hide the options panel. */
  onCollapse?: () => void;
  disabled?: boolean;
}

/**
 * Self-contained reply-suggestion panel: three tappable choice rows, a
 * fourth row that turns into an inline text field for a custom answer, and a
 * Skip / Submit footer. Long Thai options wrap instead of being truncated.
 */
export default function SuggestionOptions({
  options,
  onSelect,
  onSkip,
  onCollapse,
  disabled = false,
}: SuggestionOptionsProps) {
  const choices = options.slice(0, 3);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [typing, setTyping] = useState(false);
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  if (choices.length === 0) return null;

  // Pick a choice (does not send — the user confirms with "ส่งคำตอบ").
  const pickChoice = (i: number) => {
    setSelectedIndex(i);
    setTyping(false);
    setText('');
  };

  const startTyping = () => {
    setTyping(true);
    setSelectedIndex(null);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  // The answer to send: typed text when in type mode, else the picked choice.
  const answer = typing ? text.trim() : selectedIndex !== null ? choices[selectedIndex].text : '';

  const submit = () => {
    if (!answer || disabled) return;
    onSelect(answer);
    setSelectedIndex(null);
    setTyping(false);
    setText('');
  };

  // Tappable answer rows with a clean Gemini look.
  const rowBase =
    'flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-left text-base font-medium transition-all';
  const badgeBase =
    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gray-300/60 text-xs font-bold';

  return (
    <div className="px-2 pt-2">
      <div className="mb-2 flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-gray-400">
          <BulbOutlined style={{ fontSize: 15 }} />
          <span>เลือกหรือพิมพ์ตอบได้เลย</span>
        </div>
        {onCollapse && (
          <button
            type="button"
            onClick={onCollapse}
            disabled={disabled}
            className="text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            พับเก็บ
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {choices.map((option, i) => {
          const active = selectedIndex === i;
          return (
            <button
              key={i}
              type="button"
              onClick={() => pickChoice(i)}
              disabled={disabled}
              aria-pressed={active}
              className={`${rowBase} ${
                active
                  ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-[#202124] hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200'
              } ${
                disabled
                  ? 'opacity-50 cursor-not-allowed'
                  : 'cursor-pointer active:scale-[0.99]'
              }`}
            >
              <span className={badgeBase}>{String.fromCharCode(65 + i)}</span>
              <span className="flex min-w-0 flex-col items-start gap-0.5 w-full">
                <span className="leading-tight text-left">
                  <WordRenderer text={option.text} textClassName="leading-tight" />
                </span>
                {option.subtext && (
                  <span className="text-sm font-normal text-gray-500 dark:text-gray-400 text-left">
                    {option.subtext}
                  </span>
                )}
              </span>
            </button>
          );
        })}

        {/* 4th row: inline text field for a custom answer. */}
        {typing ? (
          <div
            className={`${rowBase} border-dashed border-gray-300 dark:border-gray-600 bg-transparent text-gray-800 dark:text-gray-100`}
          >
            <span className={`${badgeBase} text-gray-400`}>D</span>
            <input
              ref={inputRef}
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  submit();
                }
              }}
              maxLength={200}
              disabled={disabled}
              placeholder="พิมพ์คำตอบของคุณ..."
              aria-label="พิมพ์คำตอบเอง"
              className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-gray-400 dark:placeholder:text-gray-600 disabled:cursor-not-allowed"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={startTyping}
            disabled={disabled}
            className={`${rowBase} border-dashed border-gray-300 dark:border-gray-600 bg-transparent text-gray-600 dark:text-gray-400 ${
              disabled
                ? 'opacity-50 cursor-not-allowed'
                : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/40'
            }`}
          >
            <span className={`${badgeBase} text-gray-400`}>D</span>
            <span className="flex items-center gap-1.5">
              <EditOutlined style={{ fontSize: 14 }} />
              พิมพ์คำตอบเอง
            </span>
          </button>
        )}
      </div>

      {/* Skip / Submit footer */}
      <div className="mt-3 flex items-center justify-end gap-2 px-1">
        <button
          type="button"
          onClick={onSkip}
          disabled={disabled}
          className="rounded-xl px-4 py-2 text-sm font-bold text-gray-500 dark:text-gray-400 transition-colors hover:text-gray-800 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          ข้าม
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={disabled || !answer}
          className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          ส่งคำตอบ
          <EnterOutlined style={{ fontSize: 13 }} />
        </button>
      </div>
    </div>
  );
}
