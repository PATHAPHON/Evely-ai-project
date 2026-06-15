import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useTTS } from '../useTTS';

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

function createMockSpeechSynthesis() {
  return {
    speak: vi.fn(),
    cancel: vi.fn(),
  };
}

function installSpeechSynthesis() {
  const mock = createMockSpeechSynthesis();
  Object.defineProperty(window, 'speechSynthesis', {
    value: mock,
    writable: true,
    configurable: true,
  });
  return mock;
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
  (globalThis as unknown as Record<string, unknown>).SpeechSynthesisUtterance = MockUtterance;
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
      installSpeechSynthesis();
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
      installSpeechSynthesis();
      const fetchMock = mockFetchOk();
      vi.stubGlobal('fetch', fetchMock);

      const { result } = renderHook(() =>
        useTTS('en-US', 'ko-KR-Chirp3-HD-Charon'),
      );

      act(() => {
        result.current.speak('안녕');
      });

      await waitFor(() => expect(fetchMock).toHaveBeenCalled());
      const init = fetchMock.mock.calls[0]![1] as RequestInit;
      expect(JSON.parse(init.body as string)).toMatchObject({
        text: '안녕',
        voice: 'ko-KR-Chirp3-HD-Charon',
      });
    });

    it('sets isSpeaking true on audio play, false on ended', async () => {
      installSpeechSynthesis();
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
  });

  describe('speak — fallback to Web Speech', () => {
    it('falls back when /api/tts returns 503', async () => {
      const synth = installSpeechSynthesis();
      vi.stubGlobal('fetch', mockFetchStatus(503));

      const { result } = renderHook(() => useTTS('en-US'));

      act(() => {
        result.current.speak('안녕하세요');
      });

      await waitFor(() => expect(synth.speak).toHaveBeenCalled());

      const utterance = synth.speak.mock.calls[0]![0] as MockUtterance;
      expect(utterance.text).toBe('안녕하세요');
      expect(utterance.lang).toBe('en-US');
      expect(MockAudio.lastInstance).toBeNull();
    });

    it('falls back when fetch throws a network error', async () => {
      const synth = installSpeechSynthesis();
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

      const { result } = renderHook(() => useTTS('en-US'));

      act(() => {
        result.current.speak('안녕');
      });

      await waitFor(() => expect(synth.speak).toHaveBeenCalled());
      expect((synth.speak.mock.calls[0]![0] as MockUtterance).lang).toBe('en-US');
    });

    it('falls back when audio playback errors out', async () => {
      const synth = installSpeechSynthesis();
      vi.stubGlobal('fetch', mockFetchOk());

      const { result } = renderHook(() => useTTS());

      act(() => {
        result.current.speak('안녕');
      });

      await waitFor(() => expect(MockAudio.lastInstance).not.toBeNull());

      act(() => {
        MockAudio.lastInstance!.onerror?.();
      });

      await waitFor(() => expect(synth.speak).toHaveBeenCalled());
    });
  });

  describe('stop', () => {
    it('pauses audio playback and clears state', async () => {
      installSpeechSynthesis();
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

    it('cancels Web Speech synthesis as well', () => {
      const synth = installSpeechSynthesis();

      const { result } = renderHook(() => useTTS());

      act(() => {
        result.current.stop();
      });

      expect(synth.cancel).toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('releases resources on unmount', async () => {
      const synth = installSpeechSynthesis();
      vi.stubGlobal('fetch', mockFetchOk());

      const { result, unmount } = renderHook(() => useTTS());

      act(() => {
        result.current.speak('안녕');
      });

      await waitFor(() => expect(MockAudio.lastInstance).not.toBeNull());

      unmount();

      expect(MockAudio.lastInstance!.pause).toHaveBeenCalled();
      expect(synth.cancel).toHaveBeenCalled();
    });
  });
});
