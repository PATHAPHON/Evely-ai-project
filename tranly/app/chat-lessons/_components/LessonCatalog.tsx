'use client';

import { useState, useRef, useEffect } from 'react';
import { BookOutlined } from '@ant-design/icons';
import type { LessonCategoryGroup, PreLoadedLesson } from '../_lib/types';
import { useLanguagePreference } from '@/app/_lib/useLanguagePreference';
import LargeLessonCard from './LargeLessonCard';
import SmallLessonCard from './SmallLessonCard';
import { useConversationHistory } from '@/app/chat/_lib/useConversationHistory';

interface LessonCatalogProps {
  groups: LessonCategoryGroup[];
  onSelectLesson: (lesson: PreLoadedLesson) => void;
  isLoading?: boolean;
}

/** Skeleton placeholder cards matching the LessonCatalogCard shape. */
function SkeletonCards() {
  return (
    <div className="flex flex-col gap-4">
      {/* Skeleton category header */}
      <div className="h-5 w-28 animate-pulse rounded bg-gray-200 dark:bg-[#4a4a6a]" />

      {/* Skeleton cards */}
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex items-start gap-3 w-full rounded-2xl border-3 border-border-color bg-card-bg p-4 shadow-nb-md"
        >
          {/* Icon placeholder */}
          <div className="h-11 w-11 shrink-0 animate-pulse rounded-xl border-3 border-border-color bg-gray-200 dark:bg-[#4a4a6a] shadow-nb-sm" />

          {/* Content placeholder */}
          <div className="flex flex-1 flex-col gap-2 min-w-0">
            <div className="flex items-center gap-2">
              <div className="h-4 w-2/5 animate-pulse rounded bg-gray-200 dark:bg-[#4a4a6a]" />
              <div className="h-5 w-14 animate-pulse rounded-lg border-2 border-border-color bg-gray-200 dark:bg-[#4a4a6a]" />
            </div>
            <div className="h-3 w-4/5 animate-pulse rounded bg-gray-200 dark:bg-[#4a4a6a]" />
            <div className="h-3 w-3/5 animate-pulse rounded bg-gray-200 dark:bg-[#4a4a6a]" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Renders the full lesson catalog: grouped or filtered with featured sliders
 * and small vertical list cards matching the mock exam UI.
 */
export default function LessonCatalog({ groups, onSelectLesson, isLoading }: LessonCatalogProps) {
  const { language } = useLanguagePreference();
  const isThai = language === 'thai';

  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [activeLargeIndex, setActiveLargeIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { sessions, loadSessions } = useConversationHistory();

  useEffect(() => {
    loadSessions().catch(() => {});
  }, [loadSessions]);

  const isLessonCompleted = (lesson: PreLoadedLesson) => {
    return sessions.some((session) => session.completed && session.goal === lesson.goal);
  };

  // Loading state
  if (isLoading) {
    return <SkeletonCards />;
  }

  // Empty state
  if (groups.length === 0) {
    return (
      <div className="mt-12 flex flex-col items-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-3 border-border-color bg-accent-blue/10 shadow-nb-sm">
          <BookOutlined style={{ fontSize: 28 }} className="text-accent-blue" />
        </div>
        <p className="text-base font-bold text-text-secondary">
          {isThai
            ? 'ยังไม่มีบทเรียนสำหรับภาษานี้'
            : 'No lessons available for this language yet'}
        </p>
        <p className="text-sm text-text-secondary/70">
          {isThai
            ? 'บทเรียนใหม่กำลังจะมาเร็วๆ นี้!'
            : 'New lessons are coming soon!'}
        </p>
      </div>
    );
  }

  // Generate dynamic filters based on groups
  const filters = [
    { value: 'all', label: isThai ? 'ทั้งหมด' : 'All' },
    ...groups.map((g) => ({
      value: g.category,
      label: isThai ? g.labelTh : g.labelEn,
    })),
  ];

  // Filter lessons based on active filter
  const visibleLessons =
    activeFilter === 'all'
      ? groups.flatMap((g) => g.lessons)
      : groups.find((g) => g.category === activeFilter)?.lessons ?? [];

  const largeLessonsCount = Math.min(3, visibleLessons.length);
  const largeLessons = visibleLessons.slice(0, largeLessonsCount);
  const smallLessons = visibleLessons.slice(largeLessonsCount);

  // Handle filter switching and reset scroll/index state
  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter);
    setActiveLargeIndex(0);
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = 0;
    }
  };

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, clientWidth } = scrollRef.current;
    if (clientWidth === 0) return;
    const index = Math.round(scrollLeft / clientWidth);
    if (index !== activeLargeIndex) {
      setActiveLargeIndex(index);
    }
  };

  const scrollToCard = (index: number) => {
    if (!scrollRef.current) return;
    const { clientWidth } = scrollRef.current;
    scrollRef.current.scrollTo({
      left: index * clientWidth,
      behavior: 'smooth',
    });
    setActiveLargeIndex(index);
  };

  return (
    <div className="flex flex-col gap-5">
      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .dot-transition {
          transition: width 0.45s cubic-bezier(0.34, 1.56, 0.64, 1), background-color 0.3s ease, transform 0.2s ease;
        }
        .dot-transition:active {
          transform: scale(0.9);
        }
      `}</style>

      {/* Categories filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar -mx-4 px-4">
        {filters.map((filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => handleFilterChange(filter.value)}
            className={`rounded-xl border-3 px-4 py-1.5 text-sm font-bold transition-all cursor-pointer flex-shrink-0 ${
              activeFilter === filter.value
                ? 'bg-accent-pink-bg border-border-color text-black dark:text-white shadow-nb-sm'
                : 'border-border-color bg-white dark:bg-[#2d2d44] text-gray-500 dark:text-white/60'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Large Slidable Lesson Cards */}
      {largeLessons.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black tracking-widest text-gray-500 dark:text-white/50 uppercase">
              {isThai ? 'บทเรียนแนะนำ (เลื่อนได้) ➔' : 'Featured Lessons (Swipe) ➔'}
            </h3>
            <span className="text-[11px] font-bold text-gray-400 dark:text-white/30">
              {largeLessons.length} {isThai ? 'บทเรียน' : 'lessons'}
            </span>
          </div>

          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex overflow-x-auto pb-2 no-scrollbar -mx-4 px-4 snap-x snap-mandatory scroll-smooth"
            style={{
              scrollSnapType: 'x mandatory',
            }}
          >
            {largeLessons.map((lesson) => (
              <div
                key={lesson.id}
                className="w-full flex-shrink-0 px-2 snap-center snap-always"
              >
                <LargeLessonCard
                  lesson={lesson}
                  onSelect={onSelectLesson}
                  isCompleted={isLessonCompleted(lesson)}
                />
              </div>
            ))}
          </div>

          {/* Dots Indicators */}
          {largeLessons.length > 1 && (
            <div className="flex justify-center gap-2 mt-1">
              {largeLessons.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => scrollToCard(index)}
                  className={`h-2.5 rounded-full dot-transition cursor-pointer ${
                    activeLargeIndex === index
                      ? 'w-6 bg-black dark:bg-white shadow-nb-sm border border-black dark:border-white/10'
                      : 'w-2.5 bg-gray-300 dark:bg-gray-700'
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Small / Vertical stacked Lesson Cards */}
      {smallLessons.length > 0 && (
        <div className="flex flex-col gap-3 mt-1">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/10 pb-1.5 mt-2">
            <h3 className="text-xs font-black tracking-widest text-gray-500 dark:text-white/50 uppercase">
              {isThai ? 'บทเรียนทั้งหมด' : 'All Lessons'}
            </h3>
            <span className="text-[11px] font-bold text-gray-400 dark:text-white/30">
              {smallLessons.length} {isThai ? 'บทเรียน' : 'lessons'}
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {smallLessons.map((lesson) => (
              <SmallLessonCard
                key={lesson.id}
                lesson={lesson}
                onSelect={onSelectLesson}
                isCompleted={isLessonCompleted(lesson)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

