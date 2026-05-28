export interface FeedWord {
  korean: string;
  reading: string;
  romanization: string;
  english: string;
  thai: string;
}

export interface FeedWordRecord {
  id: string;
  korean: string;
  reading: string;
  romanization: string;
  english: string;
  thai: string;
  generatedDate: string;
  bookmarked: boolean;
  imageBlob: Blob | null;
  createdAt: number;
}

export interface FeedRequest {
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
