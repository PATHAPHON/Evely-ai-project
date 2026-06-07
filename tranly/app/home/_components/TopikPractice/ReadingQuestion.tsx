'use client';

import { useState } from 'react';
import type { TopikQuestion } from '../../_lib/topik/types';
import { useStrings } from '@/app/_lib/strings';

interface ReadingQuestionProps {
  question: TopikQuestion;
  questionNumber: number;
  totalQuestions: number;
  onAnswer: (selectedIndex: number) => void;
}

/**
 * Displays a TOPIK reading question with:
 * - Korean passage in a distinct card
 * - Question prompt
 * - 4 clickable answer choices with selection highlight
 *
 * Korean content stays in Korean regardless of language setting.
 * UI labels use useStrings() for localization.
 */
export default function ReadingQuestion({
  question,
  questionNumber,
  totalQuestions,
  onAnswer,
}: ReadingQuestionProps) {
  const strings = useStrings();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  function handleSelect(index: number) {
    setSelectedIndex(index);
  }

  function handleSubmit() {
    if (selectedIndex !== null) {
      onAnswer(selectedIndex);
      setSelectedIndex(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Section label and progress */}
      <div className="flex items-center justify-between">
        <span className="rounded-lg border-2 border-border-color bg-accent-blue/10 px-2.5 py-1 text-xs font-bold text-accent-blue">
          {strings.topik.reading}
        </span>
        <span className="text-sm font-bold text-text-secondary">
          {strings.topik.questionOf(questionNumber, totalQuestions)}
        </span>
      </div>

      {/* Passage card */}
      <div className="rounded-2xl border-3 border-border-color bg-card-bg p-4 shadow-nb-sm">
        <p className="text-base leading-relaxed text-text-primary whitespace-pre-wrap">
          {question.passage}
        </p>
      </div>

      {/* Question prompt */}
      <p className="text-lg font-bold text-text-primary">
        {question.question}
      </p>

      {/* Answer choices */}
      <div className="flex flex-col gap-3">
        {question.choices.map((choice, index) => {
          const isSelected = index === selectedIndex;
          return (
            <button
              key={index}
              type="button"
              onClick={() => handleSelect(index)}
              className={`w-full rounded-xl border-3 px-4 py-3 text-left text-base font-medium transition-all cursor-pointer ${
                isSelected
                  ? 'border-accent-blue bg-accent-blue/10 shadow-nb-sm translate-x-[1px] translate-y-[1px]'
                  : 'border-border-color bg-card-bg shadow-nb-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none'
              }`}
            >
              <span className="flex items-center gap-3">
                <span
                  className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${
                    isSelected
                      ? 'border-accent-blue bg-accent-blue text-white'
                      : 'border-border-color text-text-primary'
                  }`}
                >
                  {index + 1}
                </span>
                <span className="text-text-primary">{choice}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Submit button */}
      <button
        type="button"
        disabled={selectedIndex === null}
        onClick={handleSubmit}
        className={`mt-2 w-full rounded-xl border-3 py-4 text-base font-extrabold uppercase tracking-wider transition-all ${
          selectedIndex !== null
            ? 'border-border-color bg-accent-green text-white shadow-nb-md active:translate-x-[2px] active:translate-y-[2px] active:shadow-nb-sm cursor-pointer'
            : 'border-border-color/30 bg-card-bg text-text-secondary cursor-not-allowed opacity-50'
        }`}
      >
        {strings.topik.next}
      </button>
    </div>
  );
}
