'use client';

import { useCallback, useState } from 'react';
import { randomId } from '../utils/randomId';
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

export interface SaveWordInput {
  label: string;
  englishText?: string;
  english?: string;
  partOfSpeech?: string;
}

export interface UseWordStorageReturn {
  save: (input: SaveWordInput | string) => Promise<string>;
  list: () => Promise<WordRecord[]>;
  listByLanguage: () => Promise<WordRecord[]>;
  remove: (id: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export function useWordStorage(): UseWordStorageReturn {
  const { activeLanguage } = useActiveLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = useCallback(
    async (input: SaveWordInput | string): Promise<string> => {
      setIsLoading(true);
      setError(null);
      try {
        const userRes = await supabase.auth.getUser();
        const userId = userRes.data.user?.id;
        if (!userId) {
          throw new Error('User not authenticated.');
        }

        const id = randomId();
        const normalized: SaveWordInput =
          typeof input === 'string' ? { label: input } : input;

        const { error: dbError } = await supabase.from('words').insert({
          id,
          user_id: userId,
          label: normalized.label,
          language: activeLanguage,
          english: normalized.english,
          part_of_speech: normalized.partOfSpeech,
          created_at: new Date().toISOString(),
        });

        if (dbError) {
          throw dbError;
        }

        setIsLoading(false);
        return id;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Failed to save word. Please try again.';
        setError(message);
        setIsLoading(false);
        throw err;
      }
    },
    [activeLanguage]
  );

  const list = useCallback(async (): Promise<WordRecord[]> => {
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
        .order('created_at', { ascending: false });

      if (dbError) {
        throw dbError;
      }

      return (data || []).map((row) => ({
        id: row.id,
        label: row.label,
        language: row.language as TargetLanguage,
        english: row.english,
        thai: row.thai,
        partOfSpeech: row.part_of_speech,
        createdAt: new Date(row.created_at).getTime(),
      }));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load words.';
      setError(message);
      setIsLoading(false);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

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

      return (data || []).map((row) => ({
        id: row.id,
        label: row.label,
        language: row.language as TargetLanguage,
        english: row.english,
        thai: row.thai,
        partOfSpeech: row.part_of_speech,
        createdAt: new Date(row.created_at).getTime(),
      }));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load words.';
      setError(message);
      setIsLoading(false);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [activeLanguage]);

  const remove = useCallback(async (id: string): Promise<void> => {
    try {
      const userRes = await supabase.auth.getUser();
      const userId = userRes.data.user?.id;
      if (!userId) return;

      const { error: dbError } = await supabase
        .from('words')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (dbError) {
        throw dbError;
      }

    } catch (err) {
      console.error('Failed to delete word:', err);
      throw err;
    }
  }, []);

  return { save, list, listByLanguage, remove, isLoading, error };
}
