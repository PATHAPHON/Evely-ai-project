'use client';

import { useLanguagePreference } from '@/app/_lib/useLanguagePreference';
import type { PreLoadedLesson } from '../_lib/types';
import {
  ArrowRightOutlined,
  SmileOutlined,
  TeamOutlined,
  CompassOutlined,
  CarOutlined,
  CoffeeOutlined,
  HeartOutlined,
  ShoppingOutlined,
  CloudOutlined,
  BookOutlined,
} from '@ant-design/icons';

interface LargeLessonCardProps {
  lesson: PreLoadedLesson;
  onSelect: (lesson: PreLoadedLesson) => void;
  isCompleted?: boolean;
}

const ICON_MAP: Record<string, React.ComponentType<{ style?: React.CSSProperties }>> = {
  SmileOutlined,
  TeamOutlined,
  CompassOutlined,
  CarOutlined,
  CoffeeOutlined,
  HeartOutlined,
  ShoppingOutlined,
  CloudOutlined,
  BookOutlined,
};

const LEVEL_COLORS: Record<
  string,
  { bg: string; text: string; border: string; labelTh: string; labelEn: string; gradient: string }
> = {
  beginner: {
    bg: 'bg-emerald-100 dark:bg-emerald-950/60',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-300 dark:border-emerald-800',
    labelTh: 'ระดับต้น',
    labelEn: 'Beginner',
    gradient: 'from-[#e6fcf5] via-[#f4fbf7] to-[#e6fcf5] dark:from-[#1b3c33] dark:via-[#152e27] dark:to-[#1b3c33]',
  },
  intermediate: {
    bg: 'bg-amber-100 dark:bg-amber-950/60',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-300 dark:border-amber-800',
    labelTh: 'ระดับกลาง',
    labelEn: 'Intermediate',
    gradient: 'from-[#fff9db] via-[#fffcf0] to-[#fff9db] dark:from-[#3e341b] dark:via-[#312a17] dark:to-[#3e341b]',
  },
  advanced: {
    bg: 'bg-rose-100 dark:bg-rose-950/60',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-300 dark:border-rose-800',
    labelTh: 'ระดับสูง',
    labelEn: 'Advanced',
    gradient: 'from-[#fff0f6] via-[#fff5f8] to-[#fff0f6] dark:from-[#442c34] dark:via-[#352229] dark:to-[#482836]',
  },
};

export default function LargeLessonCard({ lesson, onSelect, isCompleted }: LargeLessonCardProps) {
  const { language } = useLanguagePreference();
  const isThai = language === 'thai';

  const title = isThai ? lesson.titleTh : lesson.titleEn;
  const wordCountText = isThai
    ? `${lesson.wordContext.length} คำศัพท์`
    : `${lesson.wordContext.length} vocabulary words`;

  const levelInfo = LEVEL_COLORS[lesson.proficiencyLevel] ?? LEVEL_COLORS.beginner;
  const IconComponent = ICON_MAP[lesson.icon] ?? BookOutlined;

  return (
    <div
      onClick={() => onSelect(lesson)}
      className={`relative w-full h-[190px] rounded-2xl border-3 border-border-color bg-gradient-to-br ${levelInfo.gradient} p-5 shadow-nb-md text-left transition-all duration-150 active:translate-y-[2px] active:translate-x-[2px] active:shadow-nb-sm cursor-pointer overflow-hidden flex flex-col justify-between group`}
    >
      {/* Background Watermark Icon */}
      <div className="absolute right-2 bottom-2 text-[100px] leading-none text-black/5 dark:text-white/5 pointer-events-none transition-transform duration-300 group-hover:scale-110">
        <IconComponent />
      </div>

      {/* Header Badge Row */}
      <div className="flex items-center justify-between z-10 w-full">
        <div className="flex items-center gap-2">
          <span className={`inline-block rounded-lg px-2.5 py-0.5 text-xs font-bold border-2 ${levelInfo.bg} ${levelInfo.text} ${levelInfo.border}`}>
            {isThai ? levelInfo.labelTh : levelInfo.labelEn}
          </span>
          {isCompleted && (
            <span className="inline-flex items-center gap-1 rounded-lg border-2 border-emerald-500 bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
              ✓ {isThai ? 'เรียนแล้ว' : 'Learned'}
            </span>
          )}
        </div>
        <span className="text-xs font-semibold text-gray-500 dark:text-white/60 bg-white/70 dark:bg-black/20 px-2 py-0.5 rounded-md">
          {isThai ? 'บทเรียนทักทาย' : 'Lesson'}
        </span>
      </div>

      {/* Title & Description */}
      <div className="z-10 mt-2 flex-1 flex flex-col justify-center min-w-0">
        <h3 className="text-xl font-black text-black dark:text-white leading-snug tracking-tight truncate">
          {title}
        </h3>
        <p className="text-xs font-medium text-gray-500 dark:text-white/60 mt-1 truncate">
          {isThai ? lesson.descriptionTh : lesson.descriptionEn}
        </p>
        <p className="text-sm font-bold text-gray-600 dark:text-white/75 mt-0.5">
          {wordCountText}
        </p>
      </div>

      {/* Footer / CTA */}
      <div className="z-10 flex items-center justify-between mt-2">
        <span className="text-[11px] font-bold text-gray-400 dark:text-white/40 tracking-wider">
          #TRANLY_CHAT
        </span>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-xl border-2 border-border-color bg-accent-yellow px-3 py-1 text-xs font-black text-black shadow-nb-sm transition-transform duration-100 group-hover:-translate-y-0.5 group-active:translate-y-0 cursor-pointer"
        >
          {isThai ? 'เริ่มบทเรียน' : 'Start Lesson'}
          <ArrowRightOutlined className="text-xs" />
        </button>
      </div>
    </div>
  );
}
