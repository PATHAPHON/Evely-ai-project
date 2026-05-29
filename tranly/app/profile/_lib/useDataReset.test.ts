import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { useDataReset } from './useDataReset';
import {
  openDatabase,
  WORDS_STORE,
  FEED_WORDS_STORE,
  CONVERSATIONS_STORE,
  CONVERSATION_MESSAGES_STORE,
  CAPTURES_STORE,
  FLASHCARDS_STORE,
} from '@/app/_lib/db';

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  localStorage.clear();
});

async function seedStore(storeName: string, records: { id: string }[]) {
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

async function getStoreCount(storeName: string): Promise<number> {
  const db = await openDatabase();
  const tx = db.transaction(storeName, 'readonly');
  const store = tx.objectStore(storeName);
  return new Promise((resolve, reject) => {
    const request = store.count();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

describe('useDataReset', () => {
  it('returns resetAllData function and isResetting state', () => {
    const { result } = renderHook(() => useDataReset());
    expect(typeof result.current.resetAllData).toBe('function');
    expect(result.current.isResetting).toBe(false);
  });

  it('clears all IndexedDB stores', async () => {
    await seedStore(WORDS_STORE, [{ id: '1' }, { id: '2' }]);
    await seedStore(FEED_WORDS_STORE, [{ id: '3' }]);
    await seedStore(CONVERSATIONS_STORE, [{ id: '4' }]);
    await seedStore(CONVERSATION_MESSAGES_STORE, [{ id: '5' }]);
    await seedStore(CAPTURES_STORE, [{ id: '6' }]);
    await seedStore(FLASHCARDS_STORE, [{ id: '7' }]);

    const { result } = renderHook(() => useDataReset());

    await act(async () => {
      await result.current.resetAllData();
    });

    expect(await getStoreCount(WORDS_STORE)).toBe(0);
    expect(await getStoreCount(FEED_WORDS_STORE)).toBe(0);
    expect(await getStoreCount(CONVERSATIONS_STORE)).toBe(0);
    expect(await getStoreCount(CONVERSATION_MESSAGES_STORE)).toBe(0);
    expect(await getStoreCount(CAPTURES_STORE)).toBe(0);
    expect(await getStoreCount(FLASHCARDS_STORE)).toBe(0);
  });

  it('clears all localStorage keys with tarnly: prefix', async () => {
    localStorage.setItem('tarnly:theme', 'dark');
    localStorage.setItem('tarnly:display-name', 'Pat');
    localStorage.setItem('tarnly:ai-api-key', 'sk-123');
    localStorage.setItem('other-key', 'should-remain');

    const { result } = renderHook(() => useDataReset());

    await act(async () => {
      await result.current.resetAllData();
    });

    expect(localStorage.getItem('tarnly:theme')).toBeNull();
    expect(localStorage.getItem('tarnly:display-name')).toBeNull();
    expect(localStorage.getItem('tarnly:ai-api-key')).toBeNull();
    expect(localStorage.getItem('other-key')).toBe('should-remain');
  });

  it('initially has isResetting set to false', () => {
    const { result } = renderHook(() => useDataReset());
    expect(result.current.isResetting).toBe(false);
  });

  it('works when stores are already empty', async () => {
    const { result } = renderHook(() => useDataReset());

    await act(async () => {
      await result.current.resetAllData();
    });

    expect(await getStoreCount(WORDS_STORE)).toBe(0);
  });
});
