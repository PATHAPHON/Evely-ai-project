'use client';

import { useCallback } from 'react';
import { supabase } from '@/app/_lib/supabaseClient';

export interface UseExclusionListReturn {
  getExclusionList: () => Promise<string[]>;
}

export function useExclusionList(): UseExclusionListReturn {
  const getExclusionList = useCallback(async (): Promise<string[]> => {
    try {
      const userRes = await supabase.auth.getUser();
      const userId = userRes.data.user?.id;
      if (!userId) return [];

      const [wordsRes, feedRes] = await Promise.all([
        supabase
          .from('words')
          .select('korean')
          .eq('user_id', userId),
        supabase
          .from('feed_words')
          .select('korean')
          .eq('user_id', userId)
      ]);

      const scannedWords = (wordsRes.data || [])
        .map((r) => r.korean)
        .filter((k): k is string => !!k);

      const feedWords = (feedRes.data || [])
        .map((r) => r.korean)
        .filter((k): k is string => !!k);

      const combined = [...scannedWords, ...feedWords];
      return [...new Set(combined)];
    } catch (err) {
      console.error('Failed to load exclusion list from DB:', err);
      return [];
    }
  }, []);

  return { getExclusionList };
}
