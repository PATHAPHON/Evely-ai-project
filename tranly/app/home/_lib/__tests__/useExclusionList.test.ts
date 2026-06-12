import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useExclusionList } from '../useExclusionList';

let mockWords: any[] = [];
let mockFeedWords: any[] = [];
const mockGetUser = vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } } });

const mockFrom = vi.fn((table: string) => {
  const data = table === 'words' ? mockWords : table === 'feed_words' ? mockFeedWords : [];
  let filtered = [...data];
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn((col: string, val: any) => {
      filtered = filtered.filter((row) => row[col] === val);
      return builder;
    }),
    then: (resolve: any) => {
      resolve({
        data: filtered,
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
    },
    from: (...args: any[]) => mockFrom(...args),
  },
}));

beforeEach(() => {
  mockWords = [];
  mockFeedWords = [];
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: 'test-user-id' } } });
});

function seedWordsStore(records: any[]) {
  mockWords = records.map((r) => ({ ...r, user_id: 'test-user-id' }));
}

function seedFeedWordsStore(records: any[]) {
  mockFeedWords = records.map((r) => ({ ...r, user_id: 'test-user-id' }));
}

describe('useExclusionList', () => {
  it('returns empty array when both stores are empty', async () => {
    const { result } = renderHook(() => useExclusionList());

    let exclusionList: string[] = [];
    await act(async () => {
      exclusionList = await result.current.getExclusionList();
    });

    expect(exclusionList).toEqual([]);
  });

  it('returns words from the words store (scanned)', async () => {
    seedWordsStore([
      { id: '1', word: 'apple', english: 'apple', label: 'แอปเปิ้ล', createdAt: 1, imageBlob: new Blob() },
      { id: '2', word: 'banana', english: 'banana', label: 'กล้วย', createdAt: 2, imageBlob: new Blob() },
    ]);

    const { result } = renderHook(() => useExclusionList());

    let exclusionList: string[] = [];
    await act(async () => {
      exclusionList = await result.current.getExclusionList();
    });

    expect(exclusionList).toContain('apple');
    expect(exclusionList).toContain('banana');
    expect(exclusionList).toHaveLength(2);
  });

  it('returns words from the feed-words store (generated)', async () => {
    seedFeedWordsStore([
      { id: '1', word: 'cat', ipa: '/kæt/', english: 'cat', thai: 'แมว', generatedDate: '2024-01-01', bookmarked: false, imageBlob: null, createdAt: 1 },
      { id: '2', word: 'dog', ipa: '/dɔːɡ/', english: 'dog', thai: 'สุนัข', generatedDate: '2024-01-01', bookmarked: false, imageBlob: null, createdAt: 2 },
    ]);

    const { result } = renderHook(() => useExclusionList());

    let exclusionList: string[] = [];
    await act(async () => {
      exclusionList = await result.current.getExclusionList();
    });

    expect(exclusionList).toContain('cat');
    expect(exclusionList).toContain('dog');
    expect(exclusionList).toHaveLength(2);
  });

  it('combines words from both stores', async () => {
    seedWordsStore([
      { id: '1', word: 'apple', english: 'apple', label: 'แอปเปิ้ล', createdAt: 1, imageBlob: new Blob() },
    ]);
    seedFeedWordsStore([
      { id: '2', word: 'cat', ipa: '/kæt/', english: 'cat', thai: 'แมว', generatedDate: '2024-01-01', bookmarked: false, imageBlob: null, createdAt: 1 },
    ]);

    const { result } = renderHook(() => useExclusionList());

    let exclusionList: string[] = [];
    await act(async () => {
      exclusionList = await result.current.getExclusionList();
    });

    expect(exclusionList).toContain('apple');
    expect(exclusionList).toContain('cat');
    expect(exclusionList).toHaveLength(2);
  });

  it('deduplicates words that appear in both stores', async () => {
    seedWordsStore([
      { id: '1', word: 'apple', english: 'apple', label: 'แอปเปิ้ล', createdAt: 1, imageBlob: new Blob() },
    ]);
    seedFeedWordsStore([
      { id: '2', word: 'apple', ipa: '/ˈæpəl/', english: 'apple', thai: 'แอปเปิ้ล', generatedDate: '2024-01-01', bookmarked: false, imageBlob: null, createdAt: 1 },
    ]);

    const { result } = renderHook(() => useExclusionList());

    let exclusionList: string[] = [];
    await act(async () => {
      exclusionList = await result.current.getExclusionList();
    });

    expect(exclusionList).toEqual(['apple']);
  });

  it('skips words store records without word field', async () => {
    seedWordsStore([
      { id: '1', word: 'apple', english: 'apple', label: 'แอปเปิ้ล', createdAt: 1, imageBlob: new Blob() },
      { id: '2', word: undefined, english: undefined, label: 'unknown', createdAt: 2, imageBlob: new Blob() },
    ]);

    const { result } = renderHook(() => useExclusionList());

    let exclusionList: string[] = [];
    await act(async () => {
      exclusionList = await result.current.getExclusionList();
    });

    expect(exclusionList).toEqual(['apple']);
  });
});
