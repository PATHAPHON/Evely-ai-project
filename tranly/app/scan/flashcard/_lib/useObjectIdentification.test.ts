import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useObjectIdentification } from './useObjectIdentification';
import { ERROR_MESSAGES, MAX_RETRY_COUNT } from './constants';

// Mock blobToBase64
vi.mock('./blobToBase64', () => ({
  blobToBase64: vi.fn().mockResolvedValue('dGVzdA=='),
}));

describe('useObjectIdentification', () => {
  const mockBlob = new Blob(['test'], { type: 'image/jpeg' });

  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts with initial state', () => {
    const { result } = renderHook(() => useObjectIdentification());

    expect(result.current.label).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.retryCount).toBe(0);
    expect(result.current.canRetry).toBe(true);
  });

  it('sets loading state during identification', async () => {
    let resolveResponse: (value: Response) => void;
    const responsePromise = new Promise<Response>((resolve) => {
      resolveResponse = resolve;
    });
    vi.mocked(global.fetch).mockReturnValue(responsePromise as Promise<Response>);

    const { result } = renderHook(() => useObjectIdentification());

    act(() => {
      result.current.identify(mockBlob);
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolveResponse!(
        new Response(JSON.stringify({ label: 'แมว' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('sets label on successful identification', async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(JSON.stringify({ label: 'แมว' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const { result } = renderHook(() => useObjectIdentification());

    await act(async () => {
      await result.current.identify(mockBlob);
    });

    expect(result.current.label).toBe('แมว');
    expect(result.current.error).toBeNull();
    expect(result.current.retryCount).toBe(0);
  });

  it('sets error and increments retryCount on API error', async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          error: { type: 'api_error', message: ERROR_MESSAGES.api_error },
        }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const { result } = renderHook(() => useObjectIdentification());

    await act(async () => {
      await result.current.identify(mockBlob);
    });

    expect(result.current.error).toEqual({
      type: 'api_error',
      message: ERROR_MESSAGES.api_error,
    });
    expect(result.current.retryCount).toBe(1);
    expect(result.current.label).toBeNull();
  });

  it('resets retryCount on success after failures', async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: { type: 'timeout', message: ERROR_MESSAGES.timeout },
          }),
          { status: 504, headers: { 'Content-Type': 'application/json' } }
        )
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ label: 'สุนัข' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

    const { result } = renderHook(() => useObjectIdentification());

    await act(async () => {
      await result.current.identify(mockBlob);
    });

    expect(result.current.retryCount).toBe(1);

    await act(async () => {
      await result.current.identify(mockBlob);
    });

    expect(result.current.retryCount).toBe(0);
    expect(result.current.label).toBe('สุนัข');
  });

  it('sets canRetry to false when retryCount reaches MAX_RETRY_COUNT', async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          error: { type: 'api_error', message: ERROR_MESSAGES.api_error },
        }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const { result } = renderHook(() => useObjectIdentification());

    for (let i = 0; i < MAX_RETRY_COUNT; i++) {
      await act(async () => {
        await result.current.identify(mockBlob);
      });
    }

    expect(result.current.retryCount).toBe(MAX_RETRY_COUNT);
    expect(result.current.canRetry).toBe(false);
  });

  it('treats whitespace-only labels as errors', async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(JSON.stringify({ label: '   \t\n  ' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const { result } = renderHook(() => useObjectIdentification());

    await act(async () => {
      await result.current.identify(mockBlob);
    });

    expect(result.current.error).toEqual({
      type: 'api_error',
      message: ERROR_MESSAGES.api_error,
    });
    expect(result.current.label).toBeNull();
    expect(result.current.retryCount).toBe(1);
  });

  it('treats empty labels as errors', async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(JSON.stringify({ label: '' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const { result } = renderHook(() => useObjectIdentification());

    await act(async () => {
      await result.current.identify(mockBlob);
    });

    expect(result.current.error).toEqual({
      type: 'api_error',
      message: ERROR_MESSAGES.api_error,
    });
    expect(result.current.label).toBeNull();
  });

  it('handles network errors', async () => {
    vi.mocked(global.fetch).mockRejectedValue(new TypeError('Failed to fetch'));

    const { result } = renderHook(() => useObjectIdentification());

    await act(async () => {
      await result.current.identify(mockBlob);
    });

    expect(result.current.error).toEqual({
      type: 'network_error',
      message: ERROR_MESSAGES.network_error,
    });
    expect(result.current.retryCount).toBe(1);
  });

  it('does not treat abort as an error', async () => {
    const abortError = new Error('The operation was aborted');
    abortError.name = 'AbortError';
    vi.mocked(global.fetch).mockRejectedValue(abortError);

    const { result } = renderHook(() => useObjectIdentification());

    await act(async () => {
      await result.current.identify(mockBlob);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.retryCount).toBe(0);
  });

  it('retry calls identify with the last blob', async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: { type: 'timeout', message: ERROR_MESSAGES.timeout },
          }),
          { status: 504, headers: { 'Content-Type': 'application/json' } }
        )
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ label: 'แมว' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

    const { result } = renderHook(() => useObjectIdentification());

    await act(async () => {
      await result.current.identify(mockBlob);
    });

    expect(result.current.retryCount).toBe(1);

    await act(async () => {
      result.current.retry();
    });

    await waitFor(() => {
      expect(result.current.label).toBe('แมว');
    });
  });

  it('retry does nothing when retryCount >= MAX_RETRY_COUNT', async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          error: { type: 'api_error', message: ERROR_MESSAGES.api_error },
        }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const { result } = renderHook(() => useObjectIdentification());

    for (let i = 0; i < MAX_RETRY_COUNT; i++) {
      await act(async () => {
        await result.current.identify(mockBlob);
      });
    }

    const fetchCallCount = vi.mocked(global.fetch).mock.calls.length;

    act(() => {
      result.current.retry();
    });

    // fetch should not have been called again
    expect(vi.mocked(global.fetch).mock.calls.length).toBe(fetchCallCount);
  });
});
