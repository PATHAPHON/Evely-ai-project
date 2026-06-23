import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUserProfile } from '../hooks/useUserProfile';

// Mock Supabase Client
vi.mock('@/app/_lib/supabase/supabaseClient', () => {
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
    expect(localStorage.getItem('tranly:display-name')).toBe('Kim');
  });

  it('falls back to "Learner" when setting empty name', () => {
    localStorage.setItem('tarnly:display-name', 'Pat');
    const { result } = renderHook(() => useUserProfile());

    act(() => {
      result.current.setDisplayName('');
    });

    expect(result.current.displayName).toBe('Learner');
    expect(result.current.avatarInitial).toBe('L');
    expect(localStorage.getItem('tranly:display-name')).toBeNull();
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
    expect(localStorage.getItem('tranly:display-name')).toBe('Hello');
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
    expect(result.current.role).toBe('');
    expect(result.current.bio).toBe('');
    expect(result.current.location).toBe('');
  });

  it('reads stored extra fields on mount', () => {
    localStorage.setItem('tarnly:profile:handle', 'pat');
    localStorage.setItem('tarnly:profile:role', 'Learner');
    localStorage.setItem('tarnly:profile:bio', 'Hello');
    localStorage.setItem('tarnly:profile:location', 'Bangkok');
    const { result } = renderHook(() => useUserProfile());
    expect(result.current.handle).toBe('pat');
    expect(result.current.role).toBe('Learner');
    expect(result.current.bio).toBe('Hello');
    expect(result.current.location).toBe('Bangkok');
  });

  it('updateProfile patches fields and persists them (trimmed)', () => {
    const { result } = renderHook(() => useUserProfile());

    act(() => {
      result.current.updateProfile({
        displayName: 'Kim',
        handle: '  kimchi  ',
        bio: 'studying',
      });
    });

    expect(result.current.displayName).toBe('Kim');
    expect(result.current.handle).toBe('kimchi');
    expect(result.current.bio).toBe('studying');
    expect(localStorage.getItem('tranly:profile:handle')).toBe('kimchi');
    expect(localStorage.getItem('tranly:profile:bio')).toBe('studying');
  });

  it('updateProfile clears a field when given an empty string', () => {
    localStorage.setItem('tarnly:profile:role', 'old');
    const { result } = renderHook(() => useUserProfile());

    act(() => {
      result.current.updateProfile({ role: '' });
    });

    expect(result.current.role).toBe('');
    expect(localStorage.getItem('tranly:profile:role')).toBeNull();
  });
});
