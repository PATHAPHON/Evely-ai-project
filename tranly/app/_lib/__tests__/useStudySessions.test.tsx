import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import type { ReactNode } from 'react';
import { useStudySessions } from '../useStudySessions';
import { ActiveLanguageProvider, STORAGE_KEY } from '../ActiveLanguageContext';
import { openDatabase, STUDY_SESSIONS_STORE } from '../db';
import type { StudySession } from '../studySessionTypes';

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  localStorage.clear();
});

function wrapper({ children }: { children: ReactNode }) {
  return <ActiveLanguageProvider>{children}</ActiveLanguageProvider>;
}

function createWrapper(language: string) {
  return function Wrapper({ children }: { children: ReactNode }) {
    localStorage.setItem(STORAGE_KEY, language);
    return <ActiveLanguageProvider>{children}</ActiveLanguageProvider>;
  };
}

async function seedSessions(sessions: StudySession[]) {
  const db = await openDatabase();
  const tx = db.transaction(STUDY_SESSIONS_STORE, 'readwrite');
  const store = tx.objectStore(STUDY_SESSIONS_STORE);
  for (const session of sessions) {
    store.put(session);
  }
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

describe('useStudySessions', () => {
  it('returns null sessions initially while loading', () => {
    const { result } = renderHook(() => useStudySessions(), { wrapper });
    expect(result.current.sessions).toBeNull();
  });

  it('returns empty array when no sessions exist', async () => {
    const { result } = renderHook(() => useStudySessions(), { wrapper });

    await waitFor(() => {
      expect(result.current.sessions).not.toBeNull();
    });

    expect(result.current.sessions).toEqual([]);
  });

  it('records a study session with correct fields', async () => {
    const { result } = renderHook(() => useStudySessions(), { wrapper });

    await waitFor(() => {
      expect(result.current.sessions).not.toBeNull();
    });

    await act(async () => {
      await result.current.recordSession('set-1', 5);
    });

    expect(result.current.sessions).toHaveLength(1);
    const session = result.current.sessions![0];
    expect(session.language).toBe('korean');
    expect(session.flashcardSetId).toBe('set-1');
    expect(session.cardsReviewed).toBe(5);
    expect(session.completedAt).toBeGreaterThan(0);
    expect(session.id).toBeDefined();
  });

  it('does not record a session when cardsReviewed is less than 1', async () => {
    const { result } = renderHook(() => useStudySessions(), { wrapper });

    await waitFor(() => {
      expect(result.current.sessions).not.toBeNull();
    });

    await act(async () => {
      await result.current.recordSession('set-1', 0);
    });

    expect(result.current.sessions).toEqual([]);
  });

  it('filters sessions by active language', async () => {
    await seedSessions([
      {
        id: 'session-kr-1',
        language: 'korean',
        flashcardSetId: 'set-kr',
        completedAt: 1000,
        cardsReviewed: 3,
      },
      {
        id: 'session-jp-1',
        language: 'japanese',
        flashcardSetId: 'set-jp',
        completedAt: 2000,
        cardsReviewed: 5,
      },
    ]);

    // Default language is korean
    const { result } = renderHook(() => useStudySessions(), { wrapper });

    await waitFor(() => {
      expect(result.current.sessions).not.toBeNull();
    });

    expect(result.current.sessions).toHaveLength(1);
    expect(result.current.sessions![0].language).toBe('korean');
  });

  it('sorts sessions by completedAt descending (most recent first)', async () => {
    await seedSessions([
      {
        id: 'session-1',
        language: 'korean',
        flashcardSetId: 'set-1',
        completedAt: 1000,
        cardsReviewed: 2,
      },
      {
        id: 'session-2',
        language: 'korean',
        flashcardSetId: 'set-2',
        completedAt: 3000,
        cardsReviewed: 4,
      },
      {
        id: 'session-3',
        language: 'korean',
        flashcardSetId: 'set-1',
        completedAt: 2000,
        cardsReviewed: 1,
      },
    ]);

    const { result } = renderHook(() => useStudySessions(), { wrapper });

    await waitFor(() => {
      expect(result.current.sessions).toHaveLength(3);
    });

    expect(result.current.sessions![0].completedAt).toBe(3000);
    expect(result.current.sessions![1].completedAt).toBe(2000);
    expect(result.current.sessions![2].completedAt).toBe(1000);
  });

  it('associates recorded session with the active language', async () => {
    const japaneseWrapper = createWrapper('japanese');
    const { result } = renderHook(() => useStudySessions(), {
      wrapper: japaneseWrapper,
    });

    await waitFor(() => {
      expect(result.current.sessions).not.toBeNull();
    });

    await act(async () => {
      await result.current.recordSession('set-jp', 3);
    });

    expect(result.current.sessions).toHaveLength(1);
    expect(result.current.sessions![0].language).toBe('japanese');
  });
});
