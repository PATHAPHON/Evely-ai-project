'use client';

import { useCallback, useState } from 'react';
import { SoundOutlined } from '@ant-design/icons';
import { useLanguagePreference } from '@/app/_lib/useLanguagePreference';
import { useTTS } from '../_lib/useTTS';
import type { LessonExercise } from '../_lib/lessonTypes';
import ChoiceExercise from './ChoiceExercise';
import MatchingExercise from './MatchingExercise';

interface LessonPlayerProps {
  exercise: LessonExercise | null;
  currentIndex: number;
  total: number;
  isLoading: boolean;
  error: string | null;
  onAnswer: (isCorrect: boolean) => void;
  onNext: () => void;
  onRetry: () => void;
}

/**
 * Plays a single lesson exercise: progress bar, the exercise itself, an
 * immediate correct/incorrect feedback banner, and a Next button. Also renders
 * the loading and error states for lesson generation.
 */
export default function LessonPlayer({
  exercise,
  currentIndex,
  total,
  isLoading,
  error,
  onAnswer,
  onNext,
  onRetry,
}: LessonPlayerProps) {
  const { language } = useLanguagePreference();
  const isThai = language === 'thai';
  const { speak } = useTTS('ko-KR');

  // Feedback is keyed to the exercise id so it resets automatically when the
  // exercise changes — no effect needed.
  const [feedback, setFeedback] = useState<{
    id: string;
    correct: boolean;
  } | null>(null);
  const answered = feedback !== null && feedback.id === exercise?.id;
  const wasCorrect = answered && feedback.correct;

  const handleAnswer = useCallback(
    (isCorrect: boolean) => {
      if (!exercise) return;
      setFeedback({ id: exercise.id, correct: isCorrect });
      onAnswer(isCorrect);
    },
    [exercise, onAnswer]
  );

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-border-color border-t-[#52C41A]" />
        <p className="text-base font-bold text-text-primary">
          {isThai ? 'กำลังสร้างบทเรียน...' : 'Generating lesson...'}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
        <p className="text-center text-base font-bold text-[#FF4D4F]">{error}</p>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-xl border-3 border-border-color bg-[#52C41A] px-6 py-3 text-base font-bold text-white shadow-[4px_4px_0_#000000] dark:shadow-[4px_4px_0_rgba(0,0,0,0.4)] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_#000000] dark:active:shadow-[2px_2px_0_rgba(0,0,0,0.4)] cursor-pointer"
        >
          {isThai ? 'ลองอีกครั้ง' : 'Try Again'}
        </button>
      </div>
    );
  }

  if (!exercise) return null;

  const playButton = exercise.korean ? (
    <button
      type="button"
      onClick={() => speak(exercise.korean as string)}
      aria-label={isThai ? 'เล่นเสียง' : 'Play audio'}
      className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl border-3 border-border-color bg-[#4096FF] text-white shadow-[4px_4px_0_#000000] dark:shadow-[4px_4px_0_rgba(0,0,0,0.4)] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_#000000] dark:active:shadow-[2px_2px_0_rgba(0,0,0,0.4)] cursor-pointer"
    >
      <SoundOutlined style={{ fontSize: 32 }} />
    </button>
  ) : null;

  // Build the stimulus header per exercise type.
  let header: React.ReactNode = null;
  if (exercise.type === 'listening') {
    header = playButton;
  } else if (exercise.korean) {
    // multiple_choice / fill_blank: show the Korean prompt word/sentence.
    header = (
      <div className="rounded-xl border-3 border-border-color bg-card-bg p-4 text-center shadow-[4px_4px_0_#000000] dark:shadow-[4px_4px_0_rgba(0,0,0,0.4)]">
        <p className="text-2xl font-extrabold text-text-primary">
          {exercise.korean}
        </p>
        {exercise.reading && (
          <p className="mt-1 text-sm text-text-secondary">{exercise.reading}</p>
        )}
      </div>
    );
  }

  const correctAnswerText =
    exercise.options && exercise.answerIndex !== undefined
      ? exercise.options[exercise.answerIndex]
      : '';

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Progress bar */}
      <div className="px-4 pt-3">
        <div className="flex items-center gap-3">
          <div className="h-3 flex-1 overflow-hidden rounded-full border-3 border-border-color bg-card-bg">
            <div
              className="h-full bg-[#52C41A] transition-all duration-300"
              style={{
                width: `${total > 0 ? ((currentIndex + (answered ? 1 : 0)) / total) * 100 : 0}%`,
              }}
            />
          </div>
          <span className="text-sm font-bold text-text-primary">
            {currentIndex + 1}/{total}
          </span>
        </div>
      </div>

      {/* Exercise body */}
      <div className="flex-1 overflow-y-auto p-4">
        {exercise.type === 'matching' ? (
          <MatchingExercise
            key={exercise.id}
            exercise={exercise}
            answered={answered}
            onAnswer={handleAnswer}
          />
        ) : (
          <ChoiceExercise
            key={exercise.id}
            exercise={exercise}
            answered={answered}
            onAnswer={handleAnswer}
            header={header}
          />
        )}
      </div>

      {/* Feedback + Next */}
      {answered && (
        <div
          className={`border-t-3 border-border-color p-4 ${
            wasCorrect
              ? 'bg-[#52C41A]/15 dark:bg-[#52C41A]/25'
              : 'bg-[#FF4D4F]/15 dark:bg-[#FF4D4F]/25'
          }`}
        >
          <p
            className={`text-base font-extrabold ${
              wasCorrect ? 'text-[#389E0D]' : 'text-[#CF1322]'
            }`}
          >
            {wasCorrect
              ? isThai
                ? 'ถูกต้อง! 🎉'
                : 'Correct! 🎉'
              : isThai
                ? 'ยังไม่ถูก'
                : 'Not quite'}
          </p>
          {!wasCorrect && correctAnswerText && (
            <p className="mt-1 text-sm font-semibold text-text-primary">
              {isThai ? 'คำตอบที่ถูก: ' : 'Correct answer: '}
              {correctAnswerText}
            </p>
          )}
          {exercise.type !== 'matching' && (exercise.reading || exercise.translation) && (
            <p className="mt-1 text-sm text-text-secondary font-medium">
              {exercise.korean ? `${exercise.korean} ` : ''}
              {exercise.reading ? `(${exercise.reading}) ` : ''}
              {exercise.translation ? `— ${exercise.translation}` : ''}
            </p>
          )}
          <button
            type="button"
            onClick={onNext}
            className="mt-3 w-full rounded-xl border-3 border-border-color bg-[#52C41A] py-3 text-base font-bold uppercase tracking-wider text-white shadow-[4px_4px_0_#000000] dark:shadow-[4px_4px_0_rgba(0,0,0,0.4)] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_#000000] dark:active:shadow-[2px_2px_0_rgba(0,0,0,0.4)] cursor-pointer"
          >
            {currentIndex + 1 >= total
              ? isThai
                ? 'ดูผลลัพธ์'
                : 'See Results'
              : isThai
                ? 'ถัดไป'
                : 'Next'}
          </button>
        </div>
      )}
    </div>
  );
}
