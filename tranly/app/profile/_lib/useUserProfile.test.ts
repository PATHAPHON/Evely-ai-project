import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUserProfile } from './useUserProfile';

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
    expect(localStorage.getItem('tarnly:display-name')).toBe('Kim');
  });

  it('falls back to "Learner" when setting empty name', () => {
    localStorage.setItem('tarnly:display-name', 'Pat');
    const { result } = renderHook(() => useUserProfile());

    act(() => {
      result.current.setDisplayName('');
    });

    expect(result.current.displayName).toBe('Learner');
    expect(result.current.avatarInitial).toBe('L');
    expect(localStorage.getItem('tarnly:display-name')).toBeNull();
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
    expect(localStorage.getItem('tarnly:display-name')).toBe('Hello');
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
});
