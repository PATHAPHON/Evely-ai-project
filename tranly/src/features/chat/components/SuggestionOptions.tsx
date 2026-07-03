'use client';

import { useRef, useState } from 'react';
import { Lightbulb, Pencil, CornerDownLeft } from 'lucide-react';
import WordRenderer from '@/shared/components/WordRenderer';
import { useStrings } from '@/shared/utils/strings';

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
  const t = useStrings();
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
    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border-color text-xs font-bold text-foreground/70';

  return (
    <div className="px-2 pt-2">
      <div className="mb-2 flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5 text-sm font-medium text-foreground/60">
          <Lightbulb size={15} />
          <span>{t.chat.suggestPrompt}</span>
        </div>
        {onCollapse && (
          <button
            type="button"
            onClick={onCollapse}
            disabled={disabled}
            className="text-xs text-primary hover:text-primary-hover font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t.chat.collapse}
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
                  ? 'border-primary bg-primary-bg text-primary'
                  : 'border-border-color bg-background hover:bg-card-bg/60 text-foreground'
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
                  <span className="text-sm font-normal text-foreground/60 text-left">
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
            className={`${rowBase} border-dashed border-border-color bg-transparent text-foreground`}
          >
            <span className={`${badgeBase} text-foreground/40`}>D</span>
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
              placeholder={t.chat.customAnswerPlaceholder}
              aria-label={t.chat.customAnswerAria}
              className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-foreground/40 disabled:cursor-not-allowed"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={startTyping}
            disabled={disabled}
            className={`${rowBase} border-dashed border-border-color bg-transparent text-foreground/70 ${
              disabled
                ? 'opacity-50 cursor-not-allowed'
                : 'cursor-pointer hover:bg-card-bg/50'
            }`}
          >
            <span className={`${badgeBase} text-foreground/40`}>D</span>
            <span className="flex items-center gap-1.5">
              <Pencil size={14} />
              {t.chat.customAnswerBtn}
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
          className="rounded-xl px-4 py-2 text-sm font-bold text-foreground/60 transition-colors hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {t.chat.skip}
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={disabled || !answer}
          className="flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2 text-sm font-bold text-white dark:text-gray-900 transition-colors hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          {t.chat.submitAnswer}
          <CornerDownLeft size={13} />
        </button>
      </div>
    </div>
  );
}
