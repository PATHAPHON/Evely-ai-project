'use client';

import { useCallback, useRef, useState } from 'react';
import { WORDS_STORE, FEED_WORDS_STORE, openDatabase } from '@/app/_lib/db';
import type { SavedWord } from './types';
import type { WordRecord } from '@/app/learn/_lib/useWordStorage';
import type { FeedWordRecord } from '@/app/home/_lib/types';

export interface UseWordContextReturn {
  savedWords: SavedWord[];
  loadSavedWords: () => Promise<void>;
  isLoading: boolean;
}

export function useWordContext(): UseWordContextReturn {
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

      // Load words from Word Store
      const wordRecords = await new Promise<WordRecord[]>((resolve, reject) => {
        const tx = db.transaction(WORDS_STORE, 'readonly');
        const store = tx.objectStore(WORDS_STORE);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result as WordRecord[]);
        req.onerror = () => reject(req.error);
      });

      // Load bookmarked words from Feed Words store
      const feedRecords = await new Promise<FeedWordRecord[]>((resolve, reject) => {
        const tx = db.transaction(FEED_WORDS_STORE, 'readonly');
        const store = tx.objectStore(FEED_WORDS_STORE);
        const req = store.getAll();
        req.onsuccess = () => {
          const all = req.result as FeedWordRecord[];
          resolve(all.filter((r) => r.bookmarked));
        };
        req.onerror = () => reject(req.error);
      });

      // Map Word Store records to SavedWord
      const wordsFromStore: SavedWord[] = wordRecords
        .filter((r) => r.korean)
        .map((r) => ({
          id: r.id,
          korean: r.korean ?? '',
          reading: r.reading ?? '',
          romanization: r.romanization ?? '',
          english: r.english ?? '',
          thai: (r.label && r.label !== r.korean) ? r.label : '',
          source: 'word-store' as const,
        }));

      // Map Feed Words records to SavedWord
      const wordsFromFeed: SavedWord[] = feedRecords.map((r) => ({
        id: r.id,
        korean: r.korean,
        reading: r.reading,
        romanization: r.romanization,
        english: r.english,
        thai: r.thai,
        source: 'feed-words' as const,
      }));

      setSavedWords([...wordsFromStore, ...wordsFromFeed]);
    } finally {
      setIsLoading(false);
    }
  }, [getDb]);

  return { savedWords, loadSavedWords, isLoading };
}
