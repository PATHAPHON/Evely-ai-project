'use client';

export const dynamic = 'force-dynamic';

import { useCallback, useEffect, useRef, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useLanguagePreference } from '@/app/_lib/useLanguagePreference';
import { useActiveLanguage } from '@/app/_lib/ActiveLanguageContext';
import LessonCatalog from './_components/LessonCatalog';
import ChatWithLesson from './_components/ChatWithLesson';
import { getLessonsByLanguage, fetchLessonsByLanguage } from './_lib/lessonCatalogData';
import { koreanLessons } from './_lib/lessonCatalogData';
import type { LessonCategoryGroup, PreLoadedLesson } from './_lib/types';

type ViewState = 'catalog' | 'chatting';

/**
 * Main page for AI Chat with Lessons.
 *
 * State machine:
 * - 'catalog': shows page header, StatsBar, and LessonCatalog
 * - 'chatting': shows back button and ChatWithLesson component
 *
 * Transitions:
 * - catalog → chatting: user selects a lesson (slide in from right)
 * - chatting → catalog: user ends chat (slide in from left)
 */
export function ChatLessonsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { language } = useLanguagePreference();
  const isThai = language === 'thai';
  const { activeLanguage } = useActiveLanguage();

  const [view, setView] = useState<ViewState>('catalog');
  const [selectedLesson, setSelectedLesson] = useState<PreLoadedLesson | null>(null);
  const [groups, setGroups] = useState<LessonCategoryGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Track whether the component has mounted (skip initial animation)
  const hasMounted = useRef(false);
  // Track transition direction: 'forward' = catalog→chatting, 'backward' = chatting→catalog
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  // Controls animation trigger
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    hasMounted.current = true;
  }, []);

  // If a lessonId is provided via query param, auto-start the chat
  const lessonIdParam = searchParams.get('lessonId');
  const hasAutoStarted = useRef(false);
  useEffect(() => {
    if (lessonIdParam && !hasAutoStarted.current && groups.length > 0) {
      hasAutoStarted.current = true;
      const allLessons = groups.flatMap((g) => g.lessons);
      const lesson = allLessons.find((l) => l.id === lessonIdParam);
      if (lesson) {
        setSelectedLesson(lesson);
        setView('chatting');
      }
    }
  }, [lessonIdParam, groups]);

  // Load lessons whenever the active language changes
  useEffect(() => {
    let active = true;
    setIsLoading(true);
    fetchLessonsByLanguage(activeLanguage).then((lessonGroups) => {
      if (active) {
        setGroups(lessonGroups);
        setIsLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [activeLanguage]);

  // Trigger enter animation when view changes (skip on initial mount)
  useEffect(() => {
    if (!hasMounted.current) return;
    setIsAnimating(true);
    const timer = setTimeout(() => setIsAnimating(false), 300);
    return () => clearTimeout(timer);
  }, [view]);

  // Handle lesson selection: transition to chatting view
  const handleSelectLesson = useCallback((lesson: PreLoadedLesson) => {
    setSelectedLesson(lesson);
    setDirection('forward');
    setView('chatting');
  }, []);

  // Handle end chat: transition back to catalog view
  const handleEndChat = useCallback(() => {
    if (lessonIdParam) {
      router.push('/home');
    } else {
      setDirection('backward');
      setView('catalog');
      // Delay clearing the lesson so the exit animation can reference it
      setTimeout(() => setSelectedLesson(null), 300);
    }
  }, [router, lessonIdParam]);

  // Handle back button behavior:
  // - In catalog view: navigate back to /home
  // - In chatting view: return to catalog (or go home if auto-started)
  const handleBack = useCallback(() => {
    if (view === 'chatting') {
      if (lessonIdParam) {
        router.push('/home');
      } else {
        setDirection('backward');
        setView('catalog');
        setTimeout(() => setSelectedLesson(null), 300);
      }
    } else {
      router.push('/home');
    }
  }, [view, router, lessonIdParam]);

  // Compute animation class for the active view
  const getAnimationClass = () => {
    if (!isAnimating) return 'translate-x-0 opacity-100';
    if (direction === 'forward') {
      // Entering from right (catalog→chatting)
      return view === 'chatting'
        ? 'animate-slide-in-right'
        : 'animate-slide-out-left';
    }
    // Entering from left (chatting→catalog)
    return view === 'catalog'
      ? 'animate-slide-in-left'
      : 'animate-slide-out-right';
  };

  return (
    <div className="flex flex-col h-dvh dot-grid-bg overflow-hidden">
      {/* Transition animation styles */}
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(30px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideInLeft {
          from { transform: translateX(-30px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in-right {
          animation: slideInRight 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
        }
        .animate-slide-in-left {
          animation: slideInLeft 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-slide-in-right,
          .animate-slide-in-left {
            animation: none !important;
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>

      {view === 'catalog' ? (
        <div className={`flex flex-col flex-1 min-h-0 ${getAnimationClass()}`}>
          {/* Page header with back button and bilingual title */}
          <div className="flex items-center justify-between px-4 pt-2 pb-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleBack}
                className="flex h-9 w-9 items-center justify-center rounded-xl border-3 border-border-color bg-card-bg shadow-nb-sm transition-all active:translate-x-[1px] active:translate-y-[1px] active:shadow-none cursor-pointer"
                aria-label={isThai ? 'กลับ' : 'Back'}
              >
                <ArrowLeftOutlined style={{ fontSize: 16 }} />
              </button>
              <div>
                <h1 className="text-lg font-black text-text-primary leading-tight">
                  {isThai ? 'บทเรียนสนทนา' : 'Chat Lessons'}
                </h1>
                <p className="text-xs font-semibold text-text-secondary">
                  {isThai ? 'Chat Lessons' : 'บทเรียนสนทนา'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => router.push('/backoffice')}
              className="flex h-9 items-center gap-1.5 px-3 rounded-xl border-3 border-border-color bg-accent-yellow text-black shadow-nb-sm transition-all active:translate-x-[1px] active:translate-y-[1px] active:shadow-none font-bold text-xs cursor-pointer"
              title={isThai ? 'ตั้งค่าบทสนทนา' : 'Script Settings'}
            >
              <span>⚙️ {isThai ? 'ตั้งค่าบทสนทนา' : 'Settings'}</span>
            </button>
          </div>

          {/* Lesson catalog */}
          <main className="flex-1 overflow-y-auto px-4 pb-6">
            <LessonCatalog
              groups={groups}
              onSelectLesson={handleSelectLesson}
              isLoading={isLoading}
            />
          </main>
        </div>
      ) : (
        <div className={`flex flex-col flex-1 min-h-0 ${getAnimationClass()}`}>
          {/* Chatting view header with back button */}
          <div className="flex items-center gap-3 px-4 pt-6 pb-2">
            <button
              type="button"
              onClick={handleBack}
              className="flex h-9 w-9 items-center justify-center rounded-xl border-3 border-border-color bg-card-bg shadow-nb-sm transition-all active:translate-x-[1px] active:translate-y-[1px] active:shadow-none cursor-pointer"
              aria-label={isThai ? 'กลับไปรายการบทเรียน' : 'Back to lessons'}
            >
              <ArrowLeftOutlined style={{ fontSize: 16 }} />
            </button>
            <h1 className="text-base font-black text-text-primary truncate">
              {isThai ? selectedLesson?.titleTh : selectedLesson?.titleEn}
            </h1>
          </div>

          {/* Chat component */}
          {selectedLesson && (
            <ChatWithLesson lesson={selectedLesson} onEndChat={handleEndChat} />
          )}
        </div>
      )}
    </div>
  );
}

export default function ChatLessonsPage() {
  return (
    <Suspense fallback={null}>
      <ChatLessonsContent />
    </Suspense>
  );
}
