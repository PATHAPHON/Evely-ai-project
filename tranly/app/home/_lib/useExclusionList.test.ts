import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { useExclusionList } from './useExclusionList';
import { openDatabase, WORDS_STORE, FEED_WORDS_STORE } from '@/app/_lib/db';

beforeEach(() => {
  // Reset IndexedDB between tests
  globalThis.indexedDB = new IDBFactory();
});

async function seedWordsStore(records: { id: string; korean?: string; label: string; createdAt: number; imageBlob: Blob }[]) {
  const db = await openDatabase();
  const tx = db.transaction(WORDS_STORE, 'readwrite');
  const store = tx.objectStore(WORDS_STORE);
  for (const record of records) {
    store.put(record);
  }
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function seedFeedWordsStore(records: { id: string; korean: string; reading: string; romanization: string; english: string; thai: string; generatedDate: string; bookmarked: boolean; imageBlob: Blob | null; createdAt: number }[]) {
  const db = await openDatabase();
  const tx = db.transaction(FEED_WORDS_STORE, 'readwrite');
  const store = tx.objectStore(FEED_WORDS_STORE);
  for (const record of records) {
    store.put(record);
  }
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

describe('useExclusionList', () => {
  it('returns empty array when both stores are empty', async () => {
    const { result } = renderHook(() => useExclusionList());

    let exclusionList: string[] = [];
    await act(async () => {
      exclusionList = await result.current.getExclusionList();
    });

    expect(exclusionList).toEqual([]);
  });

  it('returns korean words from the words store (scanned)', async () => {
    await seedWordsStore([
      { id: '1', korean: '사과', label: 'apple', createdAt: 1, imageBlob: new Blob() },
      { id: '2', korean: '바나나', label: 'banana', createdAt: 2, imageBlob: new Blob() },
    ]);

    const { result } = renderHook(() => useExclusionList());

    let exclusionList: string[] = [];
    await act(async () => {
      exclusionList = await result.current.getExclusionList();
    });

    expect(exclusionList).toContain('사과');
    expect(exclusionList).toContain('바나나');
    expect(exclusionList).toHaveLength(2);
  });

  it('returns korean words from the feed-words store (generated)', async () => {
    await seedFeedWordsStore([
      { id: '1', korean: '고양이', reading: 'โกยางอี', romanization: 'goyangi', english: 'cat', thai: 'แมว', generatedDate: '2024-01-01', bookmarked: false, imageBlob: null, createdAt: 1 },
      { id: '2', korean: '강아지', reading: 'คังอาจี', romanization: 'gangaji', english: 'dog', thai: 'สุนัข', generatedDate: '2024-01-01', bookmarked: false, imageBlob: null, createdAt: 2 },
    ]);

    const { result } = renderHook(() => useExclusionList());

    let exclusionList: string[] = [];
    await act(async () => {
      exclusionList = await result.current.getExclusionList();
    });

    expect(exclusionList).toContain('고양이');
    expect(exclusionList).toContain('강아지');
    expect(exclusionList).toHaveLength(2);
  });

  it('combines words from both stores', async () => {
    await seedWordsStore([
      { id: '1', korean: '사과', label: 'apple', createdAt: 1, imageBlob: new Blob() },
    ]);
    await seedFeedWordsStore([
      { id: '2', korean: '고양이', reading: 'โกยางอี', romanization: 'goyangi', english: 'cat', thai: 'แมว', generatedDate: '2024-01-01', bookmarked: false, imageBlob: null, createdAt: 1 },
    ]);

    const { result } = renderHook(() => useExclusionList());

    let exclusionList: string[] = [];
    await act(async () => {
      exclusionList = await result.current.getExclusionList();
    });

    expect(exclusionList).toContain('사과');
    expect(exclusionList).toContain('고양이');
    expect(exclusionList).toHaveLength(2);
  });

  it('deduplicates words that appear in both stores', async () => {
    await seedWordsStore([
      { id: '1', korean: '사과', label: 'apple', createdAt: 1, imageBlob: new Blob() },
    ]);
    await seedFeedWordsStore([
      { id: '2', korean: '사과', reading: 'ซากวา', romanization: 'sagwa', english: 'apple', thai: 'แอปเปิ้ล', generatedDate: '2024-01-01', bookmarked: false, imageBlob: null, createdAt: 1 },
    ]);

    const { result } = renderHook(() => useExclusionList());

    let exclusionList: string[] = [];
    await act(async () => {
      exclusionList = await result.current.getExclusionList();
    });

    expect(exclusionList).toEqual(['사과']);
  });

  it('skips words store records without korean field', async () => {
    await seedWordsStore([
      { id: '1', korean: '사과', label: 'apple', createdAt: 1, imageBlob: new Blob() },
      { id: '2', korean: undefined, label: 'unknown', createdAt: 2, imageBlob: new Blob() },
    ]);

    const { result } = renderHook(() => useExclusionList());

    let exclusionList: string[] = [];
    await act(async () => {
      exclusionList = await result.current.getExclusionList();
    });

    expect(exclusionList).toEqual(['사과']);
  });
});
