import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from '../route';
import { NextRequest } from 'next/server';

vi.mock('next/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/server')>();
  return {
    ...actual,
    after: vi.fn((fn: () => void | Promise<void>) => {
      void fn();
    }),
  };
});

vi.mock('@/app/api/_lib/utils/requireUser', async () => {
  const { NextResponse } = await import('next/server');
  return {
    getRequestUser: vi.fn(),
    unauthorizedResponse: () =>
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    checkBudget: vi.fn(),
    debitBudget: vi.fn(),
  };
});

const mockSelect = vi.fn();
const mockUpload = vi.fn();
const mockGetPublicUrl = vi.fn();
const mockUpsert = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn().mockReturnValue({
    from: (table: string) => {
      if (table === 'word_images') {
        return {
          select: () => ({
            in: mockSelect,
          }),
          upsert: mockUpsert,
        };
      }
      return {};
    },
    storage: {
      from: () => ({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      }),
    },
  }),
}));

import {
  getRequestUser,
  checkBudget,
  debitBudget,
} from '@/app/api/_lib/utils/requireUser';

describe('POST /api/word-image', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: 'https://mock.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
      OPENROUTER_API_KEY: 'test-api-key',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('returns 401 if user is not authenticated', async () => {
    vi.mocked(getRequestUser).mockResolvedValueOnce(null);

    const req = new NextRequest('http://localhost/api/word-image', {
      method: 'POST',
      body: JSON.stringify({ words: ['apple'] }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns cached images directly without calling AI or debiting budget', async () => {
    vi.mocked(getRequestUser).mockResolvedValueOnce({ id: 'user-1', isPremium: false, isUnlimited: false });
    mockSelect.mockResolvedValueOnce({
      data: [{ word: 'apple', image_url: 'https://mock.com/apple.png' }],
      error: null,
    });

    const req = new NextRequest('http://localhost/api/word-image', {
      method: 'POST',
      body: JSON.stringify({ words: ['apple'] }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.images).toEqual({ apple: 'https://mock.com/apple.png' });
    expect(checkBudget).not.toHaveBeenCalled();
    expect(debitBudget).not.toHaveBeenCalled();
  });

  it('returns cached images and X-Budget-Exhausted header when budget is exhausted for missing words', async () => {
    vi.mocked(getRequestUser).mockResolvedValueOnce({ id: 'user-1', isPremium: false, isUnlimited: false });
    mockSelect.mockResolvedValueOnce({
      data: [{ word: 'apple', image_url: 'https://mock.com/apple.png' }],
      error: null,
    });
    vi.mocked(checkBudget).mockResolvedValueOnce(false);

    const req = new NextRequest('http://localhost/api/word-image', {
      method: 'POST',
      body: JSON.stringify({ words: ['apple', 'banana'] }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('X-Budget-Exhausted')).toBe('1');
    const data = await res.json();
    expect(data.images).toEqual({ apple: 'https://mock.com/apple.png' });
    expect(debitBudget).not.toHaveBeenCalled();
  });

  it('generates missing images and debits budget when budget is available', async () => {
    vi.mocked(getRequestUser).mockResolvedValueOnce({ id: 'user-1', isPremium: false, isUnlimited: false });
    mockSelect.mockResolvedValueOnce({
      data: [],
      error: null,
    });
    vi.mocked(checkBudget).mockResolvedValueOnce(true);

    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [{ b64_json: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==' }],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    mockUpload.mockResolvedValueOnce({ error: null });
    mockGetPublicUrl.mockReturnValueOnce({ data: { publicUrl: 'https://mock.com/cat.png' } });
    mockUpsert.mockResolvedValueOnce({ error: null });

    const req = new NextRequest('http://localhost/api/word-image', {
      method: 'POST',
      body: JSON.stringify({ words: ['cat'] }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.images.cat).toBe('https://mock.com/cat.png');
    expect(debitBudget).toHaveBeenCalledWith(1000); // 1 image * 1000 µ฿
  });
});
