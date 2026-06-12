import { describe, it, expect, beforeEach, vi } from 'vitest';
import { shouldFetchToday } from '../shouldFetchToday';


let mockFeedWords: any[] = [];
const mockGetUser = vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } } });

const mockFrom = vi.fn((table: string) => {
  if (table === 'feed_words') {
    let filtered = [...mockFeedWords];
    let isDelete = false;

    const builder = {
      select: vi.fn(() => builder),
      eq: vi.fn((col: string, val: any) => {
        filtered = filtered.filter((row) => row[col] === val);
        return builder;
      }),
      lt: vi.fn((col: string, val: any) => {
        filtered = filtered.filter((row) => row[col] < val);
        return builder;
      }),
      delete: vi.fn(() => {
        isDelete = true;
        return builder;
      }),
      then: (resolve: any) => {
        if (isDelete) {
          mockFeedWords = mockFeedWords.filter((row) => !filtered.includes(row));
          resolve({ data: null, error: null });
        } else {
          resolve({
            data: filtered,
            count: filtered.length,
            error: null,
          });
        }
      },
    };
    return builder;
  }
  return {
    select: () => ({
      eq: () => ({
        single: () => Promise.resolve({ data: null, error: null }),
      }),
    }),
  };
});

vi.mock('@/app/_lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: (...args: any[]) => mockGetUser(...args),
    },
    from: (...args: any[]) => mockFrom(...args),
  },
}));

function getTodayDateKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function insertRecord(record: any): void {
  mockFeedWords.push({
    ...record,
    generated_date: record.generatedDate || record.generated_date || getTodayDateKey(),
    user_id: 'test-user-id',
  });
}

function makeRecord(overrides: any = {}): any {
  return {
    id: crypto.randomUUID(),
    language: 'korean',
    korean: '사과',
    reading: 'ซากวา',
    romanization: 'sagwa',
    english: 'apple',
    thai: 'แอปเปิ้ล',
    generatedDate: getTodayDateKey(),
    bookmarked: false,
    createdAt: Date.now(),
    ...overrides,
  };
}

describe('shouldFetchToday', () => {
  beforeEach(() => {
    mockFeedWords = [];
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: 'test-user-id' } } });
  });

  it('returns true when no records exist for today and language', async () => {
    const result = await shouldFetchToday('korean');
    expect(result).toBe(true);
  });

  it('returns false when records exist for today and the same language', async () => {
    insertRecord(makeRecord({ language: 'korean' }));

    const result = await shouldFetchToday('korean');
    expect(result).toBe(false);
  });

  it('returns true when records exist for today but a different language', async () => {
    insertRecord(makeRecord({ language: 'korean' }));

    const result = await shouldFetchToday('japanese');
    expect(result).toBe(true);
  });

  it('returns true when only records from other dates exist for the language', async () => {
    insertRecord(makeRecord({ generatedDate: '2024-01-01', language: 'korean' }));

    const result = await shouldFetchToday('korean');
    expect(result).toBe(true);
  });

  it('returns false when multiple records exist for today and language', async () => {
    insertRecord(makeRecord({ korean: '사과', language: 'korean' }));
    insertRecord(makeRecord({ korean: '바นานา', language: 'korean' }));

    const result = await shouldFetchToday('korean');
    expect(result).toBe(false);
  });

  it('handles each language independently', async () => {
    insertRecord(makeRecord({ language: 'korean' }));
    insertRecord(makeRecord({ language: 'japanese', kanji: '猫', hiragana: 'ねこ', romaji: 'neko' }));

    expect(await shouldFetchToday('korean')).toBe(false);
    expect(await shouldFetchToday('japanese')).toBe(false);
    expect(await shouldFetchToday('english')).toBe(true);
    expect(await shouldFetchToday('chinese')).toBe(true);
  });

  describe('30-day retention policy', () => {
    it('cleans up records older than 30 days for the given language', async () => {
      // Insert a record from 31 days ago
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 31);
      const oldDateKey = `${oldDate.getFullYear()}-${String(oldDate.getMonth() + 1).padStart(2, '0')}-${String(oldDate.getDate()).padStart(2, '0')}`;

      insertRecord(makeRecord({ generatedDate: oldDateKey, language: 'korean' }));

      // Call shouldFetchToday which triggers cleanup
      await shouldFetchToday('korean');

      // Wait a tick for the background cleanup to complete
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockFeedWords.length).toBe(0);
    });

    it('preserves records within 30 days', async () => {
      // Insert a record from 29 days ago (should be kept)
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 29);
      const recentDateKey = `${recentDate.getFullYear()}-${String(recentDate.getMonth() + 1).padStart(2, '0')}-${String(recentDate.getDate()).padStart(2, '0')}`;

      insertRecord(makeRecord({ generatedDate: recentDateKey, language: 'korean' }));

      // Call shouldFetchToday which triggers cleanup
      await shouldFetchToday('korean');

      // Wait a tick for the background cleanup to complete
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockFeedWords.length).toBe(1);
    });

    it('only cleans up records for the specified language', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 31);
      const oldDateKey = `${oldDate.getFullYear()}-${String(oldDate.getMonth() + 1).padStart(2, '0')}-${String(oldDate.getDate()).padStart(2, '0')}`;

      // Insert old records for both languages
      insertRecord(makeRecord({ generatedDate: oldDateKey, language: 'korean' }));
      insertRecord(makeRecord({ generatedDate: oldDateKey, language: 'japanese', kanji: '猫', hiragana: 'ねこ', romaji: 'neko' }));

      // Cleanup only korean
      await shouldFetchToday('korean');

      // Wait for cleanup
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockFeedWords.length).toBe(1);
      expect(mockFeedWords[0].language).toBe('japanese');
    });
  });
});
