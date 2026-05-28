'use client';

import { useCallback, useRef, useState } from 'react';
import { blobToBase64 } from './blobToBase64';
import { ERROR_MESSAGES, MAX_RETRY_COUNT } from './constants';
import type { IdentifyErrorResponse, IdentifySuccessResponse } from './types';

export interface UseObjectIdentificationReturn {
  label: string | null;
  isLoading: boolean;
  error: { type: string; message: string } | null;
  retryCount: number;
  identify: (blob: Blob) => Promise<void>;
  retry: () => void;
  canRetry: boolean;
}

export function useObjectIdentification(): UseObjectIdentificationReturn {
  const [label, setLabel] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<{ type: string; message: string } | null>(
    null
  );
  const [retryCount, setRetryCount] = useState(0);

  const abortControllerRef = useRef<AbortController | null>(null);
  const lastBlobRef = useRef<Blob | null>(null);

  const identify = useCallback(async (blob: Blob) => {
    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    lastBlobRef.current = blob;

    setIsLoading(true);
    setError(null);
    setLabel(null);

    try {
      const base64 = await blobToBase64(blob);

      const response = await fetch('/api/identify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorData: IdentifyErrorResponse = await response.json();
        setError(errorData.error);
        setRetryCount((prev) => prev + 1);
        return;
      }

      const data: IdentifySuccessResponse = await response.json();

      // Treat whitespace-only or empty labels as errors
      if (!data.label || data.label.trim().length === 0) {
        setError({
          type: 'api_error',
          message: ERROR_MESSAGES.api_error,
        });
        setRetryCount((prev) => prev + 1);
        return;
      }

      setLabel(data.label);
      setRetryCount(0);
    } catch (err: unknown) {
      // Don't treat abort as an error
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }

      setError({
        type: 'network_error',
        message: ERROR_MESSAGES.network_error,
      });
      setRetryCount((prev) => prev + 1);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const retry = useCallback(() => {
    if (lastBlobRef.current && retryCount < MAX_RETRY_COUNT) {
      identify(lastBlobRef.current);
    }
  }, [identify, retryCount]);

  const canRetry = retryCount < MAX_RETRY_COUNT;

  return {
    label,
    isLoading,
    error,
    retryCount,
    identify,
    retry,
    canRetry,
  };
}
