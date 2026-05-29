'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { FLASHCARD_SETS_STORE, openDatabase } from '@/app/_lib/db';

export interface FlashcardSet {
  id: string;
  name: string;
  wordIds: string[];
  createdAt: number;
}

export interface UseFlashcardSetsReturn {
  sets: FlashcardSet[] | null;
  createSet: (name: string, wordIds: string[]) => Promise<void>;
  removeSet: (id: string) => Promise<void>;
}

export function useFlashcardSets(): UseFlashcardSetsReturn {
  const [sets, setSets] = useState<FlashcardSet[] | null>(null);
  const dbRef = useRef<IDBDatabase | null>(null);

  const getDb = useCallback(async (): Promise<IDBDatabase> => {
    if (dbRef.current) return dbRef.current;
    const db = await openDatabase();
    dbRef.current = db;
    return db;
  }, []);

  const refresh = useCallback(async () => {
    const db = await getDb();
    const records = await new Promise<FlashcardSet[]>((resolve, reject) => {
      const tx = db.transaction(FLASHCARD_SETS_STORE, 'readonly');
      const req = tx.objectStore(FLASHCARD_SETS_STORE).getAll();
      req.onsuccess = () => resolve(req.result as FlashcardSet[]);
      req.onerror = () => reject(req.error);
    });
    records.sort((a, b) => b.createdAt - a.createdAt);
    setSets(records);
  }, [getDb]);

  useEffect(() => {
    refresh().catch(() => setSets([]));
  }, [refresh]);

  const createSet = useCallback(
    async (name: string, wordIds: string[]) => {
      const db = await getDb();
      const record: FlashcardSet = {
        id: crypto.randomUUID(),
        name,
        wordIds,
        createdAt: Date.now(),
      };
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(FLASHCARD_SETS_STORE, 'readwrite');
        const req = tx.objectStore(FLASHCARD_SETS_STORE).put(record);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
      await refresh();
    },
    [getDb, refresh]
  );

  const removeSet = useCallback(
    async (id: string) => {
      const db = await getDb();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(FLASHCARD_SETS_STORE, 'readwrite');
        const req = tx.objectStore(FLASHCARD_SETS_STORE).delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
      await refresh();
    },
    [getDb, refresh]
  );

  return { sets, createSet, removeSet };
}
