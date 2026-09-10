import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from '../route';

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
} from '@/app/api/_lib/utils/requireUser';

describe('POST /api/stt', () => {
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

    const req = new Request('http://localhost/api/stt', {
      method: 'POST',
      body: JSON.stringify({ audio: 'dGVzdA==' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 429 if budget is exhausted', async () => {
    vi.mocked(getRequestUser).mockResolvedValueOnce({ id: 'user-1', isPremium: false, isUnlimited: false });
    vi.mocked(checkBudget).mockResolvedValueOnce(false);

    const req = new Request('http://localhost/api/stt', {
      method: 'POST',
      body: JSON.stringify({ audio: 'dGVzdA==' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(429);
  });

  it('returns 400 if audio is missing', async () => {
    vi.mocked(getRequestUser).mockResolvedValueOnce({ id: 'user-1', isPremium: false, isUnlimited: false });
    vi.mocked(checkBudget).mockResolvedValueOnce(true);

    const req = new Request('http://localhost/api/stt', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Missing audio data');
  });

  it('calls OpenRouter with google/chirp-3 by default and returns transcribed text', async () => {
    vi.mocked(getRequestUser).mockResolvedValueOnce({ id: 'user-1', isPremium: false, isUnlimited: false });
    vi.mocked(checkBudget).mockResolvedValueOnce(true);

    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ text: 'Hello, how are you?' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const req = new Request('http://localhost/api/stt', {
      method: 'POST',
      body: JSON.stringify({
        audio: 'dGVzdC1hdWRpbw==',
        format: 'webm',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.text).toBe('Hello, how are you?');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://openrouter.ai/api/v1/audio/transcriptions');
    expect(options.headers.Authorization).toBe('Bearer test-api-key');

    const sentBody = JSON.parse(options.body as string);
    expect(sentBody.model).toBe('google/chirp-3');
    expect(sentBody.input_audio.data).toBe('dGVzdC1hdWRpbw==');
    expect(sentBody.input_audio.format).toBe('webm');
    expect(sentBody.language).toBe('en');
  });

  it('supports custom language and OPENROUTER_STT_MODEL override', async () => {
    process.env.OPENROUTER_STT_MODEL = 'custom/model';
    vi.mocked(getRequestUser).mockResolvedValueOnce({ id: 'user-1', isPremium: true, isUnlimited: false });
    vi.mocked(checkBudget).mockResolvedValueOnce(true);

    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ text: 'สวัสดีครับ' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const req = new Request('http://localhost/api/stt', {
      method: 'POST',
      body: JSON.stringify({
        audio: 'dGhhaS1hdWRpbw==',
        format: 'wav',
        language: 'th',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.text).toBe('สวัสดีครับ');

    const sentBody = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(sentBody.model).toBe('custom/model');
    expect(sentBody.language).toBe('th');
  });

  it('returns 502 when OpenRouter STT service fails', async () => {
    vi.mocked(getRequestUser).mockResolvedValueOnce({ id: 'user-1', isPremium: false, isUnlimited: false });
    vi.mocked(checkBudget).mockResolvedValueOnce(true);

    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: async () => 'Provider error',
    });
    vi.stubGlobal('fetch', fetchMock);

    const req = new Request('http://localhost/api/stt', {
      method: 'POST',
      body: JSON.stringify({ audio: 'dGVzdA==' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(502);
    const data = await res.json();
    expect(data.error).toContain('OpenRouter STT service failed');
  });
});
