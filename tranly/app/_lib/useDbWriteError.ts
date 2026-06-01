'use client';

import { useCallback, useState } from 'react';

export interface DbWriteErrorState {
  /** The error message from the last failed write operation */
  writeError: string | null;
  /** Clear the write error */
  clearWriteError: () => void;
  /**
   * Wrap an async IndexedDB write operation with error handling.
   * On failure, sets the error message and re-throws so callers can preserve input.
   */
  handleDbWrite: <T>(operation: () => Promise<T>, errorMessage?: string) => Promise<T>;
}

/**
 * Hook for handling IndexedDB write errors.
 * Displays error messages and preserves user input by not clearing form state on failure.
 *
 * Usage:
 * ```tsx
 * const { writeError, clearWriteError, handleDbWrite } = useDbWriteError();
 *
 * const handleSave = async (input: string) => {
 *   try {
 *     await handleDbWrite(() => saveToDb(input), 'Could not save word');
 *     // Success: clear form
 *     setInput('');
 *   } catch {
 *     // Error: form input is preserved (not cleared)
 *   }
 * };
 * ```
 */
export function useDbWriteError(): DbWriteErrorState {
  const [writeError, setWriteError] = useState<string | null>(null);

  const clearWriteError = useCallback(() => {
    setWriteError(null);
  }, []);

  const handleDbWrite = useCallback(
    async <T>(
      operation: () => Promise<T>,
      errorMessage = 'ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง'
    ): Promise<T> => {
      setWriteError(null);
      try {
        return await operation();
      } catch (err) {
        const detail = err instanceof Error ? err.message : '';
        const message = detail ? `${errorMessage}: ${detail}` : errorMessage;
        setWriteError(message);
        throw err;
      }
    },
    []
  );

  return { writeError, clearWriteError, handleDbWrite };
}
