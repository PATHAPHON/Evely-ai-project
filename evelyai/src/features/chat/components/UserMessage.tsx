'use client';

import { useState } from 'react';
import { AlertCircle, CheckCircle2, XCircle, X } from 'lucide-react';
import type { ChatMessage } from '@/shared/types/chatTypes';
import WordRenderer from '@/shared/components/WordRenderer';
import { useStrings } from '@/shared/utils/strings';
import { useShowTranslation } from '@/shared/hooks/useShowTranslation';

export default function UserMessage({
  message,
}: {
  message: ChatMessage;
}) {
  const t = useStrings();
  const { showTranslation } = useShowTranslation();
  const [isExpanded, setIsExpanded] = useState(false);

  // Slash commands are instructions, not language content — render them plain
  // instead of chipping every English word as vocab.
  const isCommand = message.rawText.trimStart().startsWith('/');

  const hasGrammarError = message.grammarCorrect === false;
  const hasFallbackError = Boolean(message.grammarError);

  return (
    <div className="flex justify-end items-start w-full">
      <div className="animate-user-bubble-pop-in max-w-[85%] rounded-[28px] bg-primary-bg/70 text-foreground p-4 px-6 shadow-soft-sm">
        {isCommand ? (
          <div className="text-base text-foreground">
            {message.rawText}
          </div>
        ) : message.isTranslating && !message.englishText ? (
          <div className="flex flex-col gap-2 animate-pulse" aria-hidden="true">
            <div className="flex gap-1.5 flex-wrap">
              <div className="h-6 w-14 rounded-lg bg-foreground/10" />
              <div className="h-6 w-10 rounded-lg bg-foreground/10" />
              <div className="h-6 w-16 rounded-lg bg-foreground/10" />
              <div className="h-6 w-12 rounded-lg bg-foreground/10" />
            </div>
            <div className="h-4 w-3/4 rounded-lg bg-foreground/10" />
            <div className="h-3.5 w-2/3 rounded-lg bg-foreground/10" />
          </div>
        ) : message.englishText ? (
          <div className="flex flex-col gap-1">
            <div className="text-xl font-bold text-foreground flex items-center gap-2 flex-wrap">
              <WordRenderer text={message.englishText} textClassName="text-xl font-bold text-foreground" />
              {message.grammarCorrect === true && !hasFallbackError && (
                <span className="inline-flex items-center" title={t.chat.grammarCorrect}>
                  <CheckCircle2 className="text-correct" size={18} />
                </span>
              )}
              {hasGrammarError && (
                <button
                  type="button"
                  onClick={() => setIsExpanded(!isExpanded)}
                  title={t.chat.grammarErrorHint}
                  aria-label={t.chat.grammarErrorToggleAria}
                  className="inline-flex items-center cursor-pointer text-incorrect hover:text-incorrect transition-colors focus:outline-none"
                >
                  <XCircle size={18} className={`transition-transform duration-200 ${isExpanded ? "scale-110" : ""}`} />
                </button>
              )}
              {hasFallbackError && (
                <button
                  type="button"
                  onClick={() => setIsExpanded(!isExpanded)}
                  title={message.grammarError}
                  aria-label={t.chat.grammarStatusTitle}
                  className="inline-flex items-center cursor-pointer text-amber-500 hover:text-amber-600 transition-colors focus:outline-none"
                >
                  <AlertCircle size={18} className={`transition-transform duration-200 ${isExpanded ? "scale-110" : ""}`} />
                </button>
              )}
            </div>
            {showTranslation && message.translation && (
              <p className="text-sm text-foreground/70 mt-1 leading-relaxed">{message.translation}</p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <div className="text-base text-foreground flex items-center gap-2 flex-wrap">
              <WordRenderer text={message.rawText} textClassName="text-base text-foreground" />
              {hasFallbackError && (
                <button
                  type="button"
                  onClick={() => setIsExpanded(!isExpanded)}
                  title={message.grammarError}
                  aria-label={t.chat.grammarStatusTitle}
                  className="inline-flex items-center cursor-pointer text-amber-500 hover:text-amber-600 transition-colors focus:outline-none"
                >
                  <AlertCircle size={18} className={`transition-transform duration-200 ${isExpanded ? "scale-110" : ""}`} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Grammar Popup Modal */}
      {isExpanded && (hasGrammarError || hasFallbackError) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[1.5px] transition-opacity duration-300"
          onClick={() => setIsExpanded(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-border-color bg-card-bg p-6 shadow-soft-xl transition-all duration-300 transform scale-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className={`font-bold flex items-center gap-2 text-lg ${hasGrammarError ? 'text-incorrect' : 'text-amber-500'}`}>
                <AlertCircle size={20} />
                <span>{hasGrammarError ? t.chat.grammarErrorTitle : t.chat.grammarStatusTitle}</span>
              </div>
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                aria-label={t.chat.closeDetailsAria}
                className="p-1.5 hover:bg-background/85 rounded-full transition-colors cursor-pointer text-foreground/50 hover:text-foreground focus:outline-none"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content for Grammar Correction */}
            {hasGrammarError ? (
              <div className="space-y-4">
                {/* Incorrect Sentence */}
                <div>
                  <p className="text-xs font-semibold text-incorrect uppercase tracking-wider mb-1.5">
                    {t.chat.incorrectSentence}
                  </p>
                  <div className="p-3.5 rounded-2xl bg-incorrect/10 border border-incorrect/25 flex items-start gap-2.5">
                    <XCircle size={18} className="text-incorrect shrink-0 mt-0.5" />
                    <p className="text-base font-semibold text-foreground/90 leading-relaxed break-words line-through decoration-incorrect/60">
                      {message.originalText || message.rawText}
                    </p>
                  </div>
                </div>

                {/* Corrected Sentence */}
                <div>
                  <p className="text-xs font-semibold text-correct uppercase tracking-wider mb-1.5">
                    {t.chat.correctedSentence}
                  </p>
                  <div className="p-3.5 rounded-2xl bg-correct/10 border border-correct/25 flex items-start gap-2.5">
                    <CheckCircle2 size={18} className="text-correct shrink-0 mt-0.5" />
                    <p className="text-base font-bold text-foreground leading-relaxed break-words">
                      {message.correctedText || message.englishText}
                    </p>
                  </div>
                </div>

                {/* Explanation */}
                <div>
                  <p className="text-xs font-semibold text-foreground/55 uppercase tracking-wider mb-1.5">
                    {t.chat.grammarExplanation}
                  </p>
                  <div className="p-4 rounded-2xl bg-card-bg/80 border border-border-color text-sm text-foreground/85 leading-relaxed">
                    {message.grammarNotes || 'แนะนำให้ปรับประโยคตามตัวอย่างที่ถูกต้องด้านบน'}
                  </div>
                </div>
              </div>
            ) : (
              /* Content for Fallback / Service Error */
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-sm text-amber-700 dark:text-amber-300 leading-relaxed">
                  <p className="font-semibold mb-1">{t.chat.grammarCheckUnavailable}</p>
                  <p className="opacity-90">{message.grammarError}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-foreground/45 uppercase tracking-wider mb-1">
                    {t.chat.yourSentence}
                  </p>
                  <p className="text-base font-medium text-foreground leading-relaxed break-words">
                    {message.rawText}
                  </p>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="px-5 py-2.5 rounded-xl bg-background border border-border-color hover:bg-card-bg/60 text-sm font-bold text-foreground transition-colors cursor-pointer focus:outline-none"
              >
                {t.chat.close}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
