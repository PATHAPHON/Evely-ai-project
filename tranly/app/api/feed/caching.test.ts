import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock supabaseServer BEFORE importing the routes.
// A single chainable builder backs every query:
// - `.single()` resolves via mockSingle (word-detail + feed cache lookups)
// - awaiting the builder directly resolves via mockPoolQuery
const mockSingle = vi.fn();
const mockPoolQuery = vi.fn().mockResolvedValue({ data: [], error: null });
const mockUpsert = vi.fn().mockResolvedValue({ error: null });

const builder: Record<string, unknown> = {
  select: vi.fn(() => builder),
  eq: vi.fn(() => builder),
  gt: vi.fn(() => builder),
  single: mockSingle,
  upsert: mockUpsert,
  then: (onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) =>
    Promise.resolve(mockPoolQuery()).then(onFulfilled, onRejected),
};

vi.mock('@/app/_lib/supabaseServer', () => {
  return {
    supabaseServer: {
      from: vi.fn(() => builder),
    },
  };
});

vi.mock('next/server', async (importOriginal) => {
  const original = await importOriginal<typeof import('next/server')>();
  return {
    ...original,
    after: vi.fn().mockImplementation((fn) => {
      // Execute the callback synchronously in tests
      fn();
    }),
  };
});

// Mock external KKU AI and Pexels fetch calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Import the route handlers
import { POST as feedPOST } from './route';
import { POST as wordDetailPOST } from '../word-detail/route';

describe('Caching Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.KKU_API_KEY = 'test-api-key';
    process.env.PEXELS_API_KEY = '';
  });

  describe('api/word-detail caching handler', () => {
    it('returns cached response on cache HIT', async () => {
      // 1. Mock Supabase to return cached data
      mockSingle.mockResolvedValueOnce({
        data: {
          response_json: {
            context: 'บริบทตัวอย่าง',
            examples: [],
            grammar: 'ไวยากรณ์ตัวอย่าง',
          },
        },
        error: null,
      });

      // 2. Invoke handler
      const req = new NextRequest('http://localhost/api/word-detail', {
        method: 'POST',
        body: JSON.stringify({
          word: '사과',
          language: 'korean',
        }),
      });

      const res = await wordDetailPOST(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.context).toBe('บริบทตัวอย่าง');

      // Verify fetch was NOT called (no AI call made)
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('makes AI API call and writes to cache on cache MISS', async () => {
      // 1. Mock Supabase to return no data (cache miss)
      mockSingle.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } });

      // 2. Mock external KKU API call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    context: 'ส้มเป็นผลไม้ชนิดหนึ่ง',
                    examples: [],
                    grammar: 'คำนาม',
                  }),
                },
              },
            ],
          }),
      });

      // 3. Mock Supabase cache upsert
      mockUpsert.mockResolvedValueOnce({ error: null });

      // 4. Invoke handler
      const req = new NextRequest('http://localhost/api/word-detail', {
        method: 'POST',
        body: JSON.stringify({
          word: '오렌지',
          language: 'korean',
        }),
      });

      const res = await wordDetailPOST(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.context).toBe('ส้มเป็นผลไม้ชนิดหนึ่ง');

      // Verify AI call was made
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Verify cache upsert was initiated (let it run async)
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(mockUpsert).toHaveBeenCalled();
    });
  });

  describe('api/feed caching handler', () => {
    const mockWordPool = [
      { language: 'english', word: 'apple', ipa: 'ˈæpəl', thai: 'แอปเปิ้ล' },
      { language: 'english', word: 'banana', ipa: 'bəˈnɑːnə', thai: 'กล้วย' },
      { language: 'english', word: 'orange', ipa: 'ˈɒrɪndʒ', thai: 'ส้ม' },
    ];

    // Helper: build a KKU-shaped AI response whose content is a JSON array of words.
    const aiResponse = (words: unknown[]) => ({
      ok: true,
      text: async () =>
        JSON.stringify({
          choices: [{ message: { content: JSON.stringify(words) } }],
        }),
    });

    it('serves from cached pool and filters excludeWords', async () => {
      // 1. Mock Supabase to return cached word pool
      mockSingle.mockResolvedValueOnce({
        data: {
          words: mockWordPool,
        },
        error: null,
      });

      // 2. Request 2 words excluding 'apple'
      const req = new NextRequest('http://localhost/api/feed', {
        method: 'POST',
        body: JSON.stringify({
          language: 'english',
          count: 2,
          excludeWords: ['apple'],
        }),
      });

      const res = await feedPOST(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.words.length).toBe(2);

      // 'apple' should be filtered out, leaving 'banana' and 'orange'
      expect(json.words[0].word).toBe('banana');
      expect(json.words[1].word).toBe('orange');

      // Verify AI API was NOT called
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('regenerates pool from AI if cache is exhausted (remaining words < count)', async () => {
      // 1. Mock Supabase to return cached pool (exhausted: 3 words but 2 are excluded)
      mockSingle.mockResolvedValueOnce({
        data: {
          words: mockWordPool,
        },
        error: null,
      });

      // 2. Mock the KKU AI call (the new word source)
      mockFetch.mockResolvedValueOnce(
        aiResponse([
          { word: 'strawberry', ipa: 'ˈstrɔːbəri', thai: 'สตรอว์เบอร์รี', part_of_speech: 'คำนาม', image_queries: ['strawberry', 'strawberry fruit', 'strawberry red'] },
          { word: 'grape', ipa: 'ɡreɪp', thai: 'องุ่น', part_of_speech: 'คำนาม', image_queries: ['grape', 'grapes', 'grape fruit'] },
        ])
      );

      // 3. Invoke handler asking for 2 words, excluding 'apple' and 'banana'
      const req = new NextRequest('http://localhost/api/feed', {
        method: 'POST',
        body: JSON.stringify({
          language: 'english',
          count: 2,
          excludeWords: ['apple', 'banana'],
        }),
      });

      const res = await feedPOST(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.words.length).toBe(2);
      expect(json.words[0].word).toBe('strawberry');
      expect(json.words[1].word).toBe('grape');

      // Verify the AI call was made (AI is the source now)
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('returns an empty array when the AI pool is fully excluded', async () => {
      // Cache miss → fall through to AI generation
      mockSingle.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } });
      mockFetch.mockResolvedValueOnce(
        aiResponse([
          { word: 'apple', ipa: 'ˈæpəl', thai: 'แอปเปิ้ล', part_of_speech: 'คำนาม', image_queries: ['apple', 'apple fruit', 'apple red'] },
        ])
      );

      const req = new NextRequest('http://localhost/api/feed', {
        method: 'POST',
        body: JSON.stringify({
          language: 'english',
          count: 2,
          excludeWords: ['apple'],
        }),
      });

      const res = await feedPOST(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.words).toEqual([]);
    });
  });
});
