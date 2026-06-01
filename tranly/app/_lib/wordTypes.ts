/**
 * Core type definitions for multi-language word records.
 *
 * Each supported target language has a specific word record interface
 * with fields appropriate for that language's writing system.
 */

/** The four target languages supported by the app. */
export type TargetLanguage = 'english' | 'japanese' | 'korean' | 'chinese';

/** Common fields shared by all word records regardless of language. */
export interface BaseWordRecord {
  id: string;
  language: TargetLanguage;
  imageBlob: Blob | null;
  thaiTranslation: string;
  createdAt: number;
}

/** Word record for Japanese: includes kanji, hiragana reading, and romaji. */
export interface JapaneseWordRecord extends BaseWordRecord {
  language: 'japanese';
  kanji: string;
  hiragana: string;
  romaji: string;
}

/** Word record for Korean: includes hangul, Thai reading, and romanization. */
export interface KoreanWordRecord extends BaseWordRecord {
  language: 'korean';
  hangul: string;
  thaiReading: string;
  romanization: string;
}

/** Word record for Chinese: includes hanzi and pinyin with tone marks. */
export interface ChineseWordRecord extends BaseWordRecord {
  language: 'chinese';
  hanzi: string;
  pinyin: string;
}

/** Word record for English: includes the word and IPA phonetic transcription. */
export interface EnglishWordRecord extends BaseWordRecord {
  language: 'english';
  word: string;
  ipa: string;
}

/** Discriminated union of all language-specific word records. */
export type WordRecord =
  | JapaneseWordRecord
  | KoreanWordRecord
  | ChineseWordRecord
  | EnglishWordRecord;
