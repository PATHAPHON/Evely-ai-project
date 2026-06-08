'use client';

import { useCallback } from 'react';
import { supabase } from '@/app/_lib/supabaseClient';
import type { FeedWordRecord } from './types';
import type { TargetLanguage } from '@/app/_lib/wordTypes';

export interface UseRejectedStorageReturn {
  saveRejected: (word: FeedWordRecord, language: TargetLanguage) => Promise<void>;
  loadRejected: (language: TargetLanguage) => Promise<FeedWordRecord[]>;
  removeRejected: (language: TargetLanguage, wordKey: string) => Promise<void>;
}

/** The native-script primary word used as the dedup key for the record's language. */
function getWordKey(word: FeedWordRecord): string {
  if (word.korean) return word.korean;
  if (word.kanji) return word.kanji;
  if (word.hanzi) return word.hanzi;
  if (word.word) return word.word;
  return '';
}

/**
 * Storage for words the user rejected ("ไม่รับ") in the feed. Rejected words are
 * pooled per user+language and shuffled back into the queue when it runs out.
 * A word rejected more than twice (3rd time) is deleted permanently instead.
 */
export function useRejectedStorage(): UseRejectedStorageReturn {
  const saveRejected = useCallback(
    async (word: FeedWordRecord, language: TargetLanguage): Promise<void> => {
      try {
        const userRes = await supabase.auth.getUser();
        const userId = userRes.data.user?.id;
        if (!userId) return;

        const wordKey = getWordKey(word);
        if (!wordKey) return;

        const { data: existing } = await supabase
          .from('rejected_words')
          .select('reject_count')
          .eq('user_id', userId)
          .eq('language', language)
          .eq('word_key', wordKey)
          .maybeSingle();

        // Rejected twice already — this is the 3rd time: drop it for good.
        if (existing && existing.reject_count >= 2) {
          await supabase
            .from('rejected_words')
            .delete()
            .eq('user_id', userId)
            .eq('language', language)
            .eq('word_key', wordKey);
          return;
        }

        const nextCount = (existing?.reject_count ?? 0) + 1;
        const { error: dbError } = await supabase.from('rejected_words').upsert(
          {
            user_id: userId,
            language,
            word_key: wordKey,
            reject_count: nextCount,
            thai: word.thai,
            part_of_speech: word.partOfSpeech,
            image_url: word.imageUrls ? JSON.stringify(word.imageUrls) : word.imageUrl,
            kanji: word.kanji,
            hiragana: word.hiragana,
            romaji: word.romaji,
            korean: word.korean,
            reading: word.reading,
            romanization: word.romanization,
            english: word.english,
            hanzi: word.hanzi,
            pinyin: word.pinyin,
            word: word.word,
            ipa: word.ipa,
          },
          { onConflict: 'user_id,language,word_key' }
        );

        if (dbError) throw dbError;
      } catch (err) {
        console.error('Failed to save rejected word:', err);
      }
    },
    []
  );

  const loadRejected = useCallback(
    async (language: TargetLanguage): Promise<FeedWordRecord[]> => {
      try {
        const userRes = await supabase.auth.getUser();
        const userId = userRes.data.user?.id;
        if (!userId) return [];

        const { data, error: dbError } = await supabase
          .from('rejected_words')
          .select('*')
          .eq('user_id', userId)
          .eq('language', language);

        if (dbError) throw dbError;

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
            generatedDate: '',
            thai: row.thai,
            bookmarked: false,
            imageBlob: null,
            imageUrl,
            imageUrls,
            createdAt: new Date(row.created_at).getTime(),
            partOfSpeech: row.part_of_speech,
            kanji: row.kanji,
            hiragana: row.hiragana,
            romaji: row.romaji,
            korean: row.korean,
            reading: row.reading,
            romanization: row.romanization,
            english: row.english,
            hanzi: row.hanzi,
            pinyin: row.pinyin,
            word: row.word,
            ipa: row.ipa,
          } as FeedWordRecord;
        });
      } catch (err) {
        console.error('Failed to load rejected words:', err);
        return [];
      }
    },
    []
  );

  const removeRejected = useCallback(
    async (language: TargetLanguage, wordKey: string): Promise<void> => {
      if (!wordKey) return;
      try {
        const userRes = await supabase.auth.getUser();
        const userId = userRes.data.user?.id;
        if (!userId) return;

        await supabase
          .from('rejected_words')
          .delete()
          .eq('user_id', userId)
          .eq('language', language)
          .eq('word_key', wordKey);
      } catch (err) {
        console.error('Failed to remove rejected word:', err);
      }
    },
    []
  );

  return { saveRejected, loadRejected, removeRejected };
}
