'use client';

import { useCallback, useState, type ReactNode } from 'react';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import type { LessonExercise } from '../_lib/lessonTypes';

interface ChoiceExerciseProps {
  exercise: LessonExercise;
  answered: boolean;
  onAnswer: (isCorrect: boolean) => void;
  /** Optional stimulus rendered above the choices (e.g. word card, audio button). */
  header?: ReactNode;
}

/**
 * Shared workhorse for option-based exercises (multiple_choice, fill_blank,
 * listening). Renders a prompt, an optional header stimulus, and a list of
 * tappable choices. Once answered, choices lock and highlight correct/wrong.
 */
export default function ChoiceExercise({
  exercise,
  answered,
  onAnswer,
  header,
}: ChoiceExerciseProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const options = exercise.options ?? [];
  const answerIndex = exercise.answerIndex ?? -1;

  const handleSelect = useCallback(
    (index: number) => {
      if (answered) return;
      setSelectedIndex(index);
      onAnswer(index === answerIndex);
    },
    [answered, answerIndex, onAnswer]
  );

  return (
    <div className="flex flex-col gap-4">
      {exercise.prompt && (
        <p className="text-base font-bold text-text-primary">
          {exercise.prompt}
        </p>
      )}

      {header}

      <div className="flex flex-col gap-3">
        {options.map((option, index) => {
          const isCorrectOption = index === answerIndex;
          const isSelected = index === selectedIndex;

          let stateClasses =
            'bg-card-bg text-text-primary shadow-nb-md active:translate-x-[2px] active:translate-y-[2px] active:shadow-nb-sm';

          if (answered) {
            if (isCorrectOption) {
              stateClasses =
                'bg-accent-green text-white shadow-nb-sm translate-x-[2px] translate-y-[2px]';
            } else if (isSelected) {
              stateClasses =
                'bg-accent-red text-white shadow-nb-sm translate-x-[2px] translate-y-[2px]';
            } else {
              stateClasses =
                'bg-card-bg text-text-secondary opacity-60 shadow-nb-md';
            }
          }

          return (
            <button
              key={index}
              type="button"
              onClick={() => handleSelect(index)}
              disabled={answered}
              className={`flex items-center justify-between gap-3 w-full rounded-xl border-3 border-border-color px-4 py-3 text-left text-base font-semibold transition-all ${
                answered ? 'cursor-default' : 'cursor-pointer'
              } ${stateClasses}`}
            >
              <span className="flex-1">{option}</span>
              {answered && isCorrectOption && (
                <CheckOutlined style={{ fontSize: 18 }} />
              )}
              {answered && isSelected && !isCorrectOption && (
                <CloseOutlined style={{ fontSize: 18 }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
