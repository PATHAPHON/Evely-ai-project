'use client';

import { useStrings } from '@/app/_lib/strings';
import type { TopikExamType } from '../../_lib/topik/types';

interface ExamTypeSelectorProps {
  onSelect: (examType: TopikExamType) => void;
}

/**
 * Displays two neubrutalism-styled cards for choosing TOPIK I or TOPIK II.
 * All UI text comes from useStrings() for Thai/English localization.
 * Difficulty levels are shown for each option per Requirement 2.3.
 */
export default function ExamTypeSelector({ onSelect }: ExamTypeSelectorProps) {
  const strings = useStrings();

  return (
    <div className="flex flex-col gap-4">
      {/* Heading */}
      <h2 className="text-lg font-bold text-black dark:text-white text-center">
        {strings.topik.selectType}
      </h2>

      {/* TOPIK I Card */}
      <button
        type="button"
        onClick={() => onSelect('topik1')}
        className="w-full rounded-2xl border-3 border-border-color bg-white dark:bg-[#2d2d44] p-5 shadow-nb-sm text-left transition-all duration-100 active:translate-y-[2px] active:shadow-[1px_1px_0_var(--shadow-color)] cursor-pointer"
      >
        <p className="text-xl font-bold text-black dark:text-white">
          {strings.topik.topik1Label}
        </p>
        <p className="text-sm text-gray-500 dark:text-white/60 mt-1">
          {strings.topik.topik1Desc}
        </p>
      </button>

      {/* TOPIK II Card */}
      <button
        type="button"
        onClick={() => onSelect('topik2')}
        className="w-full rounded-2xl border-3 border-border-color bg-white dark:bg-[#2d2d44] p-5 shadow-nb-sm text-left transition-all duration-100 active:translate-y-[2px] active:shadow-[1px_1px_0_var(--shadow-color)] cursor-pointer"
      >
        <p className="text-xl font-bold text-black dark:text-white">
          {strings.topik.topik2Label}
        </p>
        <p className="text-sm text-gray-500 dark:text-white/60 mt-1">
          {strings.topik.topik2Desc}
        </p>
      </button>
    </div>
  );
}
