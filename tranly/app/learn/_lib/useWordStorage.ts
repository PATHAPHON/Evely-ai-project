'use client';

import { useCallback, useRef, useState } from 'react';
import { WORDS_STORE, openDatabase } from '@/app/_lib/db';

export interface WordRecord {
  id: string;
  imageBlob: Blob;
  label: string;
  korean?: string;
  reading?: string;
  romanization?: string;
  english?: string;
  createdAt: number;
}

export interface SaveWordInput {
  label: string;
  korean?: string;
  reading?: string;
  romanization?: string;
  english?: string;
}

export interface UseWordStorageReturn {
  save: (imageBlob: Blob, input: SaveWordInput | string) => Promise<string>;
  list: () => Promise<WordRecord[]>;
  remove: (id: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export function useWordStorage(): UseWordStorageReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dbRef = useRef<IDBDatabase | null>(null);

  const getDb = useCallback(async (): Promise<IDBDatabase> => {
    if (dbRef.current) return dbRef.current;
    const db = await openDatabase();
    dbRef.current = db;
    return db;
  }, []);

  const save = useCallback(
    async (
      imageBlob: Blob,
      input: SaveWordInput | string
    ): Promise<string> => {
      setIsLoading(true);
      setError(null);
      try {
        const db = await getDb();
        const id = crypto.randomUUID();
        const normalized: SaveWordInput =
          typeof input === 'string' ? { label: input } : input;
        const record: WordRecord = {
          id,
          imageBlob,
          label: normalized.label,
          korean: normalized.korean,
          reading: normalized.reading,
          romanization: normalized.romanization,
          english: normalized.english,
          createdAt: Date.now(),
        };
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(WORDS_STORE, 'readwrite');
          const store = tx.objectStore(WORDS_STORE);
          const req = store.put(record);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
          tx.onerror = () => reject(tx.error);
        });
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
    [getDb]
  );

  const list = useCallback(async (): Promise<WordRecord[]> => {
    setIsLoading(true);
    setError(null);
    try {
      const db = await getDb();
      const records = await new Promise<WordRecord[]>((resolve, reject) => {
        const tx = db.transaction(WORDS_STORE, 'readonly');
        const store = tx.objectStore(WORDS_STORE);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result as WordRecord[]);
        req.onerror = () => reject(req.error);
      });
      records.sort((a, b) => b.createdAt - a.createdAt);
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

  const remove = useCallback(
    async (id: string): Promise<void> => {
      const db = await getDb();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(WORDS_STORE, 'readwrite');
        const req = tx.objectStore(WORDS_STORE).delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    },
    [getDb]
  );

  return { save, list, remove, isLoading, error };
}
