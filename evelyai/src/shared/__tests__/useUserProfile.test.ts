import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUserProfile } from '../hooks/useUserProfile';

// Mock Supabase Client
vi.mock('@/shared/supabase/supabaseClient', () => {
  return {
    supabase: {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
        onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
        update: vi.fn().mockResolvedValue({ error: null }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      }),
    },
  };
});

beforeEach(() => {
  localStorage.clear();
});

describe('useUserProfile', () => {
  it('defaults to "Learner" when no stored value', () => {
    const { result } = renderHook(() => useUserProfile());
    expect(result.current.displayName).toBe('Learner');
  });

  it('derives avatar initial from first character of display name', () => {
    const { result } = renderHook(() => useUserProfile());
    expect(result.current.avatarInitial).toBe('L');
  });

  it('reads stored display name from localStorage on mount', () => {
    localStorage.setItem('tarnly:display-name', 'Pat');
    const { result } = renderHook(() => useUserProfile());
    expect(result.current.displayName).toBe('Pat');
    expect(result.current.avatarInitial).toBe('P');
  });

  it('setDisplayName updates name and persists to localStorage', () => {
    const { result } = renderHook(() => useUserProfile());

    act(() => {
      result.current.setDisplayName('Kim');
    });

    expect(result.current.displayName).toBe('Kim');
    expect(result.current.avatarInitial).toBe('K');
    expect(localStorage.getItem('evelyai:display-name')).toBe('Kim');
  });

  it('falls back to "Learner" when setting empty name', () => {
    localStorage.setItem('tarnly:display-name', 'Pat');
    const { result } = renderHook(() => useUserProfile());

    act(() => {
      result.current.setDisplayName('');
    });

    expect(result.current.displayName).toBe('Learner');
    expect(result.current.avatarInitial).toBe('L');
    expect(localStorage.getItem('evelyai:display-name')).toBeNull();
  });

  it('falls back to "Learner" when setting whitespace-only name', () => {
    const { result } = renderHook(() => useUserProfile());

    act(() => {
      result.current.setDisplayName('   ');
    });

    expect(result.current.displayName).toBe('Learner');
    expect(result.current.avatarInitial).toBe('L');
  });

  it('trims whitespace from display name', () => {
    const { result } = renderHook(() => useUserProfile());

    act(() => {
      result.current.setDisplayName('  Hello  ');
    });

    expect(result.current.displayName).toBe('Hello');
    expect(localStorage.getItem('evelyai:display-name')).toBe('Hello');
  });

  it('migrates legacy tranly: prefix to evelyai: on read', () => {
    localStorage.setItem('tranly:display-name', 'LegacyUser');
    const { result } = renderHook(() => useUserProfile());

    expect(result.current.displayName).toBe('LegacyUser');
    expect(localStorage.getItem('evelyai:display-name')).toBe('LegacyUser');
    expect(localStorage.getItem('tranly:display-name')).toBeNull();
  });

  it('handles Korean characters for avatar initial', () => {
    const { result } = renderHook(() => useUserProfile());

    act(() => {
      result.current.setDisplayName('한국어');
    });

    expect(result.current.avatarInitial).toBe('한');
  });

  it('ignores stored empty string and defaults to Learner', () => {
    localStorage.setItem('tarnly:display-name', '');
    const { result } = renderHook(() => useUserProfile());
    expect(result.current.displayName).toBe('Learner');
  });

  it('defaults extra fields to empty strings', () => {
    const { result } = renderHook(() => useUserProfile());
    expect(result.current.handle).toBe('');
  });

  it('reads stored extra fields on mount', () => {
    localStorage.setItem('tarnly:profile:handle', 'pat');
    const { result } = renderHook(() => useUserProfile());
    expect(result.current.handle).toBe('pat');
  });

  it('updateProfile patches fields and persists them (trimmed)', () => {
    const { result } = renderHook(() => useUserProfile());

    act(() => {
      result.current.updateProfile({
        displayName: 'Kim',
        handle: '  kimchi  ',
      });
    });

    expect(result.current.displayName).toBe('Kim');
    expect(result.current.handle).toBe('kimchi');
    expect(localStorage.getItem('evelyai:profile:handle')).toBe('kimchi');
  });

  it('updateProfile clears a field when given an empty string', () => {
    localStorage.setItem('tarnly:profile:handle', 'old');
    const { result } = renderHook(() => useUserProfile());

    act(() => {
      result.current.updateProfile({ handle: '' });
    });

    expect(result.current.handle).toBe('');
    expect(localStorage.getItem('evelyai:profile:handle')).toBeNull();
  });

  it('marks isUnlimited and Infinity budget limit when handle is admin', () => {
    localStorage.setItem('evelyai:profile:handle', 'admin');
    const { result } = renderHook(() => useUserProfile());

    expect(result.current.isUnlimited).toBe(true);
    expect(result.current.isPremium).toBe(true);
    expect(result.current.dailyBudgetLimit).toBe(Infinity);
    expect(result.current.isBudgetExhausted).toBe(false);
  });
});
