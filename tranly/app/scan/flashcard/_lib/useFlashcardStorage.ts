'use client';

import { useCallback, useRef, useState } from 'react';
import { FlashcardRecord } from './types';
import { FLASHCARDS_STORE, openDatabase } from '@/app/_lib/db';

const STORE_NAME = FLASHCARDS_STORE;

export interface UseFlashcardStorageReturn {
  save: (imageBlob: Blob, label: string) => Promise<string>;
  isLoading: boolean;
  error: string | null;
}

/**
 * Custom hook for managing flashcard storage in IndexedDB.
 * Provides a save function to persist flashcard records and exposes loading/error state.
 */
export function useFlashcardStorage(): UseFlashcardStorageReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dbRef = useRef<IDBDatabase | null>(null);

  const getDb = useCallback(async (): Promise<IDBDatabase> => {
    if (dbRef.current) {
      return dbRef.current;
    }
    const db = await openDatabase();
    dbRef.current = db;
    return db;
  }, []);

  const save = useCallback(
    async (imageBlob: Blob, label: string): Promise<string> => {
      setIsLoading(true);
      setError(null);

      try {
        const db = await getDb();
        const id = crypto.randomUUID();
        const record: FlashcardRecord = {
          id,
          imageBlob,
          label,
          createdAt: Date.now(),
        };

        await new Promise<void>((resolve, reject) => {
          const transaction = db.transaction(STORE_NAME, 'readwrite');
          const store = transaction.objectStore(STORE_NAME);
          const request = store.put(record);

          request.onsuccess = () => {
            resolve();
          };

          request.onerror = () => {
            reject(request.error);
          };

          transaction.onerror = () => {
            reject(transaction.error);
          };
        });

        setIsLoading(false);
        return id;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'บันทึก Flashcard ไม่สำเร็จ กรุณาลองอีกครั้ง';
        setError(message);
        setIsLoading(false);
        throw err;
      }
    },
    [getDb]
  );

  return { save, isLoading, error };
}
