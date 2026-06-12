import type { TargetLanguage } from '@/app/_lib/wordTypes';

// --- Multi-language Feed Word interfaces ---

export interface BaseFeedWord {
  language: TargetLanguage;
  thai: string;
  partOfSpeech?: string;
  imageUrl?: string;
  imageUrls?: string[];
  imageQueries?: string[];
}

export interface EnglishFeedWord extends BaseFeedWord {
  language: 'english';
  word: string;
  ipa: string;
}

export type FeedWord = EnglishFeedWord;

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
  // English fields
  word?: string;
  ipa?: string;
}

// sessionStorage key used to hand a word off to the /word-detail page
export const DETAIL_WORD_STORAGE_KEY = "tarnly:detail-word";

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
