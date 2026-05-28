import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTTS } from './useTTS';

// Mock SpeechSynthesisUtterance
class MockUtterance {
  text: string;
  lang = '';
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;

  constructor(text: string) {
    this.text = text;
  }
}

function createMockSpeechSynthesis() {
  return {
    speak: vi.fn(),
    cancel: vi.fn(),
  };
}

beforeEach(() => {
  // Reset mocks
  vi.restoreAllMocks();

  // Set up SpeechSynthesisUtterance mock
  (globalThis as unknown as Record<string, unknown>).SpeechSynthesisUtterance = MockUtterance;
});

describe('useTTS', () => {
  describe('isSupported', () => {
    it('returns true when speechSynthesis is available', () => {
      Object.defineProperty(window, 'speechSynthesis', {
        value: createMockSpeechSynthesis(),
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useTTS());
      expect(result.current.isSupported).toBe(true);
    });

    it('returns false when speechSynthesis is not available', () => {
      // Delete speechSynthesis so 'speechSynthesis' in window is false
      delete (window as unknown as Record<string, unknown>).speechSynthesis;

      const { result } = renderHook(() => useTTS());
      expect(result.current.isSupported).toBe(false);
    });
  });

  describe('speak', () => {
    it('calls speechSynthesis.speak with correct lang', () => {
      const mockSynthesis = createMockSpeechSynthesis();
      Object.defineProperty(window, 'speechSynthesis', {
        value: mockSynthesis,
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useTTS('ko-KR'));

      act(() => {
        result.current.speak('안녕하세요');
      });

      expect(mockSynthesis.cancel).toHaveBeenCalled();
      expect(mockSynthesis.speak).toHaveBeenCalledTimes(1);
      const utterance = mockSynthesis.speak.mock.calls[0][0] as MockUtterance;
      expect(utterance.text).toBe('안녕하세요');
      expect(utterance.lang).toBe('ko-KR');
    });

    it('cancels current playback before starting new', () => {
      const mockSynthesis = createMockSpeechSynthesis();
      Object.defineProperty(window, 'speechSynthesis', {
        value: mockSynthesis,
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useTTS());

      act(() => {
        result.current.speak('첫 번째');
      });
      act(() => {
        result.current.speak('두 번째');
      });

      // cancel should be called each time speak is invoked
      expect(mockSynthesis.cancel).toHaveBeenCalledTimes(2);
      expect(mockSynthesis.speak).toHaveBeenCalledTimes(2);
    });

    it('sets isSpeaking to true on utterance start', () => {
      const mockSynthesis = createMockSpeechSynthesis();
      Object.defineProperty(window, 'speechSynthesis', {
        value: mockSynthesis,
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useTTS());

      act(() => {
        result.current.speak('안녕하세요');
      });

      const utterance = mockSynthesis.speak.mock.calls[0][0] as MockUtterance;

      act(() => {
        utterance.onstart?.();
      });

      expect(result.current.isSpeaking).toBe(true);
    });

    it('sets isSpeaking to false on utterance end', () => {
      const mockSynthesis = createMockSpeechSynthesis();
      Object.defineProperty(window, 'speechSynthesis', {
        value: mockSynthesis,
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useTTS());

      act(() => {
        result.current.speak('안녕하세요');
      });

      const utterance = mockSynthesis.speak.mock.calls[0][0] as MockUtterance;

      act(() => {
        utterance.onstart?.();
      });
      act(() => {
        utterance.onend?.();
      });

      expect(result.current.isSpeaking).toBe(false);
    });

    it('sets error when speechSynthesis is not supported', () => {
      delete (window as unknown as Record<string, unknown>).speechSynthesis;

      const { result } = renderHook(() => useTTS());

      act(() => {
        result.current.speak('안녕하세요');
      });

      expect(result.current.error).toBe('ไม่สามารถเล่นเสียงได้');
    });

    it('sets error on utterance error (non-interrupted)', () => {
      const mockSynthesis = createMockSpeechSynthesis();
      Object.defineProperty(window, 'speechSynthesis', {
        value: mockSynthesis,
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useTTS());

      act(() => {
        result.current.speak('안녕하세요');
      });

      const utterance = mockSynthesis.speak.mock.calls[0][0] as MockUtterance;

      act(() => {
        utterance.onerror?.({ error: 'synthesis-failed' });
      });

      expect(result.current.error).toBe('ไม่สามารถเล่นเสียงได้');
      expect(result.current.isSpeaking).toBe(false);
    });

    it('does not set error on interrupted/canceled events', () => {
      const mockSynthesis = createMockSpeechSynthesis();
      Object.defineProperty(window, 'speechSynthesis', {
        value: mockSynthesis,
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useTTS());

      act(() => {
        result.current.speak('안녕하세요');
      });

      const utterance = mockSynthesis.speak.mock.calls[0][0] as MockUtterance;

      act(() => {
        utterance.onstart?.();
      });
      act(() => {
        utterance.onerror?.({ error: 'interrupted' });
      });

      expect(result.current.error).toBeNull();
      expect(result.current.isSpeaking).toBe(false);
    });
  });

  describe('stop', () => {
    it('calls speechSynthesis.cancel', () => {
      const mockSynthesis = createMockSpeechSynthesis();
      Object.defineProperty(window, 'speechSynthesis', {
        value: mockSynthesis,
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useTTS());

      act(() => {
        result.current.stop();
      });

      expect(mockSynthesis.cancel).toHaveBeenCalled();
    });

    it('sets isSpeaking to false', () => {
      const mockSynthesis = createMockSpeechSynthesis();
      Object.defineProperty(window, 'speechSynthesis', {
        value: mockSynthesis,
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useTTS());

      act(() => {
        result.current.speak('안녕하세요');
      });

      const utterance = mockSynthesis.speak.mock.calls[0][0] as MockUtterance;
      act(() => {
        utterance.onstart?.();
      });

      expect(result.current.isSpeaking).toBe(true);

      act(() => {
        result.current.stop();
      });

      expect(result.current.isSpeaking).toBe(false);
    });
  });

  describe('cleanup', () => {
    it('cancels speech on unmount', () => {
      const mockSynthesis = createMockSpeechSynthesis();
      Object.defineProperty(window, 'speechSynthesis', {
        value: mockSynthesis,
        writable: true,
        configurable: true,
      });

      const { unmount } = renderHook(() => useTTS());

      unmount();

      expect(mockSynthesis.cancel).toHaveBeenCalled();
    });
  });
});
