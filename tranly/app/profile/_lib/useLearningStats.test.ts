import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { useLearningStats, useLanguageLearningStats } from './useLearningStats';
const WORDS_STORE = 'words';
const CONVERSATIONS_STORE = 'conversations';
const CAPTURES_STORE = 'captures';
const FLASHCARD_SETS_STORE = 'flashcard-sets';
const STUDY_SESSIONS_STORE = 'study-sessions';
import { ActiveLanguageProvider } from '@/app/_lib/ActiveLanguageContext';
import type { TargetLanguage } from '@/app/_lib/wordTypes';

let mockWords: any[] = [];
let mockConversations: any[] = [];
let mockCaptures: any[] = [];
let mockFlashcardSets: any[] = [];
let mockStudySessions: any[] = [];

const mockGetUser = vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } } });
const mockGetSession = vi.fn().mockResolvedValue({ data: { session: { user: { id: 'test-user-id' } } } });
const mockOnAuthStateChange = vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });

const mockFrom = vi.fn((table: string) => {
  let data: any[] = [];
  if (table === 'words') data = mockWords;
  else if (table === 'conversations') data = mockConversations;
  else if (table === 'captures') data = mockCaptures;
  else if (table === 'flashcard_sets') data = mockFlashcardSets;
  else if (table === 'study_sessions') data = mockStudySessions;

  let filtered = [...data];
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn((col: string, val: any) => {
      filtered = filtered.filter((row) => row[col] === val);
      return builder;
    }),
    limit: vi.fn(() => builder),
    then: (resolve: any) => {
      resolve({
        data: filtered,
        count: filtered.length,
        error: null,
      });
    },
  };
  return builder;
});

vi.mock('@/app/_lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: (...args: any[]) => mockGetUser(...args),
      getSession: (...args: any[]) => mockGetSession(...args),
      onAuthStateChange: (...args: any[]) => mockOnAuthStateChange(...args),
    },
    from: (...args: any[]) => mockFrom(...args),
  },
}));

beforeEach(() => {
  mockWords = [];
  mockConversations = [];
  mockCaptures = [];
  mockFlashcardSets = [];
  mockStudySessions = [];
  localStorage.clear();
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: 'test-user-id' } } });
  mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'test-user-id' } } } });
  mockOnAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
});

function seedStore(
  storeName: string,
  records: any[]
) {
  const seeded = records.map((r) => ({ ...r, user_id: 'test-user-id' }));
  if (storeName === 'words' || storeName === WORDS_STORE) {
    mockWords = seeded;
  } else if (storeName === 'conversations' || storeName === CONVERSATIONS_STORE) {
    mockConversations = seeded;
  } else if (storeName === 'captures' || storeName === CAPTURES_STORE) {
    mockCaptures = seeded;
  } else if (storeName === 'flashcard_sets' || storeName === 'flashcard-sets' || storeName === FLASHCARD_SETS_STORE) {
    mockFlashcardSets = seeded;
  } else if (storeName === 'study_sessions' || storeName === 'study-sessions' || storeName === STUDY_SESSIONS_STORE) {
    mockStudySessions = seeded;
  }
}

function createWrapper(initialLanguage: TargetLanguage = 'korean') {
  localStorage.setItem('tarnly:active-language', initialLanguage);
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(ActiveLanguageProvider, null, children);
}

describe('useLearningStats', () => {
  it('starts with isLoading true', () => {
    const { result } = renderHook(() => useLearningStats());
    expect(result.current.isLoading).toBe(true);
  });

  it('returns zero counts when stores are empty', async () => {
    const { result } = renderHook(() => useLearningStats());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.totalWords).toBe(0);
    expect(result.current.totalConversations).toBe(0);
    expect(result.current.totalScans).toBe(0);
  });

  it('returns correct word count from words store', async () => {
    seedStore(WORDS_STORE, [
      { id: '1', createdAt: 1 },
      { id: '2', createdAt: 2 },
      { id: '3', createdAt: 3 },
    ]);

    const { result } = renderHook(() => useLearningStats());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.totalWords).toBe(3);
  });

  it('returns correct conversation count from conversations store', async () => {
    seedStore(CONVERSATIONS_STORE, [
      { id: 'conv-1', createdAt: 1 },
      { id: 'conv-2', createdAt: 2 },
    ]);

    const { result } = renderHook(() => useLearningStats());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.totalConversations).toBe(2);
  });

  it('returns correct scan count from captures store', async () => {
    seedStore(CAPTURES_STORE, [
      { id: 'cap-1', createdAt: 1 },
      { id: 'cap-2', createdAt: 2 },
      { id: 'cap-3', createdAt: 3 },
      { id: 'cap-4', createdAt: 4 },
    ]);

    const { result } = renderHook(() => useLearningStats());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.totalScans).toBe(4);
  });

  it('returns counts from all stores simultaneously', async () => {
    seedStore(WORDS_STORE, [
      { id: 'w1', createdAt: 1 },
      { id: 'w2', createdAt: 2 },
    ]);
    seedStore(CONVERSATIONS_STORE, [
      { id: 'c1', createdAt: 1 },
    ]);
    seedStore(CAPTURES_STORE, [
      { id: 's1', createdAt: 1 },
      { id: 's2', createdAt: 2 },
      { id: 's3', createdAt: 3 },
    ]);

    const { result } = renderHook(() => useLearningStats());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.totalWords).toBe(2);
    expect(result.current.totalConversations).toBe(1);
    expect(result.current.totalScans).toBe(3);
  });
});

describe('useLanguageLearningStats', () => {
  it('starts with isLoading true', () => {
    const wrapper = createWrapper('korean');
    const { result } = renderHook(() => useLanguageLearningStats(), { wrapper });
    expect(result.current.isLoading).toBe(true);
  });

  it('returns zero counts when no data exists for active language', async () => {
    const wrapper = createWrapper('korean');
    const { result } = renderHook(() => useLanguageLearningStats(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.wordCount).toBe(0);
    expect(result.current.flashcardSetCount).toBe(0);
    expect(result.current.studySessionCount).toBe(0);
  });

  it('counts only words for the active language', async () => {
    seedStore(WORDS_STORE, [
      { id: 'w1', language: 'korean', createdAt: 1, hangul: '안녕', thaiReading: 'อันยอง', romanization: 'annyeong', thaiTranslation: 'สวัสดี' },
      { id: 'w2', language: 'korean', createdAt: 2, hangul: '감사', thaiReading: 'คัมซา', romanization: 'gamsa', thaiTranslation: 'ขอบคุณ' },
      { id: 'w3', language: 'japanese', createdAt: 3, kanji: '猫', hiragana: 'ねこ', romaji: 'neko', thaiTranslation: 'แมว' },
    ]);

    const wrapper = createWrapper('korean');
    const { result } = renderHook(() => useLanguageLearningStats(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.wordCount).toBe(2);
  });

  it('counts only flashcard sets for the active language', async () => {
    seedStore(FLASHCARD_SETS_STORE, [
      { id: 'fs1', language: 'korean', name: 'Set 1', wordIds: ['w1'], createdAt: 1 },
      { id: 'fs2', language: 'japanese', name: 'Set 2', wordIds: ['w2'], createdAt: 2 },
      { id: 'fs3', language: 'korean', name: 'Set 3', wordIds: ['w3'], createdAt: 3 },
    ]);

    const wrapper = createWrapper('korean');
    const { result } = renderHook(() => useLanguageLearningStats(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.flashcardSetCount).toBe(2);
  });

  it('counts only study sessions for the active language', async () => {
    seedStore(STUDY_SESSIONS_STORE, [
      { id: 'ss1', language: 'korean', flashcardSetId: 'fs1', completedAt: 1000, cardsReviewed: 5, createdAt: 1 },
      { id: 'ss2', language: 'chinese', flashcardSetId: 'fs2', completedAt: 2000, cardsReviewed: 3, createdAt: 2 },
      { id: 'ss3', language: 'korean', flashcardSetId: 'fs3', completedAt: 3000, cardsReviewed: 10, createdAt: 3 },
    ]);

    const wrapper = createWrapper('korean');
    const { result } = renderHook(() => useLanguageLearningStats(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.studySessionCount).toBe(2);
  });

  it('returns zero for a language with no data while other languages have data', async () => {
    seedStore(WORDS_STORE, [
      { id: 'w1', language: 'korean', createdAt: 1, hangul: '안녕', thaiReading: 'อันยอง', romanization: 'annyeong', thaiTranslation: 'สวัสดี' },
    ]);
    seedStore(FLASHCARD_SETS_STORE, [
      { id: 'fs1', language: 'korean', name: 'Set 1', wordIds: ['w1'], createdAt: 1 },
    ]);

    const wrapper = createWrapper('english');
    const { result } = renderHook(() => useLanguageLearningStats(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.wordCount).toBe(0);
    expect(result.current.flashcardSetCount).toBe(0);
    expect(result.current.studySessionCount).toBe(0);
  });

  it('updates stats when active language changes', async () => {
    seedStore(WORDS_STORE, [
      { id: 'w1', language: 'korean', createdAt: 1, hangul: '안녕', thaiReading: 'อันยอง', romanization: 'annyeong', thaiTranslation: 'สวัสดี' },
      { id: 'w2', language: 'japanese', createdAt: 2, kanji: '猫', hiragana: 'ねこ', romaji: 'neko', thaiTranslation: 'แมว' },
      { id: 'w3', language: 'japanese', createdAt: 3, kanji: '犬', hiragana: 'いぬ', romaji: 'inu', thaiTranslation: 'สุนัข' },
    ]);

    const wrapper = ({ children }: { children: React.ReactNode }) => {
      return React.createElement(ActiveLanguageProvider, null, children);
    };

    localStorage.setItem('tarnly:active-language', 'korean');

    const { result } = renderHook(
      () => {
        const langCtx = useLanguageLearningStats();
        return langCtx;
      },
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.wordCount).toBe(1);
  });
});
