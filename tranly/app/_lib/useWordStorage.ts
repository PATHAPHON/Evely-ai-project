'use client';

import { useCallback, useState } from 'react';
import { supabase } from '@/app/_lib/supabaseClient';
import { useActiveLanguage } from '@/app/_lib/ActiveLanguageContext';
import type { TargetLanguage } from '@/app/_lib/wordTypes';

export interface WordRecord {
  id: string;
  imageBlob?: Blob | null;
  imageUrl?: string | null;
  label: string;
  language?: TargetLanguage;
  englishText?: string;
  reading?: string;
  romanization?: string;
  english?: string;
  partOfSpeech?: string;
  createdAt: number;
}

export interface SaveWordInput {
  label: string;
  englishText?: string;
  reading?: string;
  romanization?: string;
  english?: string;
  partOfSpeech?: string;
}

export interface UseWordStorageReturn {
  save: (imageBlob: Blob, input: SaveWordInput | string) => Promise<string>;
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
    async (
      imageBlob: Blob,
      input: SaveWordInput | string
    ): Promise<string> => {
      setIsLoading(true);
      setError(null);
      try {
        const userRes = await supabase.auth.getUser();
        const userId = userRes.data.user?.id;
        if (!userId) {
          throw new Error('User not authenticated.');
        }

        const id = crypto.randomUUID();
        const normalized: SaveWordInput =
          typeof input === 'string' ? { label: input } : input;

        // 1. Upload image to Supabase Storage
        const filePath = `authenticated/${userId}/words/${id}.png`;
        const { error: uploadError } = await supabase.storage
          .from('tarnly-media')
          .upload(filePath, imageBlob, {
            contentType: 'image/png',
            upsert: true,
          });

        if (uploadError) {
          throw uploadError;
        }

        // 2. Get Public URL
        const { data: { publicUrl } } = supabase.storage
          .from('tarnly-media')
          .getPublicUrl(filePath);

        // 3. Insert metadata record in DB
        const { error: dbError } = await supabase.from('words').insert({
          id,
          user_id: userId,
          label: normalized.label,
          image_url: publicUrl,
          language: activeLanguage,
          reading: normalized.reading,
          romanization: normalized.romanization,
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
        imageUrl: row.image_url,
        label: row.label,
        language: row.language as TargetLanguage,
        reading: row.reading,
        romanization: row.romanization,
        english: row.english,
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
        imageUrl: row.image_url,
        label: row.label,
        language: row.language as TargetLanguage,
        reading: row.reading,
        romanization: row.romanization,
        english: row.english,
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

      const filePath = `authenticated/${userId}/words/${id}.png`;
      await supabase.storage.from('tarnly-media').remove([filePath]);
    } catch (err) {
      console.error('Failed to delete word:', err);
      throw err;
    }
  }, []);

  return { save, list, listByLanguage, remove, isLoading, error };
}
