'use client';

import { useStrings } from '@/app/_lib/strings';
import type { QuestionBankSetMeta } from '../../_lib/topik/types';

interface QuestionBankCardProps {
  set: QuestionBankSetMeta;
  onTap: (examId: string) => void;
}

/**
 * Renders a single question bank exam set as a tappable neubrutalism card.
 * Displays the localized exam set name, question count badge, and difficulty label.
 * All text is sourced from useStrings() for Thai/English localization.
 */
export default function QuestionBankCard({ set, onTap }: QuestionBankCardProps) {
  const strings = useStrings();

  // Extract set number from nameKey (e.g. "set1" -> 1)
  const setNumber = parseInt(set.nameKey.replace('set', ''), 10);
  const name = strings.topik.setName(setNumber);
  const questionCount = strings.topik.questionsCount(set.questionCount);

  // Map difficultyKey to the localized difficulty string
  const difficultyMap: Record<string, string> = {
    beginner: strings.topik.difficultyBeginner,
    intermediate: strings.topik.difficultyIntermediate,
    advanced: strings.topik.difficultyAdvanced,
  };
  const difficulty = difficultyMap[set.difficultyKey] ?? set.difficultyKey;

  return (
    <button
      type="button"
      onClick={() => onTap(set.id)}
      className="flex flex-col items-start rounded-2xl border-3 border-border-color bg-white dark:bg-[#2d2d44] p-4 shadow-nb-sm text-left transition-all duration-100 active:translate-y-[2px] active:shadow-none cursor-pointer"
    >
      <p className="text-base font-bold text-black dark:text-white">{name}</p>
      <span className="mt-2 inline-block rounded-lg bg-accent-pink-bg px-2 py-0.5 text-xs font-medium text-black dark:text-white">
        {questionCount}
      </span>
      <p className="mt-1 text-xs text-gray-500 dark:text-white/60">
        {difficulty}
      </p>
    </button>
  );
}
