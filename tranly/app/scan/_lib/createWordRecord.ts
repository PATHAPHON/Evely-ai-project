import type { TargetLanguage } from '@/app/_lib/wordTypes';

/**
 * Creates a WordRecord for the given word in the specified language.
 * Populates the primary field for the language and leaves other fields empty
 * for the user to fill in later.
 *
 * @param word - The word text to save
 * @param language - The active language determining the record shape
 * @param imageBlob - The captured image blob to associate with the record
 * @returns A WordRecord-shaped object ready to store in IndexedDB
 */
export function createWordRecord(
  word: string,
  language: TargetLanguage,
  imageBlob: Blob | null
): Record<string, unknown> {
  const base = {
    id: crypto.randomUUID(),
    language,
    imageBlob,
    thaiTranslation: '',
    createdAt: Date.now(),
  };

  switch (language) {
    case 'japanese':
      return { ...base, kanji: word, hiragana: '', romaji: '' };
    case 'korean':
      return { ...base, hangul: word, thaiReading: '', romanization: '' };
    case 'chinese':
      return { ...base, hanzi: word, pinyin: '' };
    case 'english':
      return { ...base, word, ipa: '' };
  }
}
