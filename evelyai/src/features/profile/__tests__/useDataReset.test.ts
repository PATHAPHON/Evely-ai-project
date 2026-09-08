import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDataReset } from '../hooks/useDataReset';

const mockDelete = vi.fn().mockReturnThis();
const mockEq = vi.fn().mockResolvedValue({ error: null });
const mockUpdate = vi.fn().mockReturnThis();

const mockGetUser = vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } } });

const mockFrom = vi.fn(() => {
  return {
    delete: mockDelete,
    update: mockUpdate,
    eq: mockEq,
  };
});

vi.mock('@/shared/supabase/supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: (...args: unknown[]) => mockGetUser(...args),
    },
    from: () => mockFrom(),
  },
}));

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: 'test-user-id' } } });
  mockEq.mockResolvedValue({ error: null });
});

describe('useDataReset', () => {
  it('returns resetAllData function and isResetting state', () => {
    const { result } = renderHook(() => useDataReset());
    expect(typeof result.current.resetAllData).toBe('function');
    expect(result.current.isResetting).toBe(false);
  });

  it('triggers Supabase cleanup', async () => {
    const { result } = renderHook(() => useDataReset());

    await act(async () => {
      await result.current.resetAllData();
    });

    // Verify Supabase deletions occurred
    expect(mockDelete).toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalledWith({
      daily_spend_microbaht: 0,
    });
  });

  it('clears all localStorage keys with evelyai:, tarnly:, or tranly: prefix', async () => {
    localStorage.setItem('evelyai:theme', 'dark');
    localStorage.setItem('tarnly:theme', 'dark');
    localStorage.setItem('tarnly:display-name', 'Pat');
    localStorage.setItem('tarnly:ai-api-key', 'sk-123');
    localStorage.setItem('tranly:some-key', 'value');
    localStorage.setItem('other-key', 'should-remain');

    const { result } = renderHook(() => useDataReset());

    await act(async () => {
      await result.current.resetAllData();
    });

    expect(localStorage.getItem('evelyai:theme')).toBeNull();
    expect(localStorage.getItem('tarnly:theme')).toBeNull();
    expect(localStorage.getItem('tarnly:display-name')).toBeNull();
    expect(localStorage.getItem('tarnly:ai-api-key')).toBeNull();
    expect(localStorage.getItem('tranly:some-key')).toBeNull();
    expect(localStorage.getItem('other-key')).toBe('should-remain');
  });

  it('initially has isResetting set to false', () => {
    const { result } = renderHook(() => useDataReset());
    expect(result.current.isResetting).toBe(false);
  });
});
