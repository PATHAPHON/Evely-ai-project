'use client';

import { useStrings } from '@/app/_lib/strings';
import type { QuestionBankSetMeta } from '../../_lib/topik/types';
import { ArrowRightOutlined } from '@ant-design/icons';
import { useLanguagePreference } from '@/app/_lib/useLanguagePreference';

interface SmallQuestionBankCardProps {
  set: QuestionBankSetMeta;
  onTap: (examId: string) => void;
  isCompleted?: boolean;
}

/**
 * Renders a small, compact mock exam card designed for vertical lists.
 * Shows name, question count, difficulty badge, and a start button.
 */
export default function SmallQuestionBankCard({ set, onTap, isCompleted }: SmallQuestionBankCardProps) {
  const strings = useStrings();
  const { language } = useLanguagePreference();
  const isThai = language === 'thai';

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

  const isTopik1 = set.examType === 'topik1';
  const badgeColor = isTopik1
    ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300'
    : 'bg-cyan-50 text-cyan-600 dark:bg-cyan-950/40 dark:text-cyan-300';

  const levelText = isTopik1 ? 'TOPIK I' : 'TOPIK II';

  return (
    <div
      onClick={() => onTap(set.id)}
      className="flex items-center justify-between rounded-xl border-3 border-border-color bg-white dark:bg-[#2d2d44] p-3 shadow-nb-sm transition-all duration-100 active:translate-y-[2px] active:translate-x-[2px] active:shadow-none cursor-pointer group"
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h4 className="text-base font-extrabold text-black dark:text-white group-hover:text-accent-pink transition-colors">
            {name}
          </h4>
          <span className={`inline-block rounded-md px-1.5 py-0.5 text-[10px] font-bold ${badgeColor}`}>
            {levelText}
          </span>
          {isCompleted && (
            <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-500/25">
              ✓ {isThai ? 'ทำแล้ว' : 'Completed'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-white/60">
          <span>{questionCount}</span>
          <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-700" />
          <span>{difficulty}</span>
        </div>
      </div>

      <button
        type="button"
        className="flex items-center justify-center w-8 h-8 rounded-lg border-2 border-border-color bg-accent-yellow text-black shadow-nb-sm transition-transform duration-100 group-hover:-translate-y-0.5 group-active:translate-y-0 cursor-pointer"
      >
        <ArrowRightOutlined className="text-sm" />
      </button>
    </div>
  );
}
