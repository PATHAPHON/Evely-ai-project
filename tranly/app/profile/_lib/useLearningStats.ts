'use client';

import { useEffect, useState } from 'react';
import {
  WORDS_STORE,
  CONVERSATIONS_STORE,
  CAPTURES_STORE,
  openDatabase,
} from '@/app/_lib/db';

export interface LearningStats {
  totalWords: number;
  totalConversations: number;
  totalScans: number;
  isLoading: boolean;
}

function countRecords(db: IDBDatabase, storeName: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function useLearningStats(): LearningStats {
  const [totalWords, setTotalWords] = useState(0);
  const [totalConversations, setTotalConversations] = useState(0);
  const [totalScans, setTotalScans] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      try {
        const db = await openDatabase();

        const [words, conversations, scans] = await Promise.all([
          countRecords(db, WORDS_STORE),
          countRecords(db, CONVERSATIONS_STORE),
          countRecords(db, CAPTURES_STORE),
        ]);

        if (!cancelled) {
          setTotalWords(words);
          setTotalConversations(conversations);
          setTotalScans(scans);
        }
      } catch {
        // On error, keep counts at 0
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadStats();

    return () => {
      cancelled = true;
    };
  }, []);

  return { totalWords, totalConversations, totalScans, isLoading };
}
