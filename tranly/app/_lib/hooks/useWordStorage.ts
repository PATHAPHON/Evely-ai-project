'use client';

import { useCallback, useState } from 'react';
import { supabase } from '@/app/_lib/supabase/supabaseClient';
import { useActiveLanguage } from '@/app/_lib/contexts/ActiveLanguageContext';
import type { TargetLanguage } from '@/app/_lib/types/wordTypes';

export interface WordRecord {
  id: string;
  label: string;
  language?: TargetLanguage;
  englishText?: string;
  english?: string;
  thai?: string;
  partOfSpeech?: string;
  createdAt: number;
}

export interface UseWordStorageReturn {
  listByLanguage: () => Promise<WordRecord[]>;
  isLoading: boolean;
  error: string | null;
}

interface WordStorageRow {
  id: string;
  label: string;
  language: string;
  english: string | null;
  thai: string | null;
  part_of_speech: string | null;
  created_at: string;
}

function mapRow(row: WordStorageRow): WordRecord {
  return {
    id: row.id,
    label: row.label,
    language: row.language as TargetLanguage,
    english: row.english ?? undefined,
    thai: row.thai ?? undefined,
    partOfSpeech: row.part_of_speech ?? undefined,
    createdAt: new Date(row.created_at).getTime(),
  };
}

export function useWordStorage(): UseWordStorageReturn {
  const { activeLanguage } = useActiveLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listByLanguage = useCallback(async (): Promise<WordRecord[]> => {
    setIsLoading(true);
    setError(null);
    try {
      const userRes = await supabase.auth.getUser();
      const userId = userRes.data.user?.id;
      if (!userId) return [];

      const { data, error: dbError } = await supabase
        .from('words')
        .select('*')
        .eq('user_id', userId)
        .eq('language', activeLanguage)
        .order('created_at', { ascending: false });

      if (dbError) {
        throw dbError;
      }

      return (data || []).map(mapRow);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load words.';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [activeLanguage]);

  return { listByLanguage, isLoading, error };
}
