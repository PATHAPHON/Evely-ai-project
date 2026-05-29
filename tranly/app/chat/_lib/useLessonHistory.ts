'use client';

import { useCallback, useRef, useState } from 'react';
import { LESSONS_STORE, openDatabase } from '@/app/_lib/db';
import type { LessonRecord } from './lessonTypes';

export interface UseLessonHistoryReturn {
  lessons: LessonRecord[];
  loadLessons: () => Promise<void>;
  saveLesson: (lesson: LessonRecord) => Promise<void>;
  deleteLesson: (lessonId: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

/**
 * Persistence for generated lessons so they can be replayed later.
 * Mirrors useConversationHistory but uses a single object store.
 */
export function useLessonHistory(): UseLessonHistoryReturn {
  const [lessons, setLessons] = useState<LessonRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dbRef = useRef<IDBDatabase | null>(null);

  const getDb = useCallback(async (): Promise<IDBDatabase> => {
    if (dbRef.current) return dbRef.current;
    const db = await openDatabase();
    dbRef.current = db;
    return db;
  }, []);

  const loadLessons = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const db = await getDb();
      const records = await new Promise<LessonRecord[]>((resolve, reject) => {
        const tx = db.transaction(LESSONS_STORE, 'readonly');
        const store = tx.objectStore(LESSONS_STORE);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result as LessonRecord[]);
        req.onerror = () => reject(req.error);
      });
      records.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setLessons(records);
      setIsLoading(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'โหลดบทเรียนที่บันทึกไว้ไม่สำเร็จ';
      setError(message);
      setIsLoading(false);
      throw err;
    }
  }, [getDb]);

  const saveLesson = useCallback(
    async (lesson: LessonRecord): Promise<void> => {
      setError(null);
      try {
        const db = await getDb();
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(LESSONS_STORE, 'readwrite');
          tx.objectStore(LESSONS_STORE).put(lesson);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'บันทึกบทเรียนไม่สำเร็จ กรุณาลองอีกครั้ง';
        setError(message);
        throw err;
      }
    },
    [getDb]
  );

  const deleteLesson = useCallback(
    async (lessonId: string): Promise<void> => {
      setError(null);
      try {
        const db = await getDb();
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(LESSONS_STORE, 'readwrite');
          tx.objectStore(LESSONS_STORE).delete(lessonId);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
        setLessons((prev) => prev.filter((l) => l.id !== lessonId));
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'ลบบทเรียนไม่สำเร็จ กรุณาลองอีกครั้ง';
        setError(message);
        throw err;
      }
    },
    [getDb]
  );

  return {
    lessons,
    loadLessons,
    saveLesson,
    deleteLesson,
    isLoading,
    error,
  };
}
