'use client';

import { useEffect, useState } from 'react';
import {
  WORDS_STORE,
  CONVERSATIONS_STORE,
  CAPTURES_STORE,
  FLASHCARD_SETS_STORE,
  STUDY_SESSIONS_STORE,
  openDatabase,
  queryByLanguage,
} from '@/app/_lib/db';
import { useActiveLanguage } from '@/app/_lib/ActiveLanguageContext';
import type { TargetLanguage } from '@/app/_lib/wordTypes';

export interface LearningStats {
  totalWords: number;
  totalConversations: number;
  totalScans: number;
  isLoading: boolean;
}

export interface LanguageLearningStats {
  wordCount: number;
  flashcardSetCount: number;
  studySessionCount: number;
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

function countByLanguage(
  db: IDBDatabase,
  storeName: string,
  language: TargetLanguage
): Promise<number> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const index = store.index('language');
    const req = index.count(IDBKeyRange.only(language));
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

/**
 * Language-aware statistics hook.
 * Computes stats (word count, flashcard set count, study session count)
 * for the current active language only.
 * Returns 0 for each stat when no data exists.
 * Re-fetches when the active language changes.
 */
export function useLanguageLearningStats(): LanguageLearningStats {
  const { activeLanguage } = useActiveLanguage();
  const [wordCount, setWordCount] = useState(0);
  const [flashcardSetCount, setFlashcardSetCount] = useState(0);
  const [studySessionCount, setStudySessionCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      setIsLoading(true);
      try {
        const db = await openDatabase();

        const [words, sets, sessions] = await Promise.all([
          countByLanguage(db, WORDS_STORE, activeLanguage),
          countByLanguage(db, FLASHCARD_SETS_STORE, activeLanguage),
          countByLanguage(db, STUDY_SESSIONS_STORE, activeLanguage),
        ]);

        if (!cancelled) {
          setWordCount(words);
          setFlashcardSetCount(sets);
          setStudySessionCount(sessions);
        }
      } catch {
        // On error, keep counts at 0
        if (!cancelled) {
          setWordCount(0);
          setFlashcardSetCount(0);
          setStudySessionCount(0);
        }
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
  }, [activeLanguage]);

  return { wordCount, flashcardSetCount, studySessionCount, isLoading };
}
