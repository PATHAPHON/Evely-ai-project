'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/app/_lib/supabaseClient';
import type { ExamCategory, ExamLevel, ExamQuestion } from './types';
import { getQuestionId } from './getQuestionId';

export interface UserExamHistoryRow {
  id: string;
  user_id: string;
  question_id: string;
  category: string;
  level: string;
  is_correct: boolean;
  payload: ExamQuestion;
  created_at: string;
}

export interface UseExamHistoryReturn {
  history: UserExamHistoryRow[];
  loading: boolean;
  refresh: () => Promise<void>;
  addExamHistoryRecord: (
    question: ExamQuestion,
    category: ExamCategory,
    level: ExamLevel,
    isCorrect: boolean
  ) => Promise<string | null>;
  completedQuestionIds: Set<string>;
  completedQuestionTexts: string[];
}

/**
 * Hook to manage user exam history in Supabase, keeping track of completed questions.
 */
export function useExamHistory(): UseExamHistoryReturn {
  const [history, setHistory] = useState<UserExamHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const userRes = await supabase.auth.getUser();
      const userId = userRes.data.user?.id;
      if (!userId) {
        setHistory([]);
        return;
      }

      const { data, error } = await supabase
        .from('user_exam_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHistory((data as UserExamHistoryRow[]) ?? []);
    } catch (err) {
      console.error('Failed to load exam history:', err);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addExamHistoryRecord = useCallback(
    async (
      question: ExamQuestion,
      category: ExamCategory,
      level: ExamLevel,
      isCorrect: boolean
    ): Promise<string | null> => {
      try {
        const userRes = await supabase.auth.getUser();
        const userId = userRes.data.user?.id;
        if (!userId) return null;

        const questionId = getQuestionId(question);

        const { data, error } = await supabase
          .from('user_exam_history')
          .insert({
            user_id: userId,
            question_id: questionId,
            category,
            level,
            is_correct: isCorrect,
            payload: question,
          })
          .select('id')
          .single();

        if (error) throw error;

        // Optimistically update local state
        const newRecord: UserExamHistoryRow = {
          id: (data as { id: string }).id,
          user_id: userId,
          question_id: questionId,
          category,
          level,
          is_correct: isCorrect,
          payload: question,
          created_at: new Date().toISOString(),
        };

        setHistory((prev) => [newRecord, ...prev]);
        return newRecord.id;
      } catch (err) {
        console.error('Failed to save exam history record:', err);
        return null;
      }
    },
    []
  );

  // Set of all hashed question IDs the user has completed
  const completedQuestionIds = new Set(history.map((row) => row.question_id));

  // The actual text values (passages and scripts) used in recent questions,
  // which will be sent to the AI to prevent duplicate concepts.
  // We limit to the 30 most recent questions to avoid hitting context token limits.
  const completedQuestionTexts = history
    .slice(0, 30)
    .map((row) => {
      const q = row.payload;
      return q.type === 'reading' ? q.passage : q.script;
    })
    .filter(Boolean);

  return {
    history,
    loading,
    refresh,
    addExamHistoryRecord,
    completedQuestionIds,
    completedQuestionTexts,
  };
}
