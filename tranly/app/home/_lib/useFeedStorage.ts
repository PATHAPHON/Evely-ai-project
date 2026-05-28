'use client';

import { useCallback, useRef, useState } from 'react';
import { FEED_WORDS_STORE, openDatabase } from '@/app/_lib/db';
import type { FeedWord, FeedWordRecord } from './types';

export interface UseFeedStorageReturn {
  loadTodayWords: () => Promise<FeedWordRecord[]>;
  saveWords: (words: FeedWord[]) => Promise<void>;
  updateImage: (wordId: string, imageBlob: Blob) => Promise<void>;
  toggleBookmark: (wordId: string) => Promise<void>;
  removeWord: (wordId: string) => Promise<void>;
  getAllKoreanWords: () => Promise<string[]>;
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
  const dbRef = useRef<IDBDatabase | null>(null);

  const getDb = useCallback(async (): Promise<IDBDatabase> => {
    if (dbRef.current) return dbRef.current;
    const db = await openDatabase();
    dbRef.current = db;
    return db;
  }, []);

  const loadTodayWords = useCallback(async (): Promise<FeedWordRecord[]> => {
    setIsLoading(true);
    setError(null);
    try {
      const db = await getDb();
      const todayKey = getTodayDateKey();
      const records = await new Promise<FeedWordRecord[]>((resolve, reject) => {
        const tx = db.transaction(FEED_WORDS_STORE, 'readonly');
        const store = tx.objectStore(FEED_WORDS_STORE);
        const index = store.index('generatedDate');
        const req = index.getAll(todayKey);
        req.onsuccess = () => resolve(req.result as FeedWordRecord[]);
        req.onerror = () => reject(req.error);
      });
      records.sort((a, b) => a.createdAt - b.createdAt);
      setIsLoading(false);
      return records;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load word.';
      setError(message);
      setIsLoading(false);
      throw err;
    }
  }, [getDb]);

  const saveWords = useCallback(
    async (words: FeedWord[]): Promise<void> => {
      setIsLoading(true);
      setError(null);
      try {
        const db = await getDb();
        const todayKey = getTodayDateKey();
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(FEED_WORDS_STORE, 'readwrite');
          const store = tx.objectStore(FEED_WORDS_STORE);
          for (const word of words) {
            const record: FeedWordRecord = {
              id: crypto.randomUUID(),
              korean: word.korean,
              reading: word.reading,
              romanization: word.romanization,
              english: word.english,
              thai: word.thai,
              generatedDate: todayKey,
              bookmarked: false,
              imageBlob: null,
              createdAt: Date.now(),
            };
            store.put(record);
          }
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
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
    [getDb]
  );

  const updateImage = useCallback(
    async (wordId: string, imageBlob: Blob): Promise<void> => {
      setIsLoading(true);
      setError(null);
      try {
        const db = await getDb();
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(FEED_WORDS_STORE, 'readwrite');
          const store = tx.objectStore(FEED_WORDS_STORE);
          const getReq = store.get(wordId);
          getReq.onsuccess = () => {
            const record = getReq.result as FeedWordRecord | undefined;
            if (!record) {
              reject(new Error('Word not found.'));
              return;
            }
            record.imageBlob = imageBlob;
            const putReq = store.put(record);
            putReq.onsuccess = () => resolve();
            putReq.onerror = () => reject(putReq.error);
          };
          getReq.onerror = () => reject(getReq.error);
          tx.onerror = () => reject(tx.error);
        });
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
    [getDb]
  );

  const toggleBookmark = useCallback(
    async (wordId: string): Promise<void> => {
      setIsLoading(true);
      setError(null);
      try {
        const db = await getDb();
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(FEED_WORDS_STORE, 'readwrite');
          const store = tx.objectStore(FEED_WORDS_STORE);
          const getReq = store.get(wordId);
          getReq.onsuccess = () => {
            const record = getReq.result as FeedWordRecord | undefined;
            if (!record) {
              reject(new Error('Word not found.'));
              return;
            }
            record.bookmarked = !record.bookmarked;
            const putReq = store.put(record);
            putReq.onsuccess = () => resolve();
            putReq.onerror = () => reject(putReq.error);
          };
          getReq.onerror = () => reject(getReq.error);
          tx.onerror = () => reject(tx.error);
        });
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
    [getDb]
  );

  const removeWord = useCallback(
    async (wordId: string): Promise<void> => {
      const db = await getDb();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(FEED_WORDS_STORE, 'readwrite');
        const req = tx.objectStore(FEED_WORDS_STORE).delete(wordId);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    },
    [getDb]
  );

  const getAllKoreanWords = useCallback(async (): Promise<string[]> => {
    setIsLoading(true);
    setError(null);
    try {
      const db = await getDb();
      const words = await new Promise<string[]>((resolve, reject) => {
        const tx = db.transaction(FEED_WORDS_STORE, 'readonly');
        const store = tx.objectStore(FEED_WORDS_STORE);
        const req = store.getAll();
        req.onsuccess = () => {
          const records = req.result as FeedWordRecord[];
          resolve(records.map((r) => r.korean));
        };
        req.onerror = () => reject(req.error);
      });
      setIsLoading(false);
      return words;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load word.';
      setError(message);
      setIsLoading(false);
      throw err;
    }
  }, [getDb]);

  return {
    loadTodayWords,
    saveWords,
    updateImage,
    toggleBookmark,
    removeWord,
    getAllKoreanWords,
    isLoading,
    error,
  };
}
