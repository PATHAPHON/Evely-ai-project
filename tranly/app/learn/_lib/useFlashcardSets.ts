'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/app/_lib/supabaseClient';
import { useActiveLanguage } from '@/app/_lib/ActiveLanguageContext';
import type { TargetLanguage } from '@/app/_lib/wordTypes';

export interface FlashcardSet {
  id: string;
  language: TargetLanguage;
  name: string;
  wordIds: string[];
  createdAt: number;
}

export interface UseFlashcardSetsReturn {
  sets: FlashcardSet[] | null;
  createSet: (name: string, wordIds: string[]) => Promise<void>;
  removeSet: (id: string) => Promise<void>;
}

export function useFlashcardSets(): UseFlashcardSetsReturn {
  const { activeLanguage } = useActiveLanguage();
  const [sets, setSets] = useState<FlashcardSet[] | null>(null);

  const refresh = useCallback(async () => {
    try {
      const userRes = await supabase.auth.getUser();
      const userId = userRes.data.user?.id;
      if (!userId) {
        setSets([]);
        return;
      }

      const { data, error } = await supabase
        .from('flashcard_sets')
        .select('*, flashcard_set_words(word_id)')
        .eq('user_id', userId)
        .eq('language', activeLanguage)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      const mappedSets: FlashcardSet[] = (data || []).map((row) => ({
        id: row.id,
        language: row.language as TargetLanguage,
        name: row.name,
        wordIds: (row.flashcard_set_words || []).map((w: { word_id: string }) => w.word_id),
        createdAt: new Date(row.created_at).getTime(),
      }));

      setSets(mappedSets);
    } catch (err) {
      console.error('Failed to load flashcard sets:', err);
      setSets([]);
    }
  }, [activeLanguage]);

  useEffect(() => {
    refresh().catch(() => setSets([]));
  }, [refresh]);

  const createSet = useCallback(
    async (name: string, wordIds: string[]) => {
      try {
        const userRes = await supabase.auth.getUser();
        const userId = userRes.data.user?.id;
        if (!userId) {
          throw new Error('User not authenticated.');
        }

        const id = crypto.randomUUID();

        // 1. Insert flashcard set
        const { error: setError } = await supabase.from('flashcard_sets').insert({
          id,
          user_id: userId,
          name,
          language: activeLanguage,
          created_at: new Date().toISOString(),
        });

        if (setError) {
          throw setError;
        }

        // 2. Insert junction records in flashcard_set_words
        if (wordIds.length > 0) {
          const junctionRows = wordIds.map((wordId) => ({
            flashcard_set_id: id,
            word_id: wordId,
          }));

          const { error: wordsError } = await supabase
            .from('flashcard_set_words')
            .insert(junctionRows);

          if (wordsError) {
            throw wordsError;
          }
        }

        await refresh();
      } catch (err) {
        console.error('Failed to create flashcard set:', err);
        throw err;
      }
    },
    [refresh, activeLanguage]
  );

  const removeSet = useCallback(
    async (id: string) => {
      try {
        const userRes = await supabase.auth.getUser();
        const userId = userRes.data.user?.id;
        if (!userId) {
          throw new Error('User not authenticated.');
        }

        const { error } = await supabase
          .from('flashcard_sets')
          .delete()
          .eq('id', id)
          .eq('user_id', userId);

        if (error) {
          throw error;
        }

        await refresh();
      } catch (err) {
        console.error('Failed to remove flashcard set:', err);
        throw err;
      }
    },
    [refresh]
  );

  return { sets, createSet, removeSet };
}
