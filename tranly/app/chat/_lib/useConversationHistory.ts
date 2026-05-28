'use client';

import { useCallback, useRef, useState } from 'react';
import {
  CONVERSATIONS_STORE,
  CONVERSATION_MESSAGES_STORE,
  openDatabase,
} from '@/app/_lib/db';
import type {
  ChatMessage,
  ConversationMessageRecord,
  ConversationSessionRecord,
} from './types';

export interface UseConversationHistoryReturn {
  sessions: ConversationSessionRecord[];
  loadSessions: () => Promise<void>;
  loadSessionMessages: (sessionId: string) => Promise<ChatMessage[]>;
  saveSession: (session: ConversationSessionRecord) => Promise<void>;
  saveMessage: (sessionId: string, message: ChatMessage) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export function useConversationHistory(): UseConversationHistoryReturn {
  const [sessions, setSessions] = useState<ConversationSessionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dbRef = useRef<IDBDatabase | null>(null);

  const getDb = useCallback(async (): Promise<IDBDatabase> => {
    if (dbRef.current) return dbRef.current;
    const db = await openDatabase();
    dbRef.current = db;
    return db;
  }, []);

  const loadSessions = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const db = await getDb();
      const records = await new Promise<ConversationSessionRecord[]>(
        (resolve, reject) => {
          const tx = db.transaction(CONVERSATIONS_STORE, 'readonly');
          const store = tx.objectStore(CONVERSATIONS_STORE);
          const req = store.getAll();
          req.onsuccess = () =>
            resolve(req.result as ConversationSessionRecord[]);
          req.onerror = () => reject(req.error);
        }
      );
      records.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setSessions(records);
      setIsLoading(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'โหลดประวัติสนทนาไม่สำเร็จ';
      setError(message);
      setIsLoading(false);
      throw err;
    }
  }, [getDb]);

  const loadSessionMessages = useCallback(
    async (sessionId: string): Promise<ChatMessage[]> => {
      setIsLoading(true);
      setError(null);
      try {
        const db = await getDb();
        const records = await new Promise<ConversationMessageRecord[]>(
          (resolve, reject) => {
            const tx = db.transaction(
              CONVERSATION_MESSAGES_STORE,
              'readonly'
            );
            const store = tx.objectStore(CONVERSATION_MESSAGES_STORE);
            const index = store.index('sessionId');
            const req = index.getAll(sessionId);
            req.onsuccess = () =>
              resolve(req.result as ConversationMessageRecord[]);
            req.onerror = () => reject(req.error);
          }
        );
        records.sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        const messages: ChatMessage[] = records.map((r) => ({
          id: r.id,
          role: r.role,
          korean: r.korean,
          reading: r.reading,
          romanization: r.romanization,
          translation: r.translation,
          english: (r as ConversationMessageRecord & { english?: string }).english ?? '',
          rawText: r.rawText,
          timestamp: r.timestamp,
          status: 'sent' as const,
        }));
        setIsLoading(false);
        return messages;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'โหลดข้อความไม่สำเร็จ';
        setError(message);
        setIsLoading(false);
        throw err;
      }
    },
    [getDb]
  );

  const saveSession = useCallback(
    async (session: ConversationSessionRecord): Promise<void> => {
      setIsLoading(true);
      setError(null);
      try {
        const db = await getDb();
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(CONVERSATIONS_STORE, 'readwrite');
          const store = tx.objectStore(CONVERSATIONS_STORE);
          store.put(session);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
        setIsLoading(false);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'บันทึกเซสชันไม่สำเร็จ กรุณาลองอีกครั้ง';
        setError(message);
        setIsLoading(false);
        throw err;
      }
    },
    [getDb]
  );

  const saveMessage = useCallback(
    async (sessionId: string, message: ChatMessage): Promise<void> => {
      setIsLoading(true);
      setError(null);
      try {
        const db = await getDb();
        const record: ConversationMessageRecord = {
          id: message.id,
          sessionId,
          role: message.role,
          korean: message.korean,
          reading: message.reading,
          romanization: message.romanization,
          translation: message.translation,
          english: message.english,
          rawText: message.rawText,
          timestamp: message.timestamp,
        };
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(
            CONVERSATION_MESSAGES_STORE,
            'readwrite'
          );
          const store = tx.objectStore(CONVERSATION_MESSAGES_STORE);
          store.put(record);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
        setIsLoading(false);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'บันทึกข้อความไม่สำเร็จ กรุณาลองอีกครั้ง';
        setError(message);
        setIsLoading(false);
        throw err;
      }
    },
    [getDb]
  );

  const deleteSession = useCallback(
    async (sessionId: string): Promise<void> => {
      setIsLoading(true);
      setError(null);
      try {
        const db = await getDb();
        // Delete all messages for this session first
        const messageIds = await new Promise<string[]>((resolve, reject) => {
          const tx = db.transaction(
            CONVERSATION_MESSAGES_STORE,
            'readonly'
          );
          const store = tx.objectStore(CONVERSATION_MESSAGES_STORE);
          const index = store.index('sessionId');
          const req = index.getAll(sessionId);
          req.onsuccess = () => {
            const records = req.result as ConversationMessageRecord[];
            resolve(records.map((r) => r.id));
          };
          req.onerror = () => reject(req.error);
        });

        // Delete messages and session in a single transaction
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(
            [CONVERSATIONS_STORE, CONVERSATION_MESSAGES_STORE],
            'readwrite'
          );
          const messagesStore = tx.objectStore(CONVERSATION_MESSAGES_STORE);
          for (const id of messageIds) {
            messagesStore.delete(id);
          }
          const sessionsStore = tx.objectStore(CONVERSATIONS_STORE);
          sessionsStore.delete(sessionId);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });

        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
        setIsLoading(false);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'ลบเซสชันไม่สำเร็จ กรุณาลองอีกครั้ง';
        setError(message);
        setIsLoading(false);
        throw err;
      }
    },
    [getDb]
  );

  return {
    sessions,
    loadSessions,
    loadSessionMessages,
    saveSession,
    saveMessage,
    deleteSession,
    isLoading,
    error,
  };
}
