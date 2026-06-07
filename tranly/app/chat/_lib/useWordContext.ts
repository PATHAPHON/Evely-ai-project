'use client';

import { useCallback, useState } from 'react';
import { supabase } from '@/app/_lib/supabaseClient';
import { useActiveLanguage } from '@/app/_lib/ActiveLanguageContext';
import type { TargetLanguage } from '@/app/_lib/wordTypes';
import type { SavedWord } from './types';

export interface UseWordContextReturn {
  savedWords: SavedWord[];
  loadSavedWords: () => Promise<void>;
  isLoading: boolean;
}

/**
 * The vocabulary stores are mid-migration, so the same logical field can live
 * under language-specific keys (e.g. the native word is `korean`/`hangul` for
 * Korean but `kanji` for Japanese). These maps list the candidate keys to read
 * for each SavedWord field, in priority order, per language.
 */
const FIELD_KEYS: Record<
  TargetLanguage,
  { native: string[]; reading: string[]; romanization: string[]; english: string[] }
> = {
  korean: {
    native: ['korean', 'hangul'],
    reading: ['reading', 'thaiReading', 'thai_reading'],
    romanization: ['romanization'],
    english: ['english'],
  },
  japanese: {
    native: ['kanji'],
    reading: ['hiragana', 'romaji'],
    romanization: ['romaji'],
    english: ['english'],
  },
  chinese: {
    native: ['hanzi'],
    reading: ['pinyin'],
    romanization: ['pinyin'],
    english: ['english'],
  },
  english: {
    native: ['word', 'english'],
    reading: ['ipa'],
    romanization: ['word', 'english'],
    english: ['word', 'english'],
  },
};

/** Return the first non-empty string value among the candidate keys. */
function pick(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim().length > 0) return value;
  }
  return '';
}

/** Map a raw store record to a SavedWord for the given language. */
function toSavedWord(
  record: Record<string, unknown>,
  language: TargetLanguage,
  source: SavedWord['source']
): SavedWord {
  const keys = FIELD_KEYS[language];
  const native = pick(record, keys.native);
  const thai = pick(record, ['thai', 'thaiTranslation', 'thai_translation', 'label']);
  const label = typeof record.label === 'string' ? record.label : '';
  return {
    id: String(record.id),
    korean: native,
    reading: pick(record, keys.reading),
    romanization: pick(record, keys.romanization),
    english: pick(record, keys.english),
    // Prefer an explicit Thai meaning; fall back to a label only when it isn't
    // just a copy of the native word.
    thai: thai || (label && label !== native ? label : ''),
    source,
  };
}

export function useWordContext(): UseWordContextReturn {
  const { activeLanguage } = useActiveLanguage();
  const [savedWords, setSavedWords] = useState<SavedWord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadSavedWords = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      const userRes = await supabase.auth.getUser();
      const userId = userRes.data.user?.id;
      if (!userId) {
        setSavedWords([]);
        return;
      }

      // Query words and feed_words directly from Supabase
      const [wordsRes, feedWordsRes] = await Promise.all([
        supabase
          .from('words')
          .select('*')
          .eq('user_id', userId)
          .eq('language', activeLanguage),
        supabase
          .from('feed_words')
          .select('*')
          .eq('user_id', userId)
          .eq('language', activeLanguage)
          .eq('bookmarked', true),
      ]);

      if (wordsRes.error) {
        console.error('Error fetching words from Supabase:', wordsRes.error);
      }
      if (feedWordsRes.error) {
        console.error('Error fetching bookmarked feed words from Supabase:', feedWordsRes.error);
      }

      const wordsFromStore: SavedWord[] = (wordsRes.data || [])
        .map((r) => toSavedWord(r as Record<string, unknown>, activeLanguage, 'word-store'))
        .filter((w) => w.korean.length > 0);

      const wordsFromFeed: SavedWord[] = (feedWordsRes.data || [])
        .map((r) => toSavedWord(r as Record<string, unknown>, activeLanguage, 'feed-words'))
        .filter((w) => w.korean.length > 0);

      setSavedWords([...wordsFromStore, ...wordsFromFeed]);
    } catch (err) {
      console.error('Failed to load words from Supabase:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeLanguage]);

  return { savedWords, loadSavedWords, isLoading };
}
