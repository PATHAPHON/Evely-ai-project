'use client';

import { useCallback, useState } from 'react';
import { supabase } from '@/app/_lib/supabaseClient';
import type { LessonRecord } from './lessonTypes';

export interface UseLessonHistoryReturn {
  lessons: LessonRecord[];
  loadLessons: () => Promise<void>;
  saveLesson: (lesson: LessonRecord) => Promise<void>;
  deleteLesson: (lessonId: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

/**
 * Persistence for generated lessons so they can be replayed later.
 * Communicates with public.lessons table in Supabase.
 */
export function useLessonHistory(): UseLessonHistoryReturn {
  const [lessons, setLessons] = useState<LessonRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLessons = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const userRes = await supabase.auth.getUser();
      const userId = userRes.data.user?.id;
      if (!userId) {
        setLessons([]);
        return;
      }

      const { data, error: dbError } = await supabase
        .from('lessons')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (dbError) {
        throw dbError;
      }

      const mappedLessons: LessonRecord[] = (data || []).map((row) => ({
        id: row.id,
        topic: row.topic,
        proficiencyLevel: row.proficiency_level,
        wordContext: row.word_context || [],
        exercises: row.exercises || [],
        createdAt: row.created_at,
        lastScore: row.last_score,
        total: row.total,
        timesCompleted: row.times_completed,
      }));

      setLessons(mappedLessons);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'โหลดบทเรียนที่บันทึกไว้ไม่สำเร็จ';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveLesson = useCallback(
    async (lesson: LessonRecord): Promise<void> => {
      setError(null);
      try {
        const userRes = await supabase.auth.getUser();
        const userId = userRes.data.user?.id;
        if (!userId) {
          throw new Error('User not authenticated.');
        }

        const { error: dbError } = await supabase.from('lessons').upsert({
          id: lesson.id,
          user_id: userId,
          topic: lesson.topic,
          proficiency_level: lesson.proficiencyLevel,
          word_context: lesson.wordContext,
          exercises: lesson.exercises,
          created_at: lesson.createdAt,
          last_score: lesson.lastScore,
          total: lesson.total,
          times_completed: lesson.timesCompleted,
        });

        if (dbError) {
          throw dbError;
        }
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'บันทึกบทเรียนไม่สำเร็จ กรุณาลองอีกครั้ง';
        setError(message);
        throw err;
      }
    },
    []
  );

  const deleteLesson = useCallback(
    async (lessonId: string): Promise<void> => {
      setError(null);
      try {
        const userRes = await supabase.auth.getUser();
        const userId = userRes.data.user?.id;
        if (!userId) {
          throw new Error('User not authenticated.');
        }

        const { error: dbError } = await supabase
          .from('lessons')
          .delete()
          .eq('id', lessonId)
          .eq('user_id', userId);

        if (dbError) {
          throw dbError;
        }

        setLessons((prev) => prev.filter((l) => l.id !== lessonId));
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'ลบบทเรียนไม่สำเร็จ กรุณาลองอีกครั้ง';
        setError(message);
        throw err;
      }
    },
    []
  );

  return {
    lessons,
    loadLessons,
    saveLesson,
    deleteLesson,
    isLoading,
    error,
  };
}
