'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CategoryFilter from './CategoryFilter';
import LargeQuestionBankCard from './LargeQuestionBankCard';
import SmallQuestionBankCard from './SmallQuestionBankCard';
import { filterSets } from '../../_lib/topik/filterSets';
import type { FilterValue, QuestionBankSetMeta } from '../../_lib/topik/types';
import { useLanguagePreference } from '@/app/_lib/useLanguagePreference';
import { supabase } from '@/app/_lib/supabaseClient';
import { useUserProfile } from '@/app/_lib/useUserProfile';

/**
 * Renders the question bank grid with category filter chips.
 * The first 3 items are rendered as a single large, horizontally scrollable card
 * with pagination dot indicators, while the rest are rendered as smaller cards stacked vertically.
 */
export default function QuestionBankGrid() {
  const [activeFilter, setActiveFilter] = useState<FilterValue>('all');
  const router = useRouter();
  const { language } = useLanguagePreference();
  const isThai = language === 'thai';

  const { completedExams } = useUserProfile();
  const [examSets, setExamSets] = useState<QuestionBankSetMeta[]>([]);
  const [isSetsLoading, setIsSetsLoading] = useState(true);

  // Fetch exam sets dynamically from Supabase topik_exam_sets table
  useEffect(() => {
    const fetchExamSets = async () => {
      setIsSetsLoading(true);
      try {
        const { data, error } = await supabase
          .from('topik_exam_sets')
          .select('*')
          .order('created_at', { ascending: true });

        if (error) throw error;

        if (data && data.length > 0) {
          // Map DB rows to QuestionBankSetMeta shape
          const mapped: QuestionBankSetMeta[] = data.map((row, index) => ({
            id: row.id,
            examType: row.exam_type as 'topik1' | 'topik2',
            // Derive a stable nameKey from the ID for localization (e.g. 'topik1-set-3' -> 'set3')
            nameKey: row.id.replace(/^topik[12]-/, '').replace(/-/g, '') || `set${index + 1}`,
            questionCount: 10, // Each set is always 10 questions (5 reading + 5 listening)
            difficultyKey: row.difficulty,
          }));
          setExamSets(mapped);
        }
      } catch (err) {
        console.error('Failed to load exam sets from Supabase:', err);
        // No fallback needed; empty state handled gracefully below
      } finally {
        setIsSetsLoading(false);
      }
    };

    fetchExamSets();
  }, []);

  const visibleSets = filterSets(examSets, activeFilter);

  const handleCardTap = (examId: string) => {
    router.push(`/topik/${examId}`);
  };

  // Select the first 3 items as large slider sets, and the rest as small vertical sets
  const largeSetsCount = Math.min(3, visibleSets.length);
  const largeSets = visibleSets.slice(0, largeSetsCount);
  const smallSets = visibleSets.slice(largeSetsCount);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeLargeIndex, setActiveLargeIndex] = useState(0);

  // Handle category filter changes and reset carousel state
  const handleFilterChange = (filter: FilterValue) => {
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

      <CategoryFilter
        activeFilter={activeFilter}
        onFilterChange={handleFilterChange}
      />

      {/* Loading skeleton while fetching exam sets */}
      {isSetsLoading && (
        <div className="flex flex-col gap-3">
          <div className="h-[190px] w-full rounded-2xl border-3 border-border-color bg-gray-100 dark:bg-gray-800 animate-pulse" />
          <div className="h-14 w-full rounded-xl border-3 border-border-color bg-gray-100 dark:bg-gray-800 animate-pulse" />
          <div className="h-14 w-full rounded-xl border-3 border-border-color bg-gray-100 dark:bg-gray-800 animate-pulse" />
        </div>
      )}

      {/* Large / Slidable mock exams section */}
      {!isSetsLoading && largeSets.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black tracking-widest text-gray-500 dark:text-white/50 uppercase">
              {isThai ? 'ข้อสอบแนะนำ (เลื่อนได้) ➔' : 'Featured Exams (Swipe) ➔'}
            </h3>
            <span className="text-[11px] font-bold text-gray-400 dark:text-white/30">
              {largeSets.length} {isThai ? 'ชุด' : 'sets'}
            </span>
          </div>

          {/* Carousel container displaying exactly one card at a time */}
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex overflow-x-auto pb-2 no-scrollbar -mx-4 px-4 snap-x snap-mandatory scroll-smooth"
            style={{
              scrollSnapType: 'x mandatory',
            }}
          >
            {largeSets.map((set) => (
              <div
                key={set.id}
                className="w-full flex-shrink-0 px-2 snap-center snap-always"
              >
                <LargeQuestionBankCard
                  set={set}
                  onTap={handleCardTap}
                  isCompleted={completedExams.includes(set.id)}
                />
              </div>
            ))}
          </div>

          {/* Pagination Indicators */}
          {largeSets.length > 1 && (
            <div className="flex justify-center gap-2 mt-1">
              {largeSets.map((_, index) => (
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

      {/* Small / Vertical mock exams section */}
      {smallSets.length > 0 && (
        <div className="flex flex-col gap-3 mt-1">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/10 pb-1.5 mt-2">
            <h3 className="text-xs font-black tracking-widest text-gray-500 dark:text-white/50 uppercase">
              {isThai ? 'ข้อสอบทั้งหมด' : 'All Exam Sets'}
            </h3>
            <span className="text-[11px] font-bold text-gray-400 dark:text-white/30">
              {smallSets.length} {isThai ? 'ชุด' : 'sets'}
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {smallSets.map((set) => (
              <SmallQuestionBankCard
                key={set.id}
                set={set}
                onTap={handleCardTap}
                isCompleted={completedExams.includes(set.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


