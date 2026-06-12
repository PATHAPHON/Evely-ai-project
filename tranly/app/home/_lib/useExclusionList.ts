'use client';

import { useCallback } from 'react';
import { supabase } from '@/app/_lib/supabaseClient';
import type { TargetLanguage } from '@/app/_lib/wordTypes';

export interface UseExclusionListReturn {
  getExclusionList: (language?: TargetLanguage) => Promise<string[]>;
}

function extractWords(rows: Record<string, string | null>[]): string[] {
  return rows
    .flatMap((r) => [r.word, r.english])
    .filter((v): v is string => !!v);
}

export function useExclusionList(): UseExclusionListReturn {
  const getExclusionList = useCallback(async (language?: TargetLanguage): Promise<string[]> => {
    try {
      const userRes = await supabase.auth.getUser();
      const userId = userRes.data.user?.id;
      if (!userId) return [];

      const allFields = 'word,english';

      let feedQuery = supabase
        .from('feed_words')
        .select(allFields)
        .eq('user_id', userId);

      let rejectedQuery = supabase
        .from('rejected_words')
        .select(allFields)
        .eq('user_id', userId);

      if (language) {
        feedQuery = feedQuery.eq('language', language);
        rejectedQuery = rejectedQuery.eq('language', language);
      }

      const [wordsRes, feedRes, rejectedRes] = await Promise.all([
        supabase
          .from('words')
          .select(allFields)
          .eq('user_id', userId),
        feedQuery,
        rejectedQuery,
      ]);

      const combined = [
        ...extractWords(wordsRes.data || []),
        ...extractWords(feedRes.data || []),
        ...extractWords(rejectedRes.data || []),
      ];
      return [...new Set(combined)];
    } catch (err) {
      console.error('Failed to load exclusion list from DB:', err);
      return [];
    }
  }, []);

  return { getExclusionList };
}
