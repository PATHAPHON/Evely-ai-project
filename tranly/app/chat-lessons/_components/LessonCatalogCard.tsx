'use client';

import type { ReactNode } from 'react';
import {
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
import type { PreLoadedLesson } from '../_lib/types';
import { useLanguagePreference } from '@/app/_lib/useLanguagePreference';

interface LessonCatalogCardProps {
  lesson: PreLoadedLesson;
  onSelect: (lesson: PreLoadedLesson) => void;
}

/**
 * Map of Ant Design icon names (strings) to their React component.
 * Covers all icons used in the lesson catalog data.
 */
const ICON_MAP: Record<string, ReactNode> = {
  SmileOutlined: <SmileOutlined style={{ fontSize: 22 }} />,
  TeamOutlined: <TeamOutlined style={{ fontSize: 22 }} />,
  CompassOutlined: <CompassOutlined style={{ fontSize: 22 }} />,
  CarOutlined: <CarOutlined style={{ fontSize: 22 }} />,
  CoffeeOutlined: <CoffeeOutlined style={{ fontSize: 22 }} />,
  HeartOutlined: <HeartOutlined style={{ fontSize: 22 }} />,
  ShoppingOutlined: <ShoppingOutlined style={{ fontSize: 22 }} />,
  CloudOutlined: <CloudOutlined style={{ fontSize: 22 }} />,
  BookOutlined: <BookOutlined style={{ fontSize: 22 }} />,
};

/** Accent color per proficiency level for the level badge. */
const LEVEL_BADGE_STYLES: Record<
  string,
  { bg: string; text: string; labelTh: string; labelEn: string }
> = {
  beginner: {
    bg: 'bg-accent-green',
    text: 'text-white',
    labelTh: 'เริ่มต้น',
    labelEn: 'Beginner',
  },
  intermediate: {
    bg: 'bg-accent-yellow',
    text: 'text-black',
    labelTh: 'กลาง',
    labelEn: 'Intermediate',
  },
  advanced: {
    bg: 'bg-accent-red',
    text: 'text-white',
    labelTh: 'สูง',
    labelEn: 'Advanced',
  },
};

/**
 * A neobrutalist lesson card showing title, level badge, description, and category icon.
 * When clicked, calls `onSelect` with the lesson data.
 */
export default function LessonCatalogCard({ lesson, onSelect }: LessonCatalogCardProps) {
  const { language } = useLanguagePreference();
  const isThai = language === 'thai';

  const title = isThai ? lesson.titleTh : lesson.titleEn;
  const description = isThai ? lesson.descriptionTh : lesson.descriptionEn;
  const levelBadge = LEVEL_BADGE_STYLES[lesson.proficiencyLevel] ?? LEVEL_BADGE_STYLES.beginner;
  const icon = ICON_MAP[lesson.icon] ?? <BookOutlined style={{ fontSize: 22 }} />;

  return (
    <button
      type="button"
      onClick={() => onSelect(lesson)}
      className="flex items-start gap-3 w-full rounded-2xl border-3 border-border-color bg-card-bg p-4 text-left shadow-nb-md transition-all cursor-pointer hover:bg-gray-50 dark:hover:bg-[#3d3d5c] active:translate-x-[2px] active:translate-y-[2px] active:shadow-nb-sm"
    >
      {/* Category icon */}
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-3 border-border-color bg-accent-blue text-white shadow-nb-sm">
        {icon}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-1 min-w-0">
        {/* Title + Badge row */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-base font-bold text-text-primary truncate">
            {title}
          </span>
          <span
            className={`inline-block rounded-lg border-2 border-border-color px-2 py-0.5 text-xs font-bold ${levelBadge.bg} ${levelBadge.text}`}
          >
            {isThai ? levelBadge.labelTh : levelBadge.labelEn}
          </span>
        </div>

        {/* Description */}
        <p className="text-sm text-text-secondary line-clamp-2">
          {description}
        </p>
      </div>
    </button>
  );
}
