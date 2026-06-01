import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useDbWriteError } from '../useDbWriteError';

describe('useDbWriteError', () => {
  it('returns null writeError initially', () => {
    const { result } = renderHook(() => useDbWriteError());
    expect(result.current.writeError).toBeNull();
  });

  it('sets writeError when handleDbWrite operation fails', async () => {
    const { result } = renderHook(() => useDbWriteError());

    await act(async () => {
      try {
        await result.current.handleDbWrite(
          () => Promise.reject(new Error('IndexedDB write failed')),
          'Could not save word'
        );
      } catch {
        // Expected to throw
      }
    });

    expect(result.current.writeError).toBe('Could not save word: IndexedDB write failed');
  });

  it('uses default error message when none provided', async () => {
    const { result } = renderHook(() => useDbWriteError());

    await act(async () => {
      try {
        await result.current.handleDbWrite(
          () => Promise.reject(new Error('disk full'))
        );
      } catch {
        // Expected to throw
      }
    });

    expect(result.current.writeError).toContain('ไม่สามารถบันทึกข้อมูลได้');
    expect(result.current.writeError).toContain('disk full');
  });

  it('clears writeError on successful operation', async () => {
    const { result } = renderHook(() => useDbWriteError());

    // First, cause an error
    await act(async () => {
      try {
        await result.current.handleDbWrite(
          () => Promise.reject(new Error('fail')),
          'Error'
        );
      } catch {
        // Expected
      }
    });

    expect(result.current.writeError).not.toBeNull();

    // Then, succeed
    await act(async () => {
      await result.current.handleDbWrite(() => Promise.resolve('ok'));
    });

    expect(result.current.writeError).toBeNull();
  });

  it('clearWriteError clears the error', async () => {
    const { result } = renderHook(() => useDbWriteError());

    await act(async () => {
      try {
        await result.current.handleDbWrite(
          () => Promise.reject(new Error('fail')),
          'Error'
        );
      } catch {
        // Expected
      }
    });

    expect(result.current.writeError).not.toBeNull();

    act(() => {
      result.current.clearWriteError();
    });

    expect(result.current.writeError).toBeNull();
  });

  it('re-throws the error so callers can preserve input', async () => {
    const { result } = renderHook(() => useDbWriteError());

    await expect(
      act(async () => {
        await result.current.handleDbWrite(
          () => Promise.reject(new Error('write failed'))
        );
      })
    ).rejects.toThrow('write failed');
  });

  it('returns the value from a successful operation', async () => {
    const { result } = renderHook(() => useDbWriteError());

    let returnValue: string | undefined;
    await act(async () => {
      returnValue = await result.current.handleDbWrite(() =>
        Promise.resolve('saved-id')
      );
    });

    expect(returnValue).toBe('saved-id');
    expect(result.current.writeError).toBeNull();
  });
});
