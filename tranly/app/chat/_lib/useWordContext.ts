'use client';

import { useCallback, useRef, useState } from 'react';
import {
  WORDS_STORE,
  FEED_WORDS_STORE,
  openDatabase,
  queryByLanguage,
} from '@/app/_lib/db';
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
    reading: ['reading', 'thaiReading'],
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
  const thai = pick(record, ['thai', 'thaiTranslation']);
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
  const dbRef = useRef<IDBDatabase | null>(null);

  const getDb = useCallback(async (): Promise<IDBDatabase> => {
    if (dbRef.current) return dbRef.current;
    const db = await openDatabase();
    dbRef.current = db;
    return db;
  }, []);

  const loadSavedWords = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      const db = await getDb();

      // Only words belonging to the active learning language — leave the
      // selection empty when there are none for that language.
      const [wordRecords, feedRecords] = await Promise.all([
        queryByLanguage<Record<string, unknown>>(db, WORDS_STORE, activeLanguage),
        queryByLanguage<Record<string, unknown>>(
          db,
          FEED_WORDS_STORE,
          activeLanguage
        ),
      ]);

      const wordsFromStore: SavedWord[] = wordRecords
        .map((r) => toSavedWord(r, activeLanguage, 'word-store'))
        .filter((w) => w.korean.length > 0);

      const wordsFromFeed: SavedWord[] = feedRecords
        .filter((r) => r.bookmarked === true)
        .map((r) => toSavedWord(r, activeLanguage, 'feed-words'))
        .filter((w) => w.korean.length > 0);

      setSavedWords([...wordsFromStore, ...wordsFromFeed]);
    } finally {
      setIsLoading(false);
    }
  }, [getDb, activeLanguage]);

  return { savedWords, loadSavedWords, isLoading };
}
