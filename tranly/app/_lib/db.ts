import type { TargetLanguage } from './wordTypes';

export const DB_NAME = 'tarnly-images';
export const DB_VERSION = 8;

export const CAPTURES_STORE = 'captures';
export const FLASHCARDS_STORE = 'flashcards';
export const WORDS_STORE = 'words';
export const FEED_WORDS_STORE = 'feed-words';
export const CONVERSATIONS_STORE = 'conversations';
export const CONVERSATION_MESSAGES_STORE = 'conversation-messages';
export const LESSONS_STORE = 'lessons';
export const FLASHCARD_SETS_STORE = 'flashcard-sets';
export const STUDY_SESSIONS_STORE = 'study-sessions';

function ensureStore(
  db: IDBDatabase,
  name: string,
  indexes: { name: string; keyPath: string | string[]; unique?: boolean }[] = []
) {
  if (db.objectStoreNames.contains(name)) return;
  const store = db.createObjectStore(name, { keyPath: 'id' });
  for (const idx of indexes) {
    store.createIndex(idx.name, idx.keyPath, { unique: idx.unique ?? false });
  }
}

function ensureIndex(
  store: IDBObjectStore,
  name: string,
  keyPath: string | string[],
  unique = false
) {
  if (!store.indexNames.contains(name)) {
    store.createIndex(name, keyPath, { unique });
  }
}

function migrateRecordsWithLanguage(store: IDBObjectStore) {
  const cursorRequest = store.openCursor();
  cursorRequest.onsuccess = () => {
    const cursor = cursorRequest.result;
    if (cursor) {
      const record = cursor.value;
      if (!record.language) {
        cursor.update({ ...record, language: 'korean' });
      }
      cursor.continue();
    }
  };
}

/**
 * Query all records from a store that match the given language,
 * using the 'language' index for efficient filtering.
 */
export function queryByLanguage<T>(
  db: IDBDatabase,
  storeName: string,
  language: TargetLanguage
): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const index = store.index('language');
    const request = index.openCursor(IDBKeyRange.only(language));
    const results: T[] = [];

    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        results.push(cursor.value as T);
        cursor.continue();
      } else {
        resolve(results);
      }
    };

    request.onerror = () => reject(request.error);
  });
}

export function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      const transaction = request.transaction!;
      const oldVersion = event.oldVersion;

      // Create stores that may not exist yet (fresh install or earlier versions)
      ensureStore(db, CAPTURES_STORE, [{ name: 'createdAt', keyPath: 'createdAt' }]);
      ensureStore(db, FLASHCARDS_STORE, [{ name: 'createdAt', keyPath: 'createdAt' }]);
      ensureStore(db, WORDS_STORE, [{ name: 'createdAt', keyPath: 'createdAt' }]);
      ensureStore(db, FEED_WORDS_STORE, [
        { name: 'generatedDate', keyPath: 'generatedDate' },
        { name: 'korean', keyPath: 'korean' },
        { name: 'createdAt', keyPath: 'createdAt' },
      ]);
      ensureStore(db, CONVERSATIONS_STORE, [
        { name: 'createdAt', keyPath: 'createdAt' },
        { name: 'completed', keyPath: 'completed' },
      ]);
      ensureStore(db, CONVERSATION_MESSAGES_STORE, [
        { name: 'sessionId', keyPath: 'sessionId' },
        { name: 'timestamp', keyPath: 'timestamp' },
      ]);
      ensureStore(db, LESSONS_STORE, [
        { name: 'createdAt', keyPath: 'createdAt' },
      ]);
      ensureStore(db, FLASHCARD_SETS_STORE, [
        { name: 'createdAt', keyPath: 'createdAt' },
      ]);
      ensureStore(db, STUDY_SESSIONS_STORE, [
        { name: 'language', keyPath: 'language' },
        { name: 'completedAt', keyPath: 'completedAt' },
      ]);

      // Version 8 migration: add language indexes and migrate existing data
      if (oldVersion < 8) {
        // Add language index to words store
        const wordsStore = transaction.objectStore(WORDS_STORE);
        ensureIndex(wordsStore, 'language', 'language');

        // Add language and language_date indexes to feed-words store
        const feedWordsStore = transaction.objectStore(FEED_WORDS_STORE);
        ensureIndex(feedWordsStore, 'language', 'language');
        ensureIndex(feedWordsStore, 'language_date', ['language', 'generatedDate']);

        // Add language index to flashcard-sets store
        const flashcardSetsStore = transaction.objectStore(FLASHCARD_SETS_STORE);
        ensureIndex(flashcardSetsStore, 'language', 'language');

        // Migrate existing records: add language: 'korean' to all records
        migrateRecordsWithLanguage(wordsStore);
        migrateRecordsWithLanguage(feedWordsStore);
        migrateRecordsWithLanguage(flashcardSetsStore);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
