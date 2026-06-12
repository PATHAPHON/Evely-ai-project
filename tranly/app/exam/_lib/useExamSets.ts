'use client';

import { useCallback } from 'react';
import { supabase } from '@/app/_lib/supabaseClient';
import type {
  ExamCategory,
  ExamLevel,
  ExamQuestion,
  ExamSetRow,
} from './types';

export interface UseExamSetsReturn {
  /** Persist a generated exam and return its id (or null on failure). */
  createExamSet: (
    questions: ExamQuestion[],
    category: ExamCategory,
    level: ExamLevel,
    topic: string
  ) => Promise<string | null>;
  /** Load a previously generated exam by id (or null if not found). */
  getExamSet: (examId: string) => Promise<ExamSetRow | null>;
}

/**
 * Stores generated exam sets so the /exam chat skill can hand questions off
 * to the dedicated /exam?examId=... play page (survives reload / sharing).
 */
export function useExamSets(): UseExamSetsReturn {
  const createExamSet = useCallback(
    async (
      questions: ExamQuestion[],
      category: ExamCategory,
      level: ExamLevel,
      topic: string
    ): Promise<string | null> => {
      try {
        const userRes = await supabase.auth.getUser();
        const userId = userRes.data.user?.id;
        if (!userId) return null;

        const { data, error } = await supabase
          .from('exam_sets')
          .insert({
            user_id: userId,
            category,
            level,
            topic,
            payload: questions,
          })
          .select('id')
          .single();
        if (error) throw error;
        return (data as { id: string }).id;
      } catch (err) {
        console.error('Failed to save exam set:', err);
        return null;
      }
    },
    []
  );

  const getExamSet = useCallback(
    async (examId: string): Promise<ExamSetRow | null> => {
      try {
        const { data, error } = await supabase
          .from('exam_sets')
          .select('*')
          .eq('id', examId)
          .single();
        if (error) throw error;
        return data as ExamSetRow;
      } catch (err) {
        console.error('Failed to load exam set:', err);
        return null;
      }
    },
    []
  );

  return { createExamSet, getExamSet };
}
