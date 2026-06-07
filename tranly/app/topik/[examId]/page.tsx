'use client';

import React, { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useStrings } from '@/app/_lib/strings';
import { useTopikExam } from '@/app/home/_lib/topik/useTopikExam';
import type { TopikExamType } from '@/app/home/_lib/topik/types';
import ExamHeader from '@/app/home/_components/TopikPractice/ExamHeader';
import ReadingQuestion from '@/app/home/_components/TopikPractice/ReadingQuestion';
import ListeningQuestion from '@/app/home/_components/TopikPractice/ListeningQuestion';
import ScoreSummary from '@/app/home/_components/TopikPractice/ScoreSummary';
import { useUserProfile } from '@/app/_lib/useUserProfile';

interface ExamPageProps {
  params: Promise<{ examId: string }>;
}

export default function ExamPage({ params }: ExamPageProps) {
  const { examId } = React.use(params);
  const router = useRouter();
  const strings = useStrings();

  // Derive exam type from ID prefix (e.g. 'topik1-set-1' → 'topik1')
  const examType = useMemo<TopikExamType | null>(() => {
    if (examId.startsWith('topik1')) return 'topik1';
    if (examId.startsWith('topik2')) return 'topik2';
    return null;
  }, [examId]);

  // Derive set number from ID for display (e.g. 'topik1-set-3' → 3)
  const setNumberMatch = examId.match(/set[-_]?(\d+)$/i);
  const setNumber = setNumberMatch ? parseInt(setNumberMatch[1], 10) : 1;
  const examName = strings.topik.setName(setNumber);

  const {
    examState,
    currentQuestion,
    currentIndex,
    questions,
    result,
    startExam,
    submitAnswer,
    retry,
    changeType,
    isLoading,
  } = useTopikExam();
  
  const { completeExam } = useUserProfile();

  // Start exam on mount when we can determine the type
  useEffect(() => {
    if (examType) {
      startExam(examType, examId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId, examType]);

  // Save completed exam set ID when completed
  useEffect(() => {
    if (examState === 'completed') {
      completeExam(examId).catch(() => {});
    }
  }, [examState, examId, completeExam]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 dot-grid-bg px-4 text-text-primary font-bold">
        <span className="text-sm">กำลังโหลดข้อสอบ TOPIK...</span>
      </div>
    );
  }

  // Not Found state — unknown exam type prefix
  if (!examType) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 dot-grid-bg px-4">
        <h1 className="text-2xl font-bold text-black dark:text-white">
          Not Found
        </h1>
        <p className="text-gray-500 dark:text-white/60">
          The exam you are looking for does not exist.
        </p>
        <Link
          href="/"
          className="rounded-xl border-3 border-border-color bg-accent-pink-bg px-6 py-3 font-bold text-black shadow-nb-sm transition-all active:translate-y-[2px] active:shadow-none dark:text-white"
        >
          Go Home
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col dot-grid-bg">
      <ExamHeader
        examName={examName}
        currentQuestion={currentIndex + 1}
        totalQuestions={questions.length}
        isCompleted={examState === 'completed'}
        onBack={() => router.back()}
      />

      <main className="flex-1 p-4">
        {/* Examining state — render current question */}
        {examState === 'examining' && currentQuestion && (
          <>
            {currentQuestion.type === 'reading' && (
              <ReadingQuestion
                question={currentQuestion}
                questionNumber={currentIndex + 1}
                totalQuestions={questions.length}
                onAnswer={submitAnswer}
              />
            )}
            {currentQuestion.type === 'listening' && (
              <ListeningQuestion
                question={currentQuestion}
                onAnswer={submitAnswer}
                currentIndex={currentIndex}
                totalQuestions={questions.length}
              />
            )}
          </>
        )}

        {/* Completed state — render score summary */}
        {examState === 'completed' && result && (
          <ScoreSummary
            result={result}
            onRetry={retry}
            onChangeType={() => {
              changeType();
              router.back();
            }}
          />
        )}
      </main>
    </div>
  );
}

