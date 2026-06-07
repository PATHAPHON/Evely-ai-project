'use client';

import { useStrings } from '@/app/_lib/strings';

interface ExamHeaderProps {
  examName: string;
  currentQuestion: number;
  totalQuestions: number;
  isCompleted: boolean;
  onBack: () => void;
}

/**
 * Sticky exam page header with back navigation, exam name, and progress indicator.
 * Uses neubrutalism styling consistent with the rest of the TopikPractice UI.
 * All labels are localized via useStrings().
 */
export default function ExamHeader({
  examName,
  currentQuestion,
  totalQuestions,
  isCompleted,
  onBack,
}: ExamHeaderProps) {
  const strings = useStrings();

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b-3 border-border-color bg-white px-4 py-3 dark:bg-[#1a1a2e]">
      <button
        type="button"
        onClick={onBack}
        aria-label={strings.topik.examPageBack}
        className="flex items-center gap-1 text-sm font-semibold text-black dark:text-white"
      >
        <span aria-hidden="true">←</span>
        {strings.topik.examPageBack}
      </button>

      <h1 className="absolute left-1/2 -translate-x-1/2 text-base font-bold text-black dark:text-white">
        {examName}
      </h1>

      {!isCompleted && (
        <span className="text-sm font-medium text-gray-500 dark:text-white/60">
          {strings.topik.progress(currentQuestion, totalQuestions)}
        </span>
      )}

      {isCompleted && <span className="w-10" />}
    </header>
  );
}
