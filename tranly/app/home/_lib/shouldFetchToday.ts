import { FEED_WORDS_STORE, openDatabase } from '@/app/_lib/db';
import type { TargetLanguage } from '@/app/_lib/wordTypes';

function getTodayDateKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getRetentionCutoffDate(): string {
  const now = new Date();
  now.setDate(now.getDate() - 30);
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Deletes feed word records older than 30 days for the given language.
 * Uses the language_date compound index for efficient querying.
 */
async function cleanupOldRecords(
  db: IDBDatabase,
  language: TargetLanguage
): Promise<void> {
  const cutoffDate = getRetentionCutoffDate();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(FEED_WORDS_STORE, 'readwrite');
    const store = tx.objectStore(FEED_WORDS_STORE);
    const index = store.index('language_date');

    // Query all records for this language with dates up to (but not including) the cutoff
    // The compound index is [language, generatedDate], so we use a range from
    // [language, ''] to [language, cutoffDate) to find old records
    const range = IDBKeyRange.bound(
      [language, ''],
      [language, cutoffDate],
      false,
      true // exclude upper bound (cutoff date itself is kept)
    );

    const request = index.openCursor(range);

    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Returns `true` if no records with today's generatedDate exist for the given language
 * in the feed-words store, meaning new words should be fetched from the API.
 *
 * Also performs cleanup of records older than 30 days for the given language.
 */
export async function shouldFetchToday(language: TargetLanguage): Promise<boolean> {
  const db = await openDatabase();
  const todayKey = getTodayDateKey();

  // Check if entries already exist for today and this language using compound index
  const count = await new Promise<number>((resolve, reject) => {
    const tx = db.transaction(FEED_WORDS_STORE, 'readonly');
    const store = tx.objectStore(FEED_WORDS_STORE);
    const index = store.index('language_date');
    const req = index.count(IDBKeyRange.only([language, todayKey]));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  // Perform 30-day retention cleanup in the background
  cleanupOldRecords(db, language).catch(() => {
    // Cleanup failure is non-critical; don't block the feed check
  });

  return count === 0;
}
