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
    budgetExhaustedResponse: () =>
      NextResponse.json({ error: 'Budget exhausted' }, { status: 429 }),
  };
});

import {
  getRequestUser,
  checkBudget,
  debitBudget,
} from '@/app/api/_lib/utils/requireUser';

describe('POST /api/tts', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...originalEnv,
      OPENROUTER_API_KEY: 'test-api-key',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('returns 401 if user is not authenticated', async () => {
    vi.mocked(getRequestUser).mockResolvedValueOnce(null);

    const req = new NextRequest('http://localhost/api/tts', {
      method: 'POST',
      body: JSON.stringify({ text: 'Hello world' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 400 if text is missing or invalid', async () => {
    vi.mocked(getRequestUser).mockResolvedValueOnce({ id: 'user-1', isPremium: false, isUnlimited: false });

    const req = new NextRequest('http://localhost/api/tts', {
      method: 'POST',
      body: JSON.stringify({ text: '' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 429 if budget is exhausted on cache miss', async () => {
    vi.mocked(getRequestUser).mockResolvedValueOnce({ id: 'user-1', isPremium: false, isUnlimited: false });
    vi.mocked(checkBudget).mockResolvedValueOnce(false);

    const uniqueText = `Uncached test text ${Date.now()}`;
    const req = new NextRequest('http://localhost/api/tts', {
      method: 'POST',
      body: JSON.stringify({ text: uniqueText }),
    });

    const res = await POST(req);
    expect(res.status).toBe(429);
  });

  it('calls OpenRouter TTS and debits budget on success', async () => {
    vi.mocked(getRequestUser).mockResolvedValueOnce({ id: 'user-1', isPremium: false, isUnlimited: false });
    vi.mocked(checkBudget).mockResolvedValueOnce(true);

    const dummyPcm = new Uint8Array(480).buffer;
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      arrayBuffer: async () => dummyPcm,
    });
    vi.stubGlobal('fetch', fetchMock);

    const uniqueText = `Unique speak speech text ${Date.now()}`;
    const req = new NextRequest('http://localhost/api/tts', {
      method: 'POST',
      body: JSON.stringify({ text: uniqueText, voice: 'Aoede' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('audio/wav');
    expect(res.headers.get('X-Cache')).toBe('MISS');
    expect(debitBudget).toHaveBeenCalledWith(500);
  });
});
