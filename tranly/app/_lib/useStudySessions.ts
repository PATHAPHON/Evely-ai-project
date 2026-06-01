'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { STUDY_SESSIONS_STORE, openDatabase, queryByLanguage } from '@/app/_lib/db';
import { useActiveLanguage } from '@/app/_lib/ActiveLanguageContext';
import type { StudySession } from '@/app/_lib/studySessionTypes';

export interface UseStudySessionsReturn {
  sessions: StudySession[] | null;
  recordSession: (flashcardSetId: string, cardsReviewed: number) => Promise<void>;
}

export function useStudySessions(): UseStudySessionsReturn {
  const { activeLanguage } = useActiveLanguage();
  const [sessions, setSessions] = useState<StudySession[] | null>(null);
  const dbRef = useRef<IDBDatabase | null>(null);

  const getDb = useCallback(async (): Promise<IDBDatabase> => {
    if (dbRef.current) return dbRef.current;
    const db = await openDatabase();
    dbRef.current = db;
    return db;
  }, []);

  const refresh = useCallback(async () => {
    const db = await getDb();
    const records = await queryByLanguage<StudySession>(
      db,
      STUDY_SESSIONS_STORE,
      activeLanguage
    );
    records.sort((a, b) => b.completedAt - a.completedAt);
    setSessions(records);
  }, [getDb, activeLanguage]);

  useEffect(() => {
    refresh().catch(() => setSessions([]));
  }, [refresh]);

  const recordSession = useCallback(
    async (flashcardSetId: string, cardsReviewed: number) => {
      if (cardsReviewed < 1) return;

      const db = await getDb();
      const session: StudySession = {
        id: crypto.randomUUID(),
        language: activeLanguage,
        flashcardSetId,
        completedAt: Date.now(),
        cardsReviewed,
      };
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STUDY_SESSIONS_STORE, 'readwrite');
        const req = tx.objectStore(STUDY_SESSIONS_STORE).put(session);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
      await refresh();
    },
    [getDb, refresh, activeLanguage]
  );

  return { sessions, recordSession };
}
