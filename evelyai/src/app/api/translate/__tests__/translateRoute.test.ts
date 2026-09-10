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

vi.mock('@/app/api/_lib/utils/openRouterTranslate', () => {
  return {
    OpenRouterTranslator: class {
      translateWithUsage() {
        return Promise.resolve({
          translations: ['สวัสดี'],
          tokens: 50,
        });
      }
    },
  };
});

import {
  getRequestUser,
  checkBudget,
  debitBudget,
} from '@/app/api/_lib/utils/requireUser';

describe('POST /api/translate', () => {
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

    const req = new NextRequest('http://localhost/api/translate', {
      method: 'POST',
      body: JSON.stringify({ texts: ['Hello'] }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 429 if budget is exhausted', async () => {
    vi.mocked(getRequestUser).mockResolvedValueOnce({ id: 'user-1', isPremium: false, isUnlimited: false });
    vi.mocked(checkBudget).mockResolvedValueOnce(false);

    const req = new NextRequest('http://localhost/api/translate', {
      method: 'POST',
      body: JSON.stringify({ texts: ['Hello'] }),
    });

    const res = await POST(req);
    expect(res.status).toBe(429);
  });

  it('returns translations and debits budget on success', async () => {
    vi.mocked(getRequestUser).mockResolvedValueOnce({ id: 'user-1', isPremium: false, isUnlimited: false });
    vi.mocked(checkBudget).mockResolvedValueOnce(true);

    const req = new NextRequest('http://localhost/api/translate', {
      method: 'POST',
      body: JSON.stringify({ texts: ['Hello'] }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.translations).toEqual(['สวัสดี']);
    expect(debitBudget).toHaveBeenCalledWith(100); // 50 tokens * 2 µ฿/token
  });
});
