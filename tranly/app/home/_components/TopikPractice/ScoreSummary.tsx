'use client';

import { useStrings } from '@/app/_lib/strings';
import type { ExamResult } from '../../_lib/topik/types';

interface ScoreSummaryProps {
  result: ExamResult;
  onRetry: () => void;
  onChangeType: () => void;
}

/**
 * Displays the exam score summary after completion.
 * Shows total score prominently with reading/listening breakdown.
 * Uses neubrutalism card style and supports dark mode.
 *
 * Requirements: 5.1 (total score), 5.2 (reading/listening breakdown), 5.3 (correct/incorrect per question)
 */
export default function ScoreSummary({ result, onRetry, onChangeType }: ScoreSummaryProps) {
  const strings = useStrings();

  const readingTotal = result.answers.filter((a) => a.questionType === 'reading').length;
  const listeningTotal = result.answers.filter((a) => a.questionType === 'listening').length;

  return (
    <div className="flex flex-col gap-4">
      {/* Score Card */}
      <div className="rounded-2xl border-3 border-border-color bg-white dark:bg-[#2d2d44] p-6 shadow-nb-sm text-center">
        {/* Title */}
        <h2 className="text-lg font-bold text-black dark:text-white mb-4">
          {strings.topik.scoreTitle}
        </h2>

        {/* Total Score */}
        <p className="text-5xl font-bold text-black dark:text-white mb-6">
          {strings.topik.scoreTotal(result.totalScore, result.totalQuestions)}
        </p>

        {/* Reading / Listening Breakdown */}
        <div className="flex justify-center gap-6">
          {/* Reading Score */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-sm text-gray-500 dark:text-white/60">
              {strings.topik.readingScore}
            </span>
            <span className="text-xl font-bold text-black dark:text-white">
              {result.readingScore}/{readingTotal}
            </span>
          </div>

          {/* Divider */}
          <div className="w-px bg-border-color" />

          {/* Listening Score */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-sm text-gray-500 dark:text-white/60">
              {strings.topik.listeningScore}
            </span>
            <span className="text-xl font-bold text-black dark:text-white">
              {result.listeningScore}/{listeningTotal}
            </span>
          </div>
        </div>
      </div>

      {/* Question Results Grid */}
      <div className="rounded-2xl border-3 border-border-color bg-white dark:bg-[#2d2d44] p-4 shadow-nb-sm">
        <div className="grid grid-cols-2 gap-2">
          {result.answers.map((answer, index) => (
            <div
              key={answer.questionId}
              className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2 ${
                answer.isCorrect
                  ? 'border-green-400 bg-green-50 dark:bg-green-900/20'
                  : 'border-red-400 bg-red-50 dark:bg-red-900/20'
              }`}
            >
              <span className="text-sm font-bold text-black dark:text-white">
                {index + 1}.
              </span>
              {answer.isCorrect ? (
                <span className="text-green-600 dark:text-green-400 font-bold">
                  ✓ {strings.topik.correct}
                </span>
              ) : (
                <span className="text-red-600 dark:text-red-400 font-bold">
                  ✗ {strings.topik.incorrect}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onRetry}
          className="flex-1 rounded-2xl border-3 border-border-color bg-white dark:bg-[#2d2d44] p-3 shadow-nb-sm font-bold text-black dark:text-white transition-all duration-100 active:translate-y-[2px] active:shadow-[1px_1px_0_var(--shadow-color)] cursor-pointer"
        >
          {strings.topik.retry}
        </button>
        <button
          type="button"
          onClick={onChangeType}
          className="flex-1 rounded-2xl border-3 border-border-color bg-white dark:bg-[#2d2d44] p-3 shadow-nb-sm font-bold text-black dark:text-white transition-all duration-100 active:translate-y-[2px] active:shadow-[1px_1px_0_var(--shadow-color)] cursor-pointer"
        >
          {strings.topik.changeType}
        </button>
      </div>
    </div>
  );
}
