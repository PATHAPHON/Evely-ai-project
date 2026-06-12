'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/app/_lib/supabaseClient';

/** Row in the Supabase `exam_stage_progress` table */
export interface StageProgressRow {
  id: string;
  user_id: string;
  stage_id: string;
  best_score: number;
  total_questions: number;
  completed_at: string;
}

export interface UseStageProgressReturn {
  /** Ids of stages the user has completed at least once */
  completedStageIds: Set<string>;
  progressByStage: Map<string, StageProgressRow>;
  loading: boolean;
  refresh: () => Promise<void>;
  /** Mark a stage completed; keeps the best score across attempts. */
  recordCompletion: (
    stageId: string,
    score: number,
    total: number
  ) => Promise<void>;
}

/**
 * Per-user completion of the Duolingo-style exam stage path
 * (Supabase `exam_stage_progress`, one row per stage, user-scoped).
 */
export function useStageProgress(): UseStageProgressReturn {
  const [rows, setRows] = useState<StageProgressRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const userRes = await supabase.auth.getUser();
      const userId = userRes.data.user?.id;
      if (!userId) {
        setRows([]);
        return;
      }

      const { data, error } = await supabase
        .from('exam_stage_progress')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      setRows((data as StageProgressRow[]) ?? []);
    } catch (err) {
      console.error('Failed to load stage progress:', err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const recordCompletion = useCallback(
    async (stageId: string, score: number, total: number) => {
      try {
        const userRes = await supabase.auth.getUser();
        const userId = userRes.data.user?.id;
        if (!userId) return;

        const existing = rows.find((row) => row.stage_id === stageId);
        const bestScore = Math.max(existing?.best_score ?? 0, score);

        const { data, error } = await supabase
          .from('exam_stage_progress')
          .upsert(
            {
              user_id: userId,
              stage_id: stageId,
              best_score: bestScore,
              total_questions: total,
              completed_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,stage_id' }
          )
          .select('*')
          .single();
        if (error) throw error;

        const row = data as StageProgressRow;
        setRows((prev) => [
          ...prev.filter((r) => r.stage_id !== stageId),
          row,
        ]);
      } catch (err) {
        console.error('Failed to record stage completion:', err);
      }
    },
    [rows]
  );

  const completedStageIds = useMemo(
    () => new Set(rows.map((row) => row.stage_id)),
    [rows]
  );

  const progressByStage = useMemo(
    () => new Map(rows.map((row) => [row.stage_id, row])),
    [rows]
  );

  return { completedStageIds, progressByStage, loading, refresh, recordCompletion };
}
