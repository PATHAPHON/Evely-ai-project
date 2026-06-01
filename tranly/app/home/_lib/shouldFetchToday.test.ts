import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { shouldFetchToday } from './shouldFetchToday';
import { FEED_WORDS_STORE, openDatabase } from '@/app/_lib/db';
import type { FeedWordRecord } from './types';
import type { TargetLanguage } from '@/app/_lib/wordTypes';

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
    language: 'korean',
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

  it('returns true when no records exist for today and language', async () => {
    const result = await shouldFetchToday('korean');
    expect(result).toBe(true);
  });

  it('returns false when records exist for today and the same language', async () => {
    await insertRecord(makeRecord({ language: 'korean' }));

    const result = await shouldFetchToday('korean');
    expect(result).toBe(false);
  });

  it('returns true when records exist for today but a different language', async () => {
    await insertRecord(makeRecord({ language: 'korean' }));

    const result = await shouldFetchToday('japanese');
    expect(result).toBe(true);
  });

  it('returns true when only records from other dates exist for the language', async () => {
    await insertRecord(makeRecord({ generatedDate: '2024-01-01', language: 'korean' }));

    const result = await shouldFetchToday('korean');
    expect(result).toBe(true);
  });

  it('returns false when multiple records exist for today and language', async () => {
    await insertRecord(makeRecord({ korean: '사과', language: 'korean' }));
    await insertRecord(makeRecord({ korean: '바나나', language: 'korean' }));

    const result = await shouldFetchToday('korean');
    expect(result).toBe(false);
  });

  it('handles each language independently', async () => {
    await insertRecord(makeRecord({ language: 'korean' }));
    await insertRecord(makeRecord({ language: 'japanese', kanji: '猫', hiragana: 'ねこ', romaji: 'neko' }));

    expect(await shouldFetchToday('korean')).toBe(false);
    expect(await shouldFetchToday('japanese')).toBe(false);
    expect(await shouldFetchToday('english')).toBe(true);
    expect(await shouldFetchToday('chinese')).toBe(true);
  });

  describe('30-day retention policy', () => {
    it('cleans up records older than 30 days for the given language', async () => {
      // Insert a record from 31 days ago
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 31);
      const oldDateKey = `${oldDate.getFullYear()}-${String(oldDate.getMonth() + 1).padStart(2, '0')}-${String(oldDate.getDate()).padStart(2, '0')}`;

      await insertRecord(makeRecord({ generatedDate: oldDateKey, language: 'korean' }));

      // Call shouldFetchToday which triggers cleanup
      await shouldFetchToday('korean');

      // Wait a tick for the background cleanup to complete
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Verify old record was deleted
      const db = await openDatabase();
      const remaining = await new Promise<FeedWordRecord[]>((resolve, reject) => {
        const tx = db.transaction(FEED_WORDS_STORE, 'readonly');
        const store = tx.objectStore(FEED_WORDS_STORE);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result as FeedWordRecord[]);
        req.onerror = () => reject(req.error);
      });

      expect(remaining.length).toBe(0);
    });

    it('preserves records within 30 days', async () => {
      // Insert a record from 29 days ago (should be kept)
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 29);
      const recentDateKey = `${recentDate.getFullYear()}-${String(recentDate.getMonth() + 1).padStart(2, '0')}-${String(recentDate.getDate()).padStart(2, '0')}`;

      await insertRecord(makeRecord({ generatedDate: recentDateKey, language: 'korean' }));

      // Call shouldFetchToday which triggers cleanup
      await shouldFetchToday('korean');

      // Wait a tick for the background cleanup to complete
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Verify recent record was preserved
      const db = await openDatabase();
      const remaining = await new Promise<FeedWordRecord[]>((resolve, reject) => {
        const tx = db.transaction(FEED_WORDS_STORE, 'readonly');
        const store = tx.objectStore(FEED_WORDS_STORE);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result as FeedWordRecord[]);
        req.onerror = () => reject(req.error);
      });

      expect(remaining.length).toBe(1);
    });

    it('only cleans up records for the specified language', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 31);
      const oldDateKey = `${oldDate.getFullYear()}-${String(oldDate.getMonth() + 1).padStart(2, '0')}-${String(oldDate.getDate()).padStart(2, '0')}`;

      // Insert old records for both languages
      await insertRecord(makeRecord({ generatedDate: oldDateKey, language: 'korean' }));
      await insertRecord(makeRecord({ generatedDate: oldDateKey, language: 'japanese', kanji: '猫', hiragana: 'ねこ', romaji: 'neko' }));

      // Cleanup only korean
      await shouldFetchToday('korean');

      // Wait for cleanup
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Verify only korean was cleaned up, japanese remains
      const db = await openDatabase();
      const remaining = await new Promise<FeedWordRecord[]>((resolve, reject) => {
        const tx = db.transaction(FEED_WORDS_STORE, 'readonly');
        const store = tx.objectStore(FEED_WORDS_STORE);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result as FeedWordRecord[]);
        req.onerror = () => reject(req.error);
      });

      expect(remaining.length).toBe(1);
      expect(remaining[0].language).toBe('japanese');
    });
  });
});
