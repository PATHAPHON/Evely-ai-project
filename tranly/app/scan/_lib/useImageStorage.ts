'use client';

import { useCallback, useRef, useState } from 'react';
import { CapturedImage } from './types';
import { INDEXED_DB_CONFIG } from './constants';

export interface UseImageStorageReturn {
  save: (blob: Blob) => Promise<string>;
  isLoading: boolean;
  error: string | null;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(INDEXED_DB_CONFIG.dbName, 2);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(INDEXED_DB_CONFIG.storeName)) {
        const store = db.createObjectStore(INDEXED_DB_CONFIG.storeName, {
          keyPath: INDEXED_DB_CONFIG.keyPath,
        });
        store.createIndex(
          INDEXED_DB_CONFIG.indexes.createdAt,
          INDEXED_DB_CONFIG.indexes.createdAt,
          { unique: false }
        );
      }
      // Create flashcards store if it doesn't exist (added in version 2)
      if (!db.objectStoreNames.contains('flashcards')) {
        const flashcardsStore = db.createObjectStore('flashcards', {
          keyPath: 'id',
        });
        flashcardsStore.createIndex('createdAt', 'createdAt', {
          unique: false,
        });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Custom hook for managing image storage in IndexedDB.
 * Provides a save function to persist captured images and exposes loading/error state.
 */
export function useImageStorage(): UseImageStorageReturn {
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
    async (blob: Blob): Promise<string> => {
      setIsLoading(true);
      setError(null);

      try {
        const db = await getDb();
        const id = crypto.randomUUID();
        const record: CapturedImage = {
          id,
          blob,
          createdAt: Date.now(),
        };

        await new Promise<void>((resolve, reject) => {
          const transaction = db.transaction(
            INDEXED_DB_CONFIG.storeName,
            'readwrite'
          );
          const store = transaction.objectStore(INDEXED_DB_CONFIG.storeName);
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
          err instanceof Error ? err.message : 'บันทึกภาพไม่สำเร็จ กรุณาลองอีกครั้ง';
        setError(message);
        setIsLoading(false);
        throw err;
      }
    },
    [getDb]
  );

  return { save, isLoading, error };
}
