import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAIConfig, maskKey } from './useAIConfig';

const DOTS = '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022';

beforeEach(() => {
  localStorage.clear();
});

describe('maskKey', () => {
  it('returns null for null input', () => {
    expect(maskKey(null)).toBe(null);
  });

  it('returns null for empty string', () => {
    expect(maskKey('')).toBe(null);
  });

  it('returns masked string with last 4 chars for keys >= 4 chars', () => {
    expect(maskKey('sk-1234567890abcd')).toBe(DOTS + 'abcd');
  });

  it('returns fully masked string for keys shorter than 4 chars', () => {
    expect(maskKey('abc')).toBe(DOTS);
  });

  it('shows last 4 chars for exactly 4 char key', () => {
    expect(maskKey('abcd')).toBe(DOTS + 'abcd');
  });
});

describe('useAIConfig', () => {
  it('defaults to null apiKey and gemini-2.5-flash-lite model', () => {
    const { result } = renderHook(() => useAIConfig());
    expect(result.current.apiKey).toBe(null);
    expect(result.current.model).toBe('gemini-2.5-flash-lite');
    expect(result.current.maskedKey).toBe(null);
  });

  it('reads stored API key and model from localStorage on mount', () => {
    localStorage.setItem('tarnly:ai-api-key', 'sk-test-key-1234');
    localStorage.setItem('tarnly:ai-model', 'gpt-4o');
    const { result } = renderHook(() => useAIConfig());
    expect(result.current.apiKey).toBe('sk-test-key-1234');
    expect(result.current.model).toBe('gpt-4o');
    expect(result.current.maskedKey).toBe(DOTS + '1234');
  });

  it('saveConfig persists API key and model to localStorage', () => {
    const { result } = renderHook(() => useAIConfig());

    act(() => {
      result.current.saveConfig('my-new-api-key', 'gemini-2.5-pro');
    });

    expect(result.current.apiKey).toBe('my-new-api-key');
    expect(result.current.model).toBe('gemini-2.5-pro');
    expect(localStorage.getItem('tarnly:ai-api-key')).toBe('my-new-api-key');
    expect(localStorage.getItem('tarnly:ai-model')).toBe('gemini-2.5-pro');
  });

  it('clearConfig removes API key and resets model to default', () => {
    localStorage.setItem('tarnly:ai-api-key', 'sk-test-key-1234');
    localStorage.setItem('tarnly:ai-model', 'gpt-4o');
    const { result } = renderHook(() => useAIConfig());

    act(() => {
      result.current.clearConfig();
    });

    expect(result.current.apiKey).toBe(null);
    expect(result.current.model).toBe('gemini-2.5-flash-lite');
    expect(result.current.maskedKey).toBe(null);
    expect(localStorage.getItem('tarnly:ai-api-key')).toBe(null);
    expect(localStorage.getItem('tarnly:ai-model')).toBe(null);
  });

  it('maskedKey updates when apiKey changes via saveConfig', () => {
    const { result } = renderHook(() => useAIConfig());

    act(() => {
      result.current.saveConfig('abcdefghijklmnop', 'gpt-4o-mini');
    });

    expect(result.current.maskedKey).toBe(DOTS + 'mnop');
  });
});
