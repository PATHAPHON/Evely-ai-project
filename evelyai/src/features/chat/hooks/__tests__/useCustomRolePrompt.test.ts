import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCustomRolePrompt, CUSTOM_ROLE_PROMPT_KEY } from '../useCustomRolePrompt';
import { safeLocalStorage } from '@/shared/utils/safeStorage';

describe('useCustomRolePrompt', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('initializes with empty string if no prompt is stored', () => {
    const { result } = renderHook(() => useCustomRolePrompt());
    expect(result.current.customPrompt).toBe('');
  });

  it('initializes with stored prompt from safeLocalStorage if available', () => {
    safeLocalStorage.setItem(CUSTOM_ROLE_PROMPT_KEY, 'You are an English tutor');

    const { result } = renderHook(() => useCustomRolePrompt());
    expect(result.current.customPrompt).toBe('You are an English tutor');
  });

  it('trims, limits to 1000 characters, updates state, and saves to storage on setCustomPrompt', () => {
    const { result } = renderHook(() => useCustomRolePrompt());

    act(() => {
      result.current.setCustomPrompt('   Friendly barista assistant   ');
    });

    expect(result.current.customPrompt).toBe('Friendly barista assistant');
    expect(safeLocalStorage.getItem(CUSTOM_ROLE_PROMPT_KEY)).toBe('Friendly barista assistant');

    // Test length clipping
    const longPrompt = 'a'.repeat(1200);
    act(() => {
      result.current.setCustomPrompt(longPrompt);
    });

    expect(result.current.customPrompt.length).toBe(1000);
    expect(safeLocalStorage.getItem(CUSTOM_ROLE_PROMPT_KEY)?.length).toBe(1000);
  });

  it('resets state to empty string and removes item from storage on clearCustomPrompt', () => {
    safeLocalStorage.setItem(CUSTOM_ROLE_PROMPT_KEY, 'Existing role');

    const { result } = renderHook(() => useCustomRolePrompt());
    expect(result.current.customPrompt).toBe('Existing role');

    act(() => {
      result.current.clearCustomPrompt();
    });

    expect(result.current.customPrompt).toBe('');
    expect(safeLocalStorage.getItem(CUSTOM_ROLE_PROMPT_KEY)).toBeNull();
  });
});
