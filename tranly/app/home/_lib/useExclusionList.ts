'use client';

import { useCallback, useRef } from 'react';
import { WORDS_STORE, FEED_WORDS_STORE, openDatabase } from '@/app/_lib/db';
import type { WordRecord } from '@/app/learn/_lib/useWordStorage';
import type { FeedWordRecord } from './types';

export interface UseExclusionListReturn {
  getExclusionList: () => Promise<string[]>;
}

export function useExclusionList(): UseExclusionListReturn {
  const dbRef = useRef<IDBDatabase | null>(null);

  const getDb = useCallback(async (): Promise<IDBDatabase> => {
    if (dbRef.current) return dbRef.current;
    const db = await openDatabase();
    dbRef.current = db;
    return db;
  }, []);

  const getExclusionList = useCallback(async (): Promise<string[]> => {
    const db = await getDb();

    const scannedWords = await new Promise<string[]>((resolve, reject) => {
      const tx = db.transaction(WORDS_STORE, 'readonly');
      const store = tx.objectStore(WORDS_STORE);
      const req = store.getAll();
      req.onsuccess = () => {
        const records = req.result as WordRecord[];
        const koreanWords = records
          .map((r) => r.korean)
          .filter((k): k is string => !!k);
        resolve(koreanWords);
      };
      req.onerror = () => reject(req.error);
    });

    const feedWords = await new Promise<string[]>((resolve, reject) => {
      const tx = db.transaction(FEED_WORDS_STORE, 'readonly');
      const store = tx.objectStore(FEED_WORDS_STORE);
      const req = store.getAll();
      req.onsuccess = () => {
        const records = req.result as FeedWordRecord[];
        resolve(records.map((r) => r.korean));
      };
      req.onerror = () => reject(req.error);
    });

    const combined = [...scannedWords, ...feedWords];
    const deduplicated = [...new Set(combined)];
    return deduplicated;
  }, [getDb]);

  return { getExclusionList };
}
