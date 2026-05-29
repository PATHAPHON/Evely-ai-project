import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { useLearningStats } from './useLearningStats';
import {
  openDatabase,
  WORDS_STORE,
  CONVERSATIONS_STORE,
  CAPTURES_STORE,
} from '@/app/_lib/db';

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});

async function seedStore(
  storeName: string,
  records: { id: string; createdAt: number }[]
) {
  const db = await openDatabase();
  const tx = db.transaction(storeName, 'readwrite');
  const store = tx.objectStore(storeName);
  for (const record of records) {
    store.put(record);
  }
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

describe('useLearningStats', () => {
  it('starts with isLoading true', () => {
    const { result } = renderHook(() => useLearningStats());
    expect(result.current.isLoading).toBe(true);
  });

  it('returns zero counts when stores are empty', async () => {
    const { result } = renderHook(() => useLearningStats());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.totalWords).toBe(0);
    expect(result.current.totalConversations).toBe(0);
    expect(result.current.totalScans).toBe(0);
  });

  it('returns correct word count from words store', async () => {
    await seedStore(WORDS_STORE, [
      { id: '1', createdAt: 1 },
      { id: '2', createdAt: 2 },
      { id: '3', createdAt: 3 },
    ]);

    const { result } = renderHook(() => useLearningStats());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.totalWords).toBe(3);
  });

  it('returns correct conversation count from conversations store', async () => {
    await seedStore(CONVERSATIONS_STORE, [
      { id: 'conv-1', createdAt: 1 },
      { id: 'conv-2', createdAt: 2 },
    ]);

    const { result } = renderHook(() => useLearningStats());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.totalConversations).toBe(2);
  });

  it('returns correct scan count from captures store', async () => {
    await seedStore(CAPTURES_STORE, [
      { id: 'cap-1', createdAt: 1 },
      { id: 'cap-2', createdAt: 2 },
      { id: 'cap-3', createdAt: 3 },
      { id: 'cap-4', createdAt: 4 },
    ]);

    const { result } = renderHook(() => useLearningStats());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.totalScans).toBe(4);
  });

  it('returns counts from all stores simultaneously', async () => {
    await seedStore(WORDS_STORE, [
      { id: 'w1', createdAt: 1 },
      { id: 'w2', createdAt: 2 },
    ]);
    await seedStore(CONVERSATIONS_STORE, [
      { id: 'c1', createdAt: 1 },
    ]);
    await seedStore(CAPTURES_STORE, [
      { id: 's1', createdAt: 1 },
      { id: 's2', createdAt: 2 },
      { id: 's3', createdAt: 3 },
    ]);

    const { result } = renderHook(() => useLearningStats());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.totalWords).toBe(2);
    expect(result.current.totalConversations).toBe(1);
    expect(result.current.totalScans).toBe(3);
  });
});
