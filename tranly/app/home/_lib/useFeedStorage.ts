'use client';

import { useCallback, useState } from 'react';
import { supabase } from '@/app/_lib/supabaseClient';
import type { FeedWord, FeedWordRecord } from './types';
import type { TargetLanguage } from '@/app/_lib/wordTypes';

export interface UseFeedStorageReturn {
  loadTodayWords: (language: TargetLanguage) => Promise<FeedWordRecord[]>;
  saveWords: (words: FeedWord[], language: TargetLanguage) => Promise<void>;
  updateImage: (wordId: string, imageBlob: Blob) => Promise<void>;
  toggleBookmark: (wordId: string) => Promise<void>;
  removeWord: (wordId: string) => Promise<void>;
  getAllWords: () => Promise<string[]>;
  isLoading: boolean;
  error: string | null;
}

function getTodayDateKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function useFeedStorage(): UseFeedStorageReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTodayWords = useCallback(async (language: TargetLanguage): Promise<FeedWordRecord[]> => {
    setIsLoading(true);
    setError(null);
    try {
      const userRes = await supabase.auth.getUser();
      const userId = userRes.data.user?.id;
      if (!userId) return [];

      const todayKey = getTodayDateKey();
      const { data, error: dbError } = await supabase
        .from('feed_words')
        .select('*')
        .eq('user_id', userId)
        .eq('language', language)
        .eq('generated_date', todayKey)
        .order('created_at', { ascending: true });

      if (dbError) {
        throw dbError;
      }

      return (data || []).map((row) => {
        let imageUrls: string[] = [];
        let imageUrl = row.image_url;

        if (row.image_url) {
          if (row.image_url.startsWith('[')) {
            try {
              imageUrls = JSON.parse(row.image_url);
              imageUrl = imageUrls[0] || '';
            } catch {
              imageUrls = [row.image_url];
            }
          } else {
            imageUrls = [row.image_url];
          }
        }

        return {
          id: row.id,
          language: row.language as TargetLanguage,
          generatedDate: row.generated_date,
          thai: row.thai,
          bookmarked: row.bookmarked,
          imageBlob: null,
          imageUrl: imageUrl,
          imageUrls: imageUrls,
          createdAt: new Date(row.created_at).getTime(),
          partOfSpeech: row.part_of_speech,
          word: row.word,
          ipa: row.ipa,
        } as FeedWordRecord;
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load word.';
      setError(message);
      setIsLoading(false);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveWords = useCallback(
    async (words: FeedWord[], language: TargetLanguage): Promise<void> => {
      setIsLoading(true);
      setError(null);
      try {
        const userRes = await supabase.auth.getUser();
        const userId = userRes.data.user?.id;
        if (!userId) {
          throw new Error('User not authenticated.');
        }

        const todayKey = getTodayDateKey();
        const records = words.map((word) => {
          return {
            id: crypto.randomUUID(),
            user_id: userId,
            language,
            generated_date: todayKey,
            bookmarked: false,
            thai: word.thai,
            part_of_speech: word.partOfSpeech,
            image_url: word.imageUrls ? JSON.stringify(word.imageUrls) : word.imageUrl,
            created_at: new Date().toISOString(),
            word: word.word,
            ipa: word.ipa,
          };
        });

        const { error: dbError } = await supabase
          .from('feed_words')
          .insert(records);

        if (dbError) {
          throw dbError;
        }

        setIsLoading(false);
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
    []
  );

  const updateImage = useCallback(
    async (wordId: string, imageBlob: Blob): Promise<void> => {
      setIsLoading(true);
      setError(null);
      try {
        const userRes = await supabase.auth.getUser();
        const userId = userRes.data.user?.id;
        if (!userId) {
          throw new Error('User not authenticated.');
        }

        const filePath = `authenticated/${userId}/feed/${wordId}.png`;
        const { error: uploadError } = await supabase.storage
          .from('tarnly-media')
          .upload(filePath, imageBlob, {
            contentType: 'image/png',
            upsert: true,
          });

        if (uploadError) {
          throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('tarnly-media')
          .getPublicUrl(filePath);

        const { error: dbError } = await supabase
          .from('feed_words')
          .update({ image_url: publicUrl })
          .eq('id', wordId)
          .eq('user_id', userId);

        if (dbError) {
          throw dbError;
        }

        setIsLoading(false);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Failed to save image. Please try again.';
        setError(message);
        setIsLoading(false);
        throw err;
      }
    },
    []
  );

  const toggleBookmark = useCallback(
    async (wordId: string): Promise<void> => {
      setIsLoading(true);
      setError(null);
      try {
        const userRes = await supabase.auth.getUser();
        const userId = userRes.data.user?.id;
        if (!userId) {
          throw new Error('User not authenticated.');
        }

        const { data, error: selectError } = await supabase
          .from('feed_words')
          .select('bookmarked')
          .eq('id', wordId)
          .eq('user_id', userId)
          .single();

        if (selectError) {
          throw selectError;
        }

        const { error: dbError } = await supabase
          .from('feed_words')
          .update({ bookmarked: !data.bookmarked })
          .eq('id', wordId)
          .eq('user_id', userId);

        if (dbError) {
          throw dbError;
        }

        setIsLoading(false);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Failed to update bookmark. Please try again.';
        setError(message);
        setIsLoading(false);
        throw err;
      }
    },
    []
  );

  const removeWord = useCallback(
    async (wordId: string): Promise<void> => {
      try {
        const userRes = await supabase.auth.getUser();
        const userId = userRes.data.user?.id;
        if (!userId) return;

        const { error: dbError } = await supabase
          .from('feed_words')
          .delete()
          .eq('id', wordId)
          .eq('user_id', userId);

        if (dbError) {
          throw dbError;
        }

        const filePath = `authenticated/${userId}/feed/${wordId}.png`;
        await supabase.storage.from('tarnly-media').remove([filePath]);
      } catch (err) {
        console.error('Failed to remove feed word:', err);
        throw err;
      }
    },
    []
  );

  const getAllWords = useCallback(async (): Promise<string[]> => {
    setIsLoading(true);
    setError(null);
    try {
      const userRes = await supabase.auth.getUser();
      const userId = userRes.data.user?.id;
      if (!userId) return [];

      const { data, error: dbError } = await supabase
        .from('feed_words')
        .select('word')
        .eq('user_id', userId);

      if (dbError) {
        throw dbError;
      }

      return (data || []).map((row) => row.word).filter((k): k is string => !!k);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load word.';
      setError(message);
      setIsLoading(false);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    loadTodayWords,
    saveWords,
    updateImage,
    toggleBookmark,
    removeWord,
    getAllWords,
    isLoading,
    error,
  };
}
