import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSuggestionPanel } from '../useSuggestionPanel';
import type { ChatMessage, ReplySuggestion } from '@/shared/types/chatTypes';

describe('useSuggestionPanel', () => {
  const dummyMessage: ChatMessage = {
    id: 'msg-123',
    role: 'assistant',
    englishText: 'How was your day?',
    translation: 'วันนี้เป็นอย่างไรบ้าง?',
    english: 'How was your day?',
    rawText: '',
    timestamp: new Date().toISOString(),
    status: 'sent',
  };

  const dummySuggestions: ReplySuggestion[] = [
    { englishText: 'It was pretty relaxing!', translation: 'ค่อนข้างผ่อนคลายดี!' },
    { englishText: 'Super busy, but good.', translation: 'ยุ่งมากแต่ก็ดี' },
  ];

  beforeEach(() => {
    sessionStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('defaults to collapsed with optionsMode=true when suggestions are present', () => {
    const { result } = renderHook(() =>
      useSuggestionPanel({
        lastMessage: dummyMessage,
        currentSuggestions: dummySuggestions,
        isLoading: false,
      })
    );

    expect(result.current.optionsMode).toBe(true);
    expect(result.current.isOptionsCollapsed).toBe(true);
  });

  it('expands suggestions and persists open state to sessionStorage when toggled', () => {
    const { result } = renderHook(() =>
      useSuggestionPanel({
        lastMessage: dummyMessage,
        currentSuggestions: dummySuggestions,
        isLoading: false,
      })
    );

    act(() => {
      result.current.handleToggleSuggestions();
    });
    act(() => {
      vi.advanceTimersByTime(250);
    });

    expect(result.current.isOptionsCollapsed).toBe(false);
    expect(sessionStorage.getItem('suggestion_open_msg-123')).toBe('true');
  });

  it('restores expanded state from sessionStorage when returning to the message', () => {
    sessionStorage.setItem('suggestion_open_msg-123', 'true');

    const { result } = renderHook(() =>
      useSuggestionPanel({
        lastMessage: dummyMessage,
        currentSuggestions: dummySuggestions,
        isLoading: false,
      })
    );

    expect(result.current.isOptionsCollapsed).toBe(false);
    expect(result.current.optionsMode).toBe(true);
  });

  it('dismisses suggestions and sets sessionStorage when skip is tapped', () => {
    const { result } = renderHook(() =>
      useSuggestionPanel({
        lastMessage: dummyMessage,
        currentSuggestions: dummySuggestions,
        isLoading: false,
      })
    );

    act(() => {
      result.current.handleOptionsSkip();
    });

    expect(result.current.optionsMode).toBe(false);
    expect(sessionStorage.getItem('suggestion_dismissed_msg-123')).toBe('true');
  });

  it('restores dismissed state from sessionStorage on mount', () => {
    sessionStorage.setItem('suggestion_dismissed_msg-123', 'true');

    const { result } = renderHook(() =>
      useSuggestionPanel({
        lastMessage: dummyMessage,
        currentSuggestions: dummySuggestions,
        isLoading: false,
      })
    );

    expect(result.current.optionsMode).toBe(false);
  });
});
