'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/app/_lib/supabaseClient';
import type {
  ExamCategory,
  ExamLevel,
  ExamQuestion,
  WrongQuestionRow,
} from './types';

export interface UseWrongQuestionsReturn {
  wrongQuestions: WrongQuestionRow[];
  refresh: () => Promise<void>;
  /** Returns the inserted row id (used to cache the AI explanation later). */
  addWrongQuestion: (
    question: ExamQuestion,
    category: ExamCategory,
    level: ExamLevel
  ) => Promise<string | null>;
  removeWrongQuestion: (rowId: string) => Promise<void>;
  saveExplanation: (rowId: string, explanation: string) => Promise<void>;
}

/**
 * Storage for exam questions the user answered incorrectly
 * (Supabase `wrong_questions`, user-scoped). Rows are removed once the
 * user answers them correctly in review mode.
 */
export function useWrongQuestions(): UseWrongQuestionsReturn {
  const [wrongQuestions, setWrongQuestions] = useState<WrongQuestionRow[]>([]);

  const refresh = useCallback(async () => {
    try {
      const userRes = await supabase.auth.getUser();
      const userId = userRes.data.user?.id;
      if (!userId) {
        setWrongQuestions([]);
        return;
      }

      const { data, error } = await supabase
        .from('wrong_questions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setWrongQuestions((data as WrongQuestionRow[]) ?? []);
    } catch (err) {
      console.error('Failed to load wrong questions:', err);
      setWrongQuestions([]);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addWrongQuestion = useCallback(
    async (
      question: ExamQuestion,
      category: ExamCategory,
      level: ExamLevel
    ): Promise<string | null> => {
      try {
        const userRes = await supabase.auth.getUser();
        const userId = userRes.data.user?.id;
        if (!userId) return null;

        const { data, error } = await supabase
          .from('wrong_questions')
          .insert({
            user_id: userId,
            exam_type: category,
            level,
            question_type: question.type,
            payload: question,
          })
          .select('id')
          .single();
        if (error) throw error;
        return (data as { id: string }).id;
      } catch (err) {
        console.error('Failed to save wrong question:', err);
        return null;
      }
    },
    []
  );

  const removeWrongQuestion = useCallback(async (rowId: string) => {
    try {
      const { error } = await supabase
        .from('wrong_questions')
        .delete()
        .eq('id', rowId);
      if (error) throw error;
      setWrongQuestions((prev) => prev.filter((row) => row.id !== rowId));
    } catch (err) {
      console.error('Failed to remove wrong question:', err);
    }
  }, []);

  const saveExplanation = useCallback(
    async (rowId: string, explanation: string) => {
      try {
        const { error } = await supabase
          .from('wrong_questions')
          .update({ explanation })
          .eq('id', rowId);
        if (error) throw error;
        setWrongQuestions((prev) =>
          prev.map((row) => (row.id === rowId ? { ...row, explanation } : row))
        );
      } catch (err) {
        console.error('Failed to save explanation:', err);
      }
    },
    []
  );

  return {
    wrongQuestions,
    refresh,
    addWrongQuestion,
    removeWrongQuestion,
    saveExplanation,
  };
}
