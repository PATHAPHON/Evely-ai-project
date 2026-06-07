'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useLanguagePreference } from '@/app/_lib/useLanguagePreference';
import { takePendingLesson } from '@/app/_lib/pendingLesson';
import { useLessonSession } from '@/app/chat/_lib/useLessonSession';
import LessonPlayer from '@/app/chat/_components/LessonPlayer';
import LessonComplete from '@/app/chat/_components/LessonComplete';

/**
 * Standalone page that plays a lesson configured by the AI guide on `/chat`.
 * It reads the queued LessonConfig from sessionStorage, generates the lesson via
 * the existing `useLessonSession` engine, and renders the shared player/summary.
 */
export default function LessonPlayPage() {
  const router = useRouter();
  const { language } = useLanguagePreference();
  const isThai = language === 'thai';
  const lesson = useLessonSession();

  // null = still reading; false = nothing queued; true = a lesson was started.
  const [hasConfig, setHasConfig] = useState<boolean | null>(null);
  const [isVisualLoading, setIsVisualLoading] = useState(true);
  const startedRef = useRef(false);
  const lessonLoadStartRef = useRef<number | null>(null);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    // The queued config lives in sessionStorage, so it can only be read on the
    // client after mount — doing it here (rather than in render) keeps the
    // first client render identical to the server's and avoids a hydration
    // mismatch. The one-time setState below is that client-only handoff.
    const config = takePendingLesson();
    setHasConfig(config !== null);
    if (config) {
      lessonLoadStartRef.current = Date.now();
      void lesson.startLesson(config);
    }
  }, [lesson]);

  // Ensure minimum loading duration of 3.2s so the cinematic animations play beautifully
  useEffect(() => {
    if (hasConfig && lesson.status !== 'loading' && lesson.status !== 'idle') {
      const start = lessonLoadStartRef.current;
      if (start) {
        const elapsed = Date.now() - start;
        const MIN_DURATION = 3200;
        if (elapsed < MIN_DURATION) {
          const remaining = MIN_DURATION - elapsed;
          const timer = setTimeout(() => {
            setIsVisualLoading(false);
          }, remaining);
          return () => clearTimeout(timer);
        }
      }
      setIsVisualLoading(false);
    }
  }, [hasConfig, lesson.status]);

  const goToChat = () => router.push('/chat');

  return (
    <div className="flex h-dvh flex-col dot-grid-bg">
      {/* Header */}
      <div className="flex items-center gap-3 p-[20px_16px_12px]">
        <button
          type="button"
          onClick={goToChat}
          aria-label={isThai ? 'กลับ' : 'Back'}
          className="flex h-10 w-10 items-center justify-center rounded-xl border-3 border-border-color bg-card-bg shadow-nb-sm transition-all duration-100 active:translate-y-[2px] active:shadow-[1px_1px_0_var(--shadow-color)] cursor-pointer text-text-primary"
        >
          <ArrowLeftOutlined style={{ fontSize: 18 }} />
        </button>
        <div
          className="font-extrabold text-[22px] tracking-tight leading-[1.1] text-text-primary"
          style={{ fontFamily: 'var(--font-outfit), sans-serif' }}
        >
          {isThai ? 'บทเรียน' : 'Lesson'}
        </div>
      </div>

      <main className="flex flex-1 flex-col overflow-hidden">
        {hasConfig === false ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="text-5xl">📚</div>
            <p className="text-base font-bold text-text-primary">
              {isThai ? 'ยังไม่มีบทเรียน' : 'No lesson queued'}
            </p>
            <p className="text-sm text-text-secondary">
              {isThai
                ? 'เริ่มสร้างบทเรียนใหม่ผ่าน AI ได้ที่หน้าแชท'
                : 'Start a new lesson from the AI chat page.'}
            </p>
            <button
              type="button"
              onClick={goToChat}
              className="rounded-xl border-3 border-border-color bg-accent-green px-6 py-3 text-base font-bold text-white shadow-nb-md transition-all cursor-pointer active:translate-x-[2px] active:translate-y-[2px] active:shadow-nb-sm"
            >
              {isThai ? 'ไปหน้าแชท AI' : 'Go to AI Chat'}
            </button>
          </div>
        ) : lesson.status === 'complete' ? (
          <LessonComplete
            score={lesson.score}
            total={lesson.total}
            onNewLesson={goToChat}
          />
        ) : (
          <LessonPlayer
            exercise={lesson.currentExercise}
            currentIndex={lesson.currentIndex}
            total={lesson.total}
            isLoading={isVisualLoading || hasConfig === null}
            error={lesson.status === 'error' ? lesson.error : null}
            onAnswer={lesson.submitAnswer}
            onNext={lesson.nextExercise}
            onRetry={lesson.retry}
          />
        )}
      </main>
    </div>
  );
}
