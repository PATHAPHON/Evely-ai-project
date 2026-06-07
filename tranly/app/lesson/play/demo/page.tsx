'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useLanguagePreference } from '@/app/_lib/useLanguagePreference';
import type { LessonExercise } from '@/app/chat/_lib/lessonTypes';
import LessonPlayer from '@/app/chat/_components/LessonPlayer';
import ImageChoiceMock from './_components/ImageChoiceMock';
import CompleteMock from './_components/CompleteMock';

/**
 * Static demo of the lesson player. Drives the real `LessonPlayer` /
 * `LessonComplete` components with hard-coded dummy exercises — no AI call and
 * no sessionStorage — so the full UI (every exercise type + loading/error/
 * complete states) can be reviewed in one place. The real `/lesson/play` page
 * is untouched.
 */

// Dummy lesson covering all four exercise types.
const DEMO_LESSON: LessonExercise[] = [
  {
    id: 'demo-mc',
    type: 'multiple_choice',
    prompt: 'คำว่า "안녕하세요" แปลว่าอะไร?',
    korean: '안녕하세요',
    reading: 'อันนยอง-ฮาเซโย',
    translation: 'สวัสดี (แบบสุภาพ)',
    options: ['ขอบคุณ', 'สวัสดี', 'ลาก่อน', 'ขอโทษ'],
    answerIndex: 1,
  },
  {
    id: 'demo-fill',
    type: 'fill_blank',
    prompt: 'เติมคำในช่องว่าง: "저는 학생___"  (ฉันเป็นนักเรียน)',
    korean: '저는 학생___',
    reading: 'ชอนึน ฮักแซง-...',
    translation: 'ฉันเป็นนักเรียน',
    options: ['이에요', '예요', '이야', '입니까'],
    answerIndex: 0,
  },
  {
    id: 'demo-listening',
    type: 'listening',
    prompt: 'ฟังเสียงแล้วเลือกคำที่ถูกต้อง',
    korean: '감사합니다',
    reading: 'คัมซา-ฮัมนีดา',
    translation: 'ขอบคุณ',
    options: ['감사합니다', '미안합니다', '괜찮아요', '반갑습니다'],
    answerIndex: 0,
  },
  {
    id: 'demo-matching',
    type: 'matching',
    prompt: 'จับคู่คำเกาหลีกับคำแปลให้ถูกต้อง',
    pairs: [
      { korean: '물', reading: 'mul', thai: 'น้ำ' },
      { korean: '밥', reading: 'bap', thai: 'ข้าว' },
      { korean: '책', reading: 'chaek', thai: 'หนังสือ' },
      { korean: '집', reading: 'jip', thai: 'บ้าน' },
    ],
  },
];

type DemoState =
  | 'loading'
  | 'error'
  | 'multiple_choice'
  | 'fill_blank'
  | 'listening'
  | 'matching'
  | 'complete';

const STATE_LABELS: { key: DemoState; th: string; en: string }[] = [
  { key: 'loading', th: 'กำลังโหลด', en: 'Loading' },
  { key: 'error', th: 'ผิดพลาด', en: 'Error' },
  { key: 'multiple_choice', th: 'เลือกตอบ', en: 'Multiple choice' },
  { key: 'fill_blank', th: 'เติมคำ', en: 'Fill blank' },
  { key: 'listening', th: 'ฟังเสียง', en: 'Listening' },
  { key: 'matching', th: 'จับคู่', en: 'Matching' },
  { key: 'complete', th: 'จบบทเรียน', en: 'Complete' },
];

export default function LessonPlayDemoPage() {
  const router = useRouter();
  const { language } = useLanguagePreference();
  const isThai = language === 'thai';

  const [state, setState] = useState<DemoState>('multiple_choice');

  // Map the selected state to the exercise the player should render.
  const exerciseIndex = DEMO_LESSON.findIndex((ex) => ex.type === state);
  const exercise = exerciseIndex >= 0 ? DEMO_LESSON[exerciseIndex] : null;

  const isLoading = state === 'loading';
  const error = state === 'error' ? (isThai ? 'สร้างบทเรียนไม่สำเร็จ ลองอีกครั้งนะ' : 'Failed to generate lesson. Please try again.') : null;

  return (
    <div className="flex h-dvh flex-col dot-grid-bg">
      {/* Header — matches the real /lesson/play page */}
      <div className="flex items-center gap-3 p-[20px_16px_12px]">
        <button
          type="button"
          onClick={() => router.push('/chat')}
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
          <span className="ml-2 rounded-md border-2 border-border-color bg-accent-yellow px-1.5 py-0.5 align-middle text-[11px] font-extrabold uppercase tracking-wide text-black">
            demo
          </span>
        </div>
      </div>

      {/* Demo-only state switcher */}
      <div className="flex flex-wrap gap-2 px-4 pb-2">
        {STATE_LABELS.map(({ key, th, en }) => {
          const active = state === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setState(key)}
              className={`rounded-lg border-3 border-border-color px-2.5 py-1 text-xs font-bold shadow-nb-sm transition-all active:translate-x-[1px] active:translate-y-[1px] active:shadow-none cursor-pointer ${
                active
                  ? 'bg-accent-blue text-white'
                  : 'bg-card-bg text-text-primary'
              }`}
            >
              {isThai ? th : en}
            </button>
          );
        })}
      </div>

      <main className="flex flex-1 flex-col overflow-hidden">
        {state === 'multiple_choice' ? (
          <ImageChoiceMock />
        ) : state === 'complete' ? (
          <CompleteMock onRestart={() => setState('multiple_choice')} />
        ) : (
          <LessonPlayer
            // key forces a fresh mount per state so internal feedback resets.
            key={state}
            exercise={exercise}
            currentIndex={exerciseIndex >= 0 ? exerciseIndex : 0}
            total={DEMO_LESSON.length}
            isLoading={isLoading}
            error={error}
            onAnswer={() => {}}
            onNext={() => {
              // Advance to the next exercise type, or finish the demo.
              const next = exerciseIndex + 1;
              if (next >= DEMO_LESSON.length) {
                setState('complete');
              } else {
                setState(DEMO_LESSON[next].type as DemoState);
              }
            }}
            onRetry={() => setState('multiple_choice')}
          />
        )}
      </main>
    </div>
  );
}
