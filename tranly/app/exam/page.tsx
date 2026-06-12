'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LoadingOutlined, ArrowLeftOutlined } from '@ant-design/icons';

import GeminiLayout from '@/app/_components/GeminiLayout';
import ChatExamCard from '@/app/chat/_components/ChatExamCard';
import ElephantMascot from '@/app/chat/_components/ElephantMascot';

import { useExamSets } from './_lib/useExamSets';
import { useExamHistory } from './_lib/useExamHistory';
import { useWrongQuestions } from './_lib/useWrongQuestions';
import type { ExamQuestion, ExamSetRow } from './_lib/types';

/**
 * Dedicated exam play page. Exams are created in the chat via the `/exam`
 * skill, persisted to `exam_sets`, then opened here by id. Visiting without
 * an examId (or with an invalid one) sends the user back to /chat.
 */
function ExamPlay() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const examId = searchParams.get('examId');

  const { getExamSet } = useExamSets();
  const examHistory = useExamHistory();
  const wrongStore = useWrongQuestions();

  const [examSet, setExamSet] = useState<ExamSetRow | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'done'>('loading');
  const [result, setResult] = useState<{ score: number; total: number } | null>(null);

  // Load the exam set; redirect to /chat if missing or invalid.
  const loadedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!examId) {
      router.replace('/chat');
      return;
    }
    if (loadedRef.current === examId) return;
    loadedRef.current = examId;

    void (async () => {
      const set = await getExamSet(examId);
      if (!set || !Array.isArray(set.payload) || set.payload.length === 0) {
        router.replace('/chat');
        return;
      }
      setExamSet(set);
      setStatus('ready');
    })();
  }, [examId, getExamSet, router]);

  const handleSaveRecord = useCallback(
    async (q: ExamQuestion, isCorrect: boolean) => {
      if (!examSet) return;
      await examHistory.addExamHistoryRecord(
        q,
        examSet.category,
        examSet.level,
        isCorrect
      );
    },
    [examHistory, examSet]
  );

  const handleAddWrongQuestion = useCallback(
    async (q: ExamQuestion) => {
      if (!examSet) return;
      await wrongStore.addWrongQuestion(q, examSet.category, examSet.level);
    },
    [wrongStore, examSet]
  );

  const handleFinishExam = useCallback((score: number, total: number) => {
    setResult({ score, total });
    setStatus('done');
  }, []);

  return (
    <GeminiLayout title="ทำข้อสอบ" showNewChatButton={false}>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <button
            type="button"
            onClick={() => router.push('/chat')}
            className="flex items-center gap-1.5 text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors cursor-pointer mb-4"
          >
            <ArrowLeftOutlined style={{ fontSize: 14 }} />
            <span>กลับไปแชท</span>
          </button>

          {status === 'loading' && (
            <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
              <ElephantMascot state="thinking" size={64} />
              <p className="flex items-center gap-2 text-base font-bold text-gray-600 dark:text-gray-300">
                <LoadingOutlined style={{ fontSize: 18 }} />
                กำลังโหลดข้อสอบ...
              </p>
            </div>
          )}

          {status === 'ready' && examSet && (
            <>
              {examSet.topic && (
                <p className="mb-4 text-sm font-bold text-gray-500 dark:text-gray-400">
                  หัวข้อ: {examSet.topic}
                </p>
              )}
              <ChatExamCard
                questions={examSet.payload}
                category={examSet.category}
                level={examSet.level}
                onSaveRecord={handleSaveRecord}
                onAddWrongQuestion={handleAddWrongQuestion}
                onFinishExam={handleFinishExam}
              />
            </>
          )}

          {status === 'done' && result && (
            <div className="flex flex-col items-center justify-center gap-5 py-16 text-center">
              <ElephantMascot state="happy" size={72} />
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                ทำคะแนนได้ {result.score} จาก {result.total} ข้อ 🎉
              </p>
              <button
                type="button"
                onClick={() => router.push('/chat')}
                className="px-5 py-2.5 rounded-xl text-sm font-bold bg-amber-400 text-gray-900 hover:bg-amber-300 transition-colors cursor-pointer"
              >
                กลับไปแชท
              </button>
            </div>
          )}
        </div>
      </div>
    </GeminiLayout>
  );
}

export default function ExamPage() {
  return (
    <Suspense fallback={null}>
      <ExamPlay />
    </Suspense>
  );
}
