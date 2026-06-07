import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock supabaseServer BEFORE importing the routes
const mockSingle = vi.fn();
const mockSelect = vi.fn().mockReturnValue({
  eq: vi.fn().mockReturnValue({
    gt: vi.fn().mockReturnValue({
      single: mockSingle,
    }),
  }),
});
const mockUpsert = vi.fn().mockResolvedValue({ error: null });

vi.mock('@/app/_lib/supabaseServer', () => {
  return {
    supabaseServer: {
      from: vi.fn().mockImplementation(() => ({
        select: mockSelect,
        upsert: mockUpsert,
      })),
    },
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
      { korean: '사과', reading: 'ซากวา', romanization: 'sagwa', english: 'apple', thai: 'แอปเปิ้ล' },
      { korean: '바나นา', reading: 'บานานา', romanization: 'banana', english: 'banana', thai: 'กล้วย' },
      { korean: '오렌지', reading: 'โอเรนจี', romanization: 'orenji', english: 'orange', thai: 'ส้ม' },
    ];

    it('serves from cached pool and filters excludeWords', async () => {
      // 1. Mock Supabase to return cached word pool
      mockSingle.mockResolvedValueOnce({
        data: {
          words: mockWordPool,
        },
        error: null,
      });

      // 2. Request 2 words excluding 'apple' / '사과'
      const req = new NextRequest('http://localhost/api/feed', {
        method: 'POST',
        body: JSON.stringify({
          language: 'korean',
          count: 2,
          excludeWords: ['apple'],
        }),
      });

      const res = await feedPOST(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.words.length).toBe(2);

      // 'apple' ('사과') should be filtered out, leaving 'banana' and 'orange'
      expect(json.words[0].korean).toBe('바나นา');
      expect(json.words[1].korean).toBe('오렌지');

      // Verify AI API was NOT called
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('regenerates pool if cache is exhausted (remaining words < count)', async () => {
      // 1. Mock Supabase to return cached pool (exhausted, only 3 words but 2 are excluded)
      mockSingle.mockResolvedValueOnce({
        data: {
          words: mockWordPool,
        },
        error: null,
      });

      // 2. Mock external KKU AI API call (will return a new pool)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify([
                    { korean: '딸기', reading: 'ตัลกี', romanization: 'ttalgi', english: 'strawberry', thai: 'สตรอว์เบอร์รี' },
                    { korean: '포도', reading: 'โพโด', romanization: 'podo', english: 'grape', thai: 'องุ่น' },
                  ]),
                },
              },
            ],
          }),
      });

      // 3. Invoke handler asking for 2 words, excluding 'apple' and 'banana'
      const req = new NextRequest('http://localhost/api/feed', {
        method: 'POST',
        body: JSON.stringify({
          language: 'korean',
          count: 2,
          excludeWords: ['apple', 'banana'],
        }),
      });

      const res = await feedPOST(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.words.length).toBe(2);
      expect(json.words[0].korean).toBe('딸기');
      expect(json.words[1].korean).toBe('포도');

      // Verify AI call was made to regenerate the pool
      expect(mockFetch).toHaveBeenCalled();
    });
  });
});
