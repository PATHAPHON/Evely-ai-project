export const DB_NAME = 'tarnly-images';
export const DB_VERSION = 7;

export const CAPTURES_STORE = 'captures';
export const FLASHCARDS_STORE = 'flashcards';
export const WORDS_STORE = 'words';
export const FEED_WORDS_STORE = 'feed-words';
export const CONVERSATIONS_STORE = 'conversations';
export const CONVERSATION_MESSAGES_STORE = 'conversation-messages';
export const LESSONS_STORE = 'lessons';
export const FLASHCARD_SETS_STORE = 'flashcard-sets';

function ensureStore(
  db: IDBDatabase,
  name: string,
  indexes: { name: string; keyPath: string; unique?: boolean }[] = []
) {
  if (db.objectStoreNames.contains(name)) return;
  const store = db.createObjectStore(name, { keyPath: 'id' });
  for (const idx of indexes) {
    store.createIndex(idx.name, idx.keyPath, { unique: idx.unique ?? false });
  }
}

export function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
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
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
