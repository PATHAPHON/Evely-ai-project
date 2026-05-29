"use client";

import { useState, useCallback } from "react";
import {
  openDatabase,
  CAPTURES_STORE,
  FLASHCARDS_STORE,
  WORDS_STORE,
  FEED_WORDS_STORE,
  CONVERSATIONS_STORE,
  CONVERSATION_MESSAGES_STORE,
} from "@/app/_lib/db";

export interface UseDataResetReturn {
  resetAllData: () => Promise<void>;
  isResetting: boolean;
}

function clearStore(db: IDBDatabase, storeName: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function clearLocalStorageTarnlyKeys(): void {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith("tarnly:")) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((key) => localStorage.removeItem(key));
}

export function useDataReset(): UseDataResetReturn {
  const [isResetting, setIsResetting] = useState(false);

  const resetAllData = useCallback(async () => {
    setIsResetting(true);
    try {
      const db = await openDatabase();
      await Promise.all([
        clearStore(db, CAPTURES_STORE),
        clearStore(db, FLASHCARDS_STORE),
        clearStore(db, WORDS_STORE),
        clearStore(db, FEED_WORDS_STORE),
        clearStore(db, CONVERSATIONS_STORE),
        clearStore(db, CONVERSATION_MESSAGES_STORE),
      ]);
      db.close();
      clearLocalStorageTarnlyKeys();
    } catch (error) {
      console.error('Failed to reset data:', error);
      throw error;
    } finally {
      setIsResetting(false);
    }
  }, []);

  return { resetAllData, isResetting };
}
