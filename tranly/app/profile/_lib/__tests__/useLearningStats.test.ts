import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { useLanguageLearningStats } from '../hooks/useLearningStats';
const WORDS_STORE = 'words';
const CONVERSATIONS_STORE = 'conversations';
const CAPTURES_STORE = 'captures';
const STUDY_SESSIONS_STORE = 'study-sessions';
import { ActiveLanguageProvider } from '@/app/_lib/contexts/ActiveLanguageContext';
import type { TargetLanguage } from '@/app/_lib/types/wordTypes';

let mockWords: Record<string, unknown>[] = [];
let mockConversations: Record<string, unknown>[] = [];
let mockCaptures: Record<string, unknown>[] = [];
let mockStudySessions: Record<string, unknown>[] = [];

const mockGetUser = vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } } });
const mockGetSession = vi.fn().mockResolvedValue({ data: { session: { user: { id: 'test-user-id' } } } });
const mockOnAuthStateChange = vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });

const mockFrom = vi.fn((table: string) => {
  let data: Record<string, unknown>[] = [];
  if (table === 'words') data = mockWords;
  else if (table === 'conversations') data = mockConversations;
  else if (table === 'captures') data = mockCaptures;
  else if (table === 'study_sessions') data = mockStudySessions;

  let filtered = [...data];
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn((col: string, val: unknown) => {
      filtered = filtered.filter((row) => row[col] === val);
      return builder;
    }),
    limit: vi.fn(() => builder),
    then: (resolve: (value: unknown) => void) => {
      resolve({
        data: filtered,
        count: filtered.length,
        error: null,
      });
    },
  };
  return builder;
});

vi.mock('@/app/_lib/supabase/supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: (...args: unknown[]) => mockGetUser(...args),
      getSession: (...args: unknown[]) => mockGetSession(...args),
      onAuthStateChange: (...args: unknown[]) => mockOnAuthStateChange(...args),
    },
    from: (table: string) => mockFrom(table),
  },
}));

beforeEach(() => {
  mockWords = [];
  mockConversations = [];
  mockCaptures = [];
  mockStudySessions = [];
  localStorage.clear();
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: 'test-user-id' } } });
  mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'test-user-id' } } } });
  mockOnAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
});

function seedStore(
  storeName: string,
  records: Record<string, unknown>[]
) {
  const seeded = records.map((r) => ({ ...r, user_id: 'test-user-id' }));
  if (storeName === 'words' || storeName === WORDS_STORE) {
    mockWords = seeded;
  } else if (storeName === 'conversations' || storeName === CONVERSATIONS_STORE) {
    mockConversations = seeded;
  } else if (storeName === 'captures' || storeName === CAPTURES_STORE) {
    mockCaptures = seeded;
  } else if (storeName === 'study_sessions' || storeName === 'study-sessions' || storeName === STUDY_SESSIONS_STORE) {
    mockStudySessions = seeded;
  }
}

function createWrapper(initialLanguage: TargetLanguage = 'english') {
  localStorage.setItem('tranly:active-language', initialLanguage);
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(ActiveLanguageProvider, null, children);
  Wrapper.displayName = 'TestWrapper';
  return Wrapper;
}

describe('useLanguageLearningStats', () => {
  it('starts with isLoading true', () => {
    const wrapper = createWrapper('english');
    const { result } = renderHook(() => useLanguageLearningStats(), { wrapper });
    expect(result.current.isLoading).toBe(true);
  });

  it('returns zero counts when no data exists for active language', async () => {
    const wrapper = createWrapper('english');
    const { result } = renderHook(() => useLanguageLearningStats(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.wordCount).toBe(0);
    expect(result.current.studySessionCount).toBe(0);
  });

  it('counts words for the active language', async () => {
    seedStore(WORDS_STORE, [
      { id: 'w1', language: 'english', createdAt: 1, word: 'apple', ipa: 'æpl', thaiTranslation: 'แอปเปิ้ล' },
      { id: 'w2', language: 'english', createdAt: 2, word: 'banana', ipa: 'bənænə', thaiTranslation: 'กล้วย' },
    ]);

    const wrapper = createWrapper('english');
    const { result } = renderHook(() => useLanguageLearningStats(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.wordCount).toBe(2);
  });

  it('counts study sessions for the active language', async () => {
    seedStore(STUDY_SESSIONS_STORE, [
      { id: 'ss1', language: 'english', flashcardSetId: 'fs1', completedAt: 1000, cardsReviewed: 5, createdAt: 1 },
      { id: 'ss3', language: 'english', completedAt: 3000, cardsReviewed: 10, createdAt: 3 },
    ]);

    const wrapper = createWrapper('english');
    const { result } = renderHook(() => useLanguageLearningStats(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.studySessionCount).toBe(2);
  });
});

