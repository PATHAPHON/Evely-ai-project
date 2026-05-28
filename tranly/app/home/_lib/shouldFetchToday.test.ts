import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { shouldFetchToday } from './shouldFetchToday';
import { FEED_WORDS_STORE, openDatabase } from '@/app/_lib/db';
import type { FeedWordRecord } from './types';

function getTodayDateKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function insertRecord(record: FeedWordRecord): Promise<void> {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(FEED_WORDS_STORE, 'readwrite');
    const store = tx.objectStore(FEED_WORDS_STORE);
    store.put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function makeRecord(overrides: Partial<FeedWordRecord> = {}): FeedWordRecord {
  return {
    id: crypto.randomUUID(),
    korean: '사과',
    reading: 'ซากวา',
    romanization: 'sagwa',
    english: 'apple',
    thai: 'แอปเปิ้ล',
    generatedDate: getTodayDateKey(),
    bookmarked: false,
    imageBlob: null,
    createdAt: Date.now(),
    ...overrides,
  };
}

describe('shouldFetchToday', () => {
  beforeEach(() => {
    // Reset IndexedDB between tests
    indexedDB = new IDBFactory();
  });

  it('returns true when no records exist for today', async () => {
    const result = await shouldFetchToday();
    expect(result).toBe(true);
  });

  it('returns false when records exist for today', async () => {
    await insertRecord(makeRecord());

    const result = await shouldFetchToday();
    expect(result).toBe(false);
  });

  it('returns true when only records from other dates exist', async () => {
    await insertRecord(makeRecord({ generatedDate: '2024-01-01' }));

    const result = await shouldFetchToday();
    expect(result).toBe(true);
  });

  it('returns false when multiple records exist for today', async () => {
    await insertRecord(makeRecord({ korean: '사과' }));
    await insertRecord(makeRecord({ korean: '바나나' }));

    const result = await shouldFetchToday();
    expect(result).toBe(false);
  });
});
