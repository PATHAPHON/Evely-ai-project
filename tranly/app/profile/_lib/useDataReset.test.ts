import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDataReset } from './useDataReset';

const mockDelete = vi.fn().mockReturnThis();
const mockEq = vi.fn().mockResolvedValue({ error: null });
const mockUpdate = vi.fn().mockReturnThis();

const mockList = vi.fn().mockResolvedValue({ data: [{ name: 'file1.jpg' }], error: null });
const mockRemove = vi.fn().mockResolvedValue({ error: null });

const mockGetUser = vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } } });

const mockFrom = vi.fn((table: string) => {
  return {
    delete: mockDelete,
    update: mockUpdate,
    eq: mockEq,
  };
});

const mockStorageFrom = vi.fn((bucket: string) => {
  return {
    list: mockList,
    remove: mockRemove,
  };
});

vi.mock('@/app/_lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: (...args: any[]) => mockGetUser(...args),
    },
    from: (...args: any[]) => mockFrom(...args),
    storage: {
      from: (...args: any[]) => mockStorageFrom(...args),
    },
  },
}));

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: 'test-user-id' } } });
  mockList.mockResolvedValue({ data: [{ name: 'file1.jpg' }], error: null });
  mockRemove.mockResolvedValue({ error: null });
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
      gems: 176,
      energy: 15,
      streak: 0,
      max_streak: 0,
      claimed_chests: [],
      completed_exams: [],
    });
    expect(mockList).toHaveBeenCalled();
    expect(mockRemove).toHaveBeenCalled();
  });

  it('clears all localStorage keys with tarnly: or tranly: prefix', async () => {
    localStorage.setItem('tarnly:theme', 'dark');
    localStorage.setItem('tarnly:display-name', 'Pat');
    localStorage.setItem('tarnly:ai-api-key', 'sk-123');
    localStorage.setItem('tranly:some-key', 'value');
    localStorage.setItem('other-key', 'should-remain');

    const { result } = renderHook(() => useDataReset());

    await act(async () => {
      await result.current.resetAllData();
    });

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
