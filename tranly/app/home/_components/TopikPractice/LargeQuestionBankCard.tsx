'use client';

import { useStrings } from '@/app/_lib/strings';
import type { QuestionBankSetMeta } from '../../_lib/topik/types';
import { ArrowRightOutlined, StarFilled, TrophyOutlined } from '@ant-design/icons';
import { useLanguagePreference } from '@/app/_lib/useLanguagePreference';

interface LargeQuestionBankCardProps {
  set: QuestionBankSetMeta;
  onTap: (examId: string) => void;
  isCompleted?: boolean;
}

/**
 * Renders a large mock exam card designed for horizontal scroll.
 * Features a rich gradient background, dynamic badge, question count, and a prominent start button.
 */
export default function LargeQuestionBankCard({ set, onTap, isCompleted }: LargeQuestionBankCardProps) {
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

  // Curated premium gradients based on examType (TOPIK I vs II)
  const isTopik1 = set.examType === 'topik1';
  const gradientClass = isTopik1
    ? 'from-[#ffe8ec] via-[#fff0f3] to-[#ffe5ec] dark:from-[#442c34] dark:via-[#352229] dark:to-[#482836]'
    : 'from-[#e3fafc] via-[#e8f7ff] to-[#e6fcff] dark:from-[#1b323c] dark:via-[#162731] dark:to-[#1e343e]';

  const badgeColor = isTopik1
    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300 dark:border-rose-800'
    : 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300 border-cyan-300 dark:border-cyan-800';

  const levelTag = isTopik1 ? 'TOPIK I' : 'TOPIK II';

  return (
    <div
      onClick={() => onTap(set.id)}
      className={`relative w-full h-[190px] rounded-2xl border-3 border-border-color bg-gradient-to-br ${gradientClass} p-5 shadow-nb-md text-left transition-all duration-150 active:translate-y-[2px] active:translate-x-[2px] active:shadow-nb-sm cursor-pointer overflow-hidden flex flex-col justify-between group`}
    >
      {/* Decorative semi-transparent background icon for visual interest */}
      <div className="absolute right-2 bottom-2 text-[100px] leading-none text-black/5 dark:text-white/5 pointer-events-none transition-transform duration-300 group-hover:scale-110">
        {isTopik1 ? <StarFilled /> : <TrophyOutlined />}
      </div>

      {/* Header section with level tag and difficulty */}
      <div className="flex items-center justify-between z-10 w-full">
        <div className="flex items-center gap-2">
          <span className={`inline-block rounded-lg px-2.5 py-0.5 text-xs font-bold border-2 ${badgeColor}`}>
            {levelTag}
          </span>
          {isCompleted && (
            <span className="inline-flex items-center gap-1 rounded-lg border-2 border-emerald-500 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
              ✓ {isThai ? 'ทำแล้ว' : 'Completed'}
            </span>
          )}
        </div>
        <span className="text-xs font-semibold text-gray-500 dark:text-white/60 bg-white/70 dark:bg-black/20 px-2 py-0.5 rounded-md">
          {difficulty}
        </span>
      </div>

      {/* Title & info section */}
      <div className="z-10 mt-3 flex-1 flex flex-col justify-center">
        <h3 className="text-xl font-black text-black dark:text-white leading-snug tracking-tight">
          {name}
        </h3>
        <p className="mt-1 text-sm font-medium text-gray-600 dark:text-white/75">
          {questionCount}
        </p>
      </div>

      {/* Action footer */}
      <div className="z-10 flex items-center justify-between mt-2">
        <span className="text-[11px] font-bold text-gray-400 dark:text-white/40 tracking-wider">
          #TRANLY_MOCK
        </span>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-xl border-2 border-border-color bg-accent-yellow px-3 py-1 text-xs font-black text-black shadow-nb-sm transition-transform duration-100 group-hover:-translate-y-0.5 group-active:translate-y-0 cursor-pointer"
        >
          {strings.topik.startExam}
          <ArrowRightOutlined className="text-xs" />
        </button>
      </div>
    </div>
  );
}
