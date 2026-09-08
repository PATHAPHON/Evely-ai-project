import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';

// Mock next/headers cookies
const mockGetCookie = vi.fn();
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    getAll: () => [],
    get: mockGetCookie,
  })),
}));

// Mock @supabase/ssr
const mockGetUser = vi.fn();
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: mockGetUser,
    },
  })),
}));

// Mock @supabase/supabase-js
const mockUpdate = vi.fn();
const mockEq = vi.fn(() => Promise.resolve({ error: null }));
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      update: vi.fn((patch) => {
        mockUpdate(patch);
        return { eq: mockEq };
      }),
    })),
  })),
}));

describe('POST /api/stripe/sync-session', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
      STRIPE_SECRET_KEY: 'sk_test_mock',
    };
  });

  it('returns 401 when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const req = new Request('http://localhost:3000/api/stripe/sync-session', {
      method: 'POST',
      body: JSON.stringify({ sessionId: 'cs_test_123' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('handles mock mode and updates profile to active', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'usr-123', email: 'test@example.com' } } });

    const req = new Request('http://localhost:3000/api/stripe/sync-session', {
      method: 'POST',
      body: JSON.stringify({ isMock: true }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.isPremium).toBe(true);

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        subscription_status: 'active',
      })
    );
    expect(mockEq).toHaveBeenCalledWith('id', 'usr-123');
  });
});
