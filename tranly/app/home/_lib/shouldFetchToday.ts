import { FEED_WORDS_STORE, openDatabase } from '@/app/_lib/db';

function getTodayDateKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns `true` if no records with today's generatedDate exist in the feed-words store,
 * meaning new words should be fetched from the API.
 */
export async function shouldFetchToday(): Promise<boolean> {
  const db = await openDatabase();
  const todayKey = getTodayDateKey();

  const count = await new Promise<number>((resolve, reject) => {
    const tx = db.transaction(FEED_WORDS_STORE, 'readonly');
    const store = tx.objectStore(FEED_WORDS_STORE);
    const index = store.index('generatedDate');
    const req = index.count(todayKey);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  return count === 0;
}
