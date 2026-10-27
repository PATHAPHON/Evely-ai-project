import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useTTS } from '../hooks/useTTS';

class MockAudio {
  src: string;
  onplay: (() => void) | null = null;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  play = vi.fn().mockResolvedValue(undefined);
  pause = vi.fn();

  constructor(src = '') {
    this.src = src;
    MockAudio.lastInstance = this;
  }

  static lastInstance: MockAudio | null = null;
}

function mockFetchOk(audioBytes = new Uint8Array([0x01, 0x02, 0x03])) {
  const blob = new Blob([audioBytes], { type: 'audio/mpeg' });
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    blob: () => Promise.resolve(blob),
  });
}

function mockFetchStatus(status: number) {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    blob: () => Promise.resolve(new Blob()),
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
  MockAudio.lastInstance = null;
  (globalThis as unknown as Record<string, unknown>).Audio = MockAudio;

  // URL.createObjectURL / revokeObjectURL aren't in jsdom by default.
  if (!('createObjectURL' in URL)) {
    (URL as unknown as { createObjectURL: (b: Blob) => string }).createObjectURL = vi
      .fn()
      .mockReturnValue('blob:mock');
  } else {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
  }
  if (!('revokeObjectURL' in URL)) {
    (URL as unknown as { revokeObjectURL: (s: string) => void }).revokeObjectURL = vi.fn();
  } else {
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  }
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useTTS', () => {
  describe('isSupported', () => {
    it('returns true when Audio is available', () => {
      const { result } = renderHook(() => useTTS());
      expect(result.current.isSupported).toBe(true);
    });
  });

  describe('speak — cloud TTS happy path', () => {
    it('POSTs text to /api/tts and plays returned audio', async () => {
      const fetchMock = mockFetchOk();
      vi.stubGlobal('fetch', fetchMock);

      const { result } = renderHook(() => useTTS('en-US'));

      act(() => {
        result.current.speak('안녕하세요');
      });

      await waitFor(() => {
        expect(MockAudio.lastInstance).not.toBeNull();
      });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('/api/tts');
      expect(init.method).toBe('POST');
      expect(JSON.parse(init.body as string)).toMatchObject({ text: '안녕하세요' });
      expect(MockAudio.lastInstance!.play).toHaveBeenCalled();
    });

    it('passes voice option to /api/tts when provided', async () => {
      const fetchMock = mockFetchOk();
      vi.stubGlobal('fetch', fetchMock);

      const { result } = renderHook(() =>
        useTTS('en-US', 'bf_emma'),
      );

      act(() => {
        result.current.speak('안녕');
      });

      await waitFor(() => expect(fetchMock).toHaveBeenCalled());
      const init = fetchMock.mock.calls[0]![1] as RequestInit;
      expect(JSON.parse(init.body as string)).toMatchObject({
        text: '안녕',
        voice: 'bf_emma',
      });
    });

    it('sets isSpeaking true on audio play, false on ended', async () => {
      vi.stubGlobal('fetch', mockFetchOk());

      const { result } = renderHook(() => useTTS());

      act(() => {
        result.current.speak('테스트');
      });

      await waitFor(() => expect(MockAudio.lastInstance).not.toBeNull());

      act(() => {
        MockAudio.lastInstance!.onplay?.();
      });
      expect(result.current.isSpeaking).toBe(true);

      act(() => {
        MockAudio.lastInstance!.onended?.();
      });
      expect(result.current.isSpeaking).toBe(false);
    });

    it('calls onReady when audio blob is loaded, before onplay', async () => {
      vi.stubGlobal('fetch', mockFetchOk());
      const onReady = vi.fn();
      const onStart = vi.fn();

      const { result } = renderHook(() => useTTS());

      act(() => {
        result.current.speak('Hello world', { onReady, onStart });
      });

      await waitFor(() => expect(MockAudio.lastInstance).not.toBeNull());

      expect(onReady).toHaveBeenCalledTimes(1);
      expect(onStart).not.toHaveBeenCalled();

      act(() => {
        MockAudio.lastInstance!.onplay?.();
      });
      expect(onStart).toHaveBeenCalledTimes(1);
    });
  });

  describe('speak — error handling without fallback', () => {
    it('sets error without fallback when /api/tts fails with error status', async () => {
      vi.stubGlobal('fetch', mockFetchStatus(429));
      const onError = vi.fn();

      const { result } = renderHook(() => useTTS('en-US'));

      act(() => {
        result.current.speak('Hello', { onError });
      });

      await waitFor(() => expect(onError).toHaveBeenCalled());
      expect(result.current.isSpeaking).toBe(false);
      expect(result.current.isSynthesizing).toBe(false);
      expect(result.current.error).toBe('ระบบเสียงยังไม่พร้อมใช้งาน กรุณารอสักครู่');
      expect(MockAudio.lastInstance).toBeNull();
    });

    it('sets error and does not play when /api/tts returns 503', async () => {
      vi.stubGlobal('fetch', mockFetchStatus(503));
      const onError = vi.fn();

      const { result } = renderHook(() => useTTS('en-US'));

      act(() => {
        result.current.speak('안녕하세요', { onError });
      });

      await waitFor(() => expect(onError).toHaveBeenCalled());
      expect(result.current.isSpeaking).toBe(false);
      expect(result.current.isSynthesizing).toBe(false);
      expect(result.current.error).toBe('ระบบเสียงยังไม่พร้อมใช้งาน กรุณารอสักครู่');
      expect(MockAudio.lastInstance).toBeNull();
    });

    it('handles network error without fallback', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
      const onError = vi.fn();

      const { result } = renderHook(() => useTTS('en-US'));

      act(() => {
        result.current.speak('안녕', { onError });
      });

      await waitFor(() => expect(onError).toHaveBeenCalled());
      expect(result.current.isSpeaking).toBe(false);
      expect(result.current.isSynthesizing).toBe(false);
      expect(result.current.error).toBe('ระบบเสียงยังไม่พร้อมใช้งาน กรุณารอสักครู่');
      expect(MockAudio.lastInstance).toBeNull();
    });

    it('handles audio playback errors without fallback', async () => {
      vi.stubGlobal('fetch', mockFetchOk());
      const onError = vi.fn();

      const { result } = renderHook(() => useTTS());

      act(() => {
        result.current.speak('안녕', { onError });
      });

      await waitFor(() => expect(MockAudio.lastInstance).not.toBeNull());

      act(() => {
        MockAudio.lastInstance!.onerror?.();
      });

      await waitFor(() => expect(onError).toHaveBeenCalled());
      expect(result.current.isSpeaking).toBe(false);
      expect(result.current.error).toBe('ระบบเสียงยังไม่พร้อมใช้งาน กรุณารอสักครู่');
    });
  });

  describe('stop', () => {
    it('pauses audio playback and clears state', async () => {
      vi.stubGlobal('fetch', mockFetchOk());

      const { result } = renderHook(() => useTTS());

      act(() => {
        result.current.speak('안녕');
      });

      await waitFor(() => expect(MockAudio.lastInstance).not.toBeNull());
      const audio = MockAudio.lastInstance!;

      act(() => {
        audio.onplay?.();
      });
      expect(result.current.isSpeaking).toBe(true);

      act(() => {
        result.current.stop();
      });

      expect(audio.pause).toHaveBeenCalled();
      expect(result.current.isSpeaking).toBe(false);
    });
  });

  describe('cleanup', () => {
    it('releases resources on unmount', async () => {
      vi.stubGlobal('fetch', mockFetchOk());

      const { result, unmount } = renderHook(() => useTTS());

      act(() => {
        result.current.speak('안녕');
      });

      await waitFor(() => expect(MockAudio.lastInstance).not.toBeNull());

      unmount();

      expect(MockAudio.lastInstance!.pause).toHaveBeenCalled();
    });
  });
});
