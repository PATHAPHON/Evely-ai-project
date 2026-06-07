'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/app/_lib/supabaseClient';
import { useActiveLanguage } from '@/app/_lib/ActiveLanguageContext';
import type { StudySession } from '@/app/_lib/studySessionTypes';
import type { TargetLanguage } from '@/app/_lib/wordTypes';

export interface UseStudySessionsReturn {
  sessions: StudySession[] | null;
  recordSession: (flashcardSetId: string, cardsReviewed: number) => Promise<void>;
}

export function useStudySessions(): UseStudySessionsReturn {
  const { activeLanguage } = useActiveLanguage();
  const [sessions, setSessions] = useState<StudySession[] | null>(null);

  const refresh = useCallback(async () => {
    try {
      const userRes = await supabase.auth.getUser();
      const userId = userRes.data.user?.id;
      if (!userId) {
        setSessions([]);
        return;
      }

      const { data, error } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('language', activeLanguage)
        .order('completed_at', { ascending: false });

      if (error) {
        throw error;
      }

      const mappedSessions: StudySession[] = (data || []).map((row) => ({
        id: row.id,
        language: row.language as TargetLanguage,
        flashcardSetId: row.flashcard_set_id,
        completedAt: new Date(row.completed_at).getTime(),
        cardsReviewed: row.cards_reviewed,
      }));

      setSets(mappedSessions);
    } catch (err) {
      console.error('Failed to load study sessions:', err);
      setSets([]);
    }
  }, [activeLanguage]);

  // Helper setter to avoid React scope issues
  function setSets(val: StudySession[]) {
    setSessions(val);
  }

  useEffect(() => {
    refresh().catch(() => setSessions([]));
  }, [refresh]);

  const recordSession = useCallback(
    async (flashcardSetId: string, cardsReviewed: number) => {
      if (cardsReviewed < 1) return;

      try {
        const userRes = await supabase.auth.getUser();
        const userId = userRes.data.user?.id;
        if (!userId) {
          throw new Error('User not authenticated.');
        }

        const id = crypto.randomUUID();
        const { error } = await supabase.from('study_sessions').insert({
          id,
          user_id: userId,
          language: activeLanguage,
          flashcard_set_id: flashcardSetId,
          completed_at: new Date().toISOString(),
          cards_reviewed: cardsReviewed,
        });

        if (error) {
          throw error;
        }

        await refresh();
      } catch (err) {
        console.error('Failed to record study session:', err);
        throw err;
      }
    },
    [refresh, activeLanguage]
  );

  return { sessions, recordSession };
}
