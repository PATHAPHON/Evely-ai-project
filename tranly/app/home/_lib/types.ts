import type { TargetLanguage } from '@/app/_lib/wordTypes';

// --- Multi-language Feed Word interfaces ---

export interface BaseFeedWord {
  language: TargetLanguage;
  thai: string;
  partOfSpeech?: string;
  english?: string;
  imageUrl?: string;
  imageUrls?: string[];
  imageQueries?: string[];
}

export interface JapaneseFeedWord extends BaseFeedWord {
  language: 'japanese';
  kanji: string;
  hiragana: string;
  romaji: string;
}

export interface KoreanFeedWord extends BaseFeedWord {
  language: 'korean';
  korean: string;
  reading: string;
  romanization: string;
  english: string;
}

export interface ChineseFeedWord extends BaseFeedWord {
  language: 'chinese';
  hanzi: string;
  pinyin: string;
}

export interface EnglishFeedWord extends BaseFeedWord {
  language: 'english';
  word: string;
  ipa: string;
}

export type FeedWord =
  | JapaneseFeedWord
  | KoreanFeedWord
  | ChineseFeedWord
  | EnglishFeedWord;

// --- Feed Word Record (stored in IndexedDB) ---

export interface FeedWordRecord {
  id: string;
  language: TargetLanguage;
  generatedDate: string;
  thai: string;
  bookmarked: boolean;
  imageBlob: Blob | null;
  imageUrl?: string | null;
  imageUrls?: string[];
  createdAt: number;
  partOfSpeech?: string;
  // Japanese fields
  kanji?: string;
  hiragana?: string;
  romaji?: string;
  // Korean fields
  korean?: string;
  reading?: string;
  romanization?: string;
  english?: string;
  // Chinese fields
  hanzi?: string;
  pinyin?: string;
  // English fields
  word?: string;
  ipa?: string;
}

// --- API types ---

export interface FeedRequest {
  language: TargetLanguage;
  excludeWords: string[];
  count: number;
}

export interface FeedSuccessResponse {
  words: FeedWord[];
}

export interface FeedErrorResponse {
  error: {
    type: 'invalid_input' | 'api_error' | 'rate_limit' | 'timeout' | 'network_error';
    message: string;
  };
}
