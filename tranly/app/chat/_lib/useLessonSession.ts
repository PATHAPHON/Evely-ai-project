'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { getCustomAIHeaders } from '@/app/_lib/getCustomAIHeaders';
import { useLessonHistory } from './useLessonHistory';
import { useGems } from '@/app/_lib/GemsContext';
import type {
  LessonConfig,
  LessonErrorResponse,
  LessonExercise,
  LessonRecord,
  LessonSuccessResponse,
} from './lessonTypes';

export type LessonStatus =
  | 'idle'
  | 'loading'
  | 'active'
  | 'complete'
  | 'error';

export interface UseLessonSessionReturn {
  exercises: LessonExercise[];
  currentIndex: number;
  currentExercise: LessonExercise | null;
  answers: (boolean | null)[];
  status: LessonStatus;
  error: string | null;
  score: number;
  total: number;
  startLesson: (config: LessonConfig) => Promise<void>;
  replayLesson: (record: LessonRecord) => void;
  retry: () => void;
  submitAnswer: (isCorrect: boolean) => void;
  nextExercise: () => void;
  reset: () => void;
}

export function useLessonSession(): UseLessonSessionReturn {
  const [exercises, setExercises] = useState<LessonExercise[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<(boolean | null)[]>([]);
  const [status, setStatus] = useState<LessonStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [lastConfig, setLastConfig] = useState<LessonConfig | null>(null);

  const { earnGems, spendGems } = useGems();

  // The persisted record backing the active run, plus a live mirror of answers
  // so completion can compute the final score without an effect.
  const recordRef = useRef<LessonRecord | null>(null);
  const answersRef = useRef<(boolean | null)[]>([]);

  const { saveLesson } = useLessonHistory();

  const beginRun = useCallback(
    (record: LessonRecord) => {
      recordRef.current = record;
      answersRef.current = new Array(record.exercises.length).fill(null);
      setExercises(record.exercises);
      setAnswers(answersRef.current);
      setCurrentIndex(0);
      setError(null);
      setStatus('active');
    },
    []
  );

  const startLesson = useCallback(
    async (config: LessonConfig) => {
      setError(null);

      const success = spendGems(15);
      if (!success) {
        setError(
          'เพชรสะสมไม่เพียงพอ! 💎 คุณต้องมีอย่างน้อย 15 เพชรเพื่อสร้างบทเรียนสุ่ม กรุณาสะสมเพชรฟรีโดยการเล่นบทเรียน "ทักทาย" (Basic Greetings) หรือสุ่มปัดคำหัวข้อ "ทักทาย" ครับ'
        );
        setStatus('error');
        return;
      }

      setStatus('loading');
      setLastConfig(config);
      setExercises([]);
      setCurrentIndex(0);
      setAnswers([]);
      recordRef.current = null;

      try {
        const response = await fetch('/api/lesson', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getCustomAIHeaders(),
          },
          body: JSON.stringify({
            topic: config.topic,
            proficiencyLevel: config.proficiencyLevel,
            wordContext: config.wordContext.map((w) => w.korean),
            language: config.language,
          }),
        });

        if (!response.ok) {
          const errorData = (await response
            .json()
            .catch(() => null)) as LessonErrorResponse | null;
          throw new Error(
            errorData?.error?.message ??
              'ไม่สามารถสร้างบทเรียนได้ กรุณาลองอีกครั้ง'
          );
        }

        const data = (await response.json()) as LessonSuccessResponse;
        if (!data.exercises || data.exercises.length === 0) {
          throw new Error('ไม่สามารถสร้างบทเรียนได้ กรุณาลองอีกครั้ง');
        }

        const record: LessonRecord = {
          id: crypto.randomUUID(),
          topic: config.topic,
          proficiencyLevel: config.proficiencyLevel,
          wordContext: config.wordContext.map((w) => w.korean),
          exercises: data.exercises,
          createdAt: new Date().toISOString(),
          lastScore: null,
          total: data.exercises.length,
          timesCompleted: 0,
        };

        // Persist the generated lesson so it can be replayed later.
        saveLesson(record).catch(() => {
          // Non-fatal: the lesson still runs from memory.
        });

        beginRun(record);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'ไม่สามารถสร้างบทเรียนได้ กรุณาลองอีกครั้ง';
        setError(message);
        setStatus('error');
      }
    },
    [saveLesson, beginRun]
  );

  const replayLesson = useCallback(
    (record: LessonRecord) => {
      setLastConfig(null);
      beginRun(record);
    },
    [beginRun]
  );

  const submitAnswer = useCallback(
    (isCorrect: boolean) => {
      setAnswers((prev) => {
        const next = [...prev];
        next[currentIndex] = isCorrect;
        answersRef.current = next;
        return next;
      });
    },
    [currentIndex]
  );

  const nextExercise = useCallback(() => {
    setCurrentIndex((prev) => {
      const next = prev + 1;
      if (next >= exercises.length) {
        // Lesson finished — persist the score against the saved record.
        const finalScore = answersRef.current.filter((a) => a === true).length;
        const record = recordRef.current;
        if (record) {
          const updated: LessonRecord = {
            ...record,
            lastScore: finalScore,
            total: exercises.length,
            timesCompleted: record.timesCompleted + 1,
          };
          recordRef.current = updated;
          saveLesson(updated).catch(() => {
            // Non-fatal.
          });
        }
        earnGems(15);
        setStatus('complete');
        return prev;
      }
      return next;
    });
  }, [exercises.length, saveLesson, earnGems]);


  const reset = useCallback(() => {
    recordRef.current = null;
    answersRef.current = [];
    setExercises([]);
    setCurrentIndex(0);
    setAnswers([]);
    setError(null);
    setStatus('idle');
    setLastConfig(null);
  }, []);

  const retry = useCallback(() => {
    if (lastConfig) {
      void startLesson(lastConfig);
    }
  }, [lastConfig, startLesson]);

  const score = useMemo(
    () => answers.filter((a) => a === true).length,
    [answers]
  );

  const currentExercise = exercises[currentIndex] ?? null;

  return {
    exercises,
    currentIndex,
    currentExercise,
    answers,
    status,
    error,
    score,
    total: exercises.length,
    startLesson,
    replayLesson,
    retry,
    submitAnswer,
    nextExercise,
    reset,
  };
}
