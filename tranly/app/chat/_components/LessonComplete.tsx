'use client';

import { ReadOutlined } from '@ant-design/icons';
import { useLanguagePreference } from '@/app/_lib/useLanguagePreference';

interface LessonCompleteProps {
  score: number;
  total: number;
  onNewLesson: () => void;
}

/**
 * End-of-lesson summary screen showing the score and a button to start a new
 * lesson.
 */
export default function LessonComplete({
  score,
  total,
  onNewLesson,
}: LessonCompleteProps) {
  const { language } = useLanguagePreference();
  const isThai = language === 'thai';

  const percent = total > 0 ? Math.round((score / total) * 100) : 0;
  const isGreat = percent >= 80;

  const headline = isGreat
    ? isThai
      ? 'เยี่ยมมาก!'
      : 'Great job!'
    : isThai
      ? 'จบบทเรียนแล้ว!'
      : 'Lesson complete!';

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <div className="text-6xl">{isGreat ? '🏆' : '✨'}</div>

      <h2 className="text-2xl font-extrabold text-text-primary">{headline}</h2>

      <div className="flex flex-col items-center rounded-2xl border-3 border-border-color bg-card-bg px-10 py-6 shadow-nb-md">
        <span className="text-sm font-bold uppercase tracking-wider text-text-secondary">
          {isThai ? 'คะแนน' : 'Score'}
        </span>
        <span className="text-4xl font-extrabold text-accent-green">
          {score}/{total}
        </span>
        <span className="mt-1 text-sm font-semibold text-text-secondary">
          {percent}%
        </span>
      </div>

      <button
        type="button"
        onClick={onNewLesson}
        className="flex items-center justify-center gap-2 rounded-xl border-3 border-border-color bg-accent-green px-8 py-3 text-base font-bold uppercase tracking-wider text-white shadow-nb-md transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-nb-sm cursor-pointer"
      >
        <ReadOutlined style={{ fontSize: 18 }} />
        {isThai ? 'บทเรียนใหม่' : 'New Lesson'}
      </button>
    </div>
  );
}
