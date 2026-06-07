'use client';

import { useLanguagePreference } from '@/app/_lib/useLanguagePreference';
import type { PreLoadedLesson } from '../_lib/types';
import { ArrowRightOutlined } from '@ant-design/icons';

interface SmallLessonCardProps {
  lesson: PreLoadedLesson;
  onSelect: (lesson: PreLoadedLesson) => void;
  isCompleted?: boolean;
}

const LEVEL_COLORS: Record<
  string,
  { bg: string; labelTh: string; labelEn: string }
> = {
  beginner: {
    bg: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300',
    labelTh: 'ระดับต้น',
    labelEn: 'Beginner',
  },
  intermediate: {
    bg: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300',
    labelTh: 'ระดับกลาง',
    labelEn: 'Intermediate',
  },
  advanced: {
    bg: 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300',
    labelTh: 'ระดับสูง',
    labelEn: 'Advanced',
  },
};

export default function SmallLessonCard({ lesson, onSelect, isCompleted }: SmallLessonCardProps) {
  const { language } = useLanguagePreference();
  const isThai = language === 'thai';

  const title = isThai ? lesson.titleTh : lesson.titleEn;
  const wordCountText = isThai
    ? `${lesson.wordContext.length} คำศัพท์`
    : `${lesson.wordContext.length} words`;

  const levelInfo = LEVEL_COLORS[lesson.proficiencyLevel] ?? LEVEL_COLORS.beginner;

  return (
    <div
      onClick={() => onSelect(lesson)}
      className="flex items-center justify-between rounded-xl border-3 border-border-color bg-white dark:bg-[#2d2d44] p-3 shadow-nb-sm transition-all duration-100 active:translate-y-[2px] active:translate-x-[2px] active:shadow-none cursor-pointer group"
    >
      <div className="flex flex-col gap-1 min-w-0 flex-1 mr-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h4 className="text-base font-extrabold text-black dark:text-white truncate">
            {title}
          </h4>
          <span className={`inline-block rounded-md px-1.5 py-0.5 text-[10px] font-bold ${levelInfo.bg}`}>
            {isThai ? levelInfo.labelTh : levelInfo.labelEn}
          </span>
          {isCompleted && (
            <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-500/25">
              ✓ {isThai ? 'เรียนแล้ว' : 'Learned'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-white/60">
          <span>{wordCountText}</span>
          <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-700" />
          <span className="truncate max-w-[150px] sm:max-w-[250px]">
            {isThai ? lesson.descriptionTh : lesson.descriptionEn}
          </span>
        </div>
      </div>

      <button
        type="button"
        className="flex items-center justify-center w-8 h-8 rounded-lg border-2 border-border-color bg-accent-yellow text-black shadow-nb-sm transition-transform duration-100 group-hover:-translate-y-0.5 group-active:translate-y-0 cursor-pointer flex-shrink-0"
      >
        <ArrowRightOutlined className="text-sm" />
      </button>
    </div>
  );
}
