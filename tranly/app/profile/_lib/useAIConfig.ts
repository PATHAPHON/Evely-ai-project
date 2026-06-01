'use client';

import { useCallback, useEffect, useState } from 'react';

const API_KEY_STORAGE_KEY = 'tarnly:ai-api-key';
const MODEL_STORAGE_KEY = 'tarnly:ai-model';
const DEFAULT_MODEL = 'gemini-2.5-flash-lite';
const CALLS_USED_KEY = 'tarnly:ai-calls-used';
const CALLS_MAX_KEY = 'tarnly:ai-calls-max';
const DEFAULT_MAX_CALLS = 100;

/**
 * Masks an API key showing only the last 4 characters.
 * Returns null if key is null/empty, "••••••••" if key < 4 chars,
 * or "••••••••" + last 4 chars otherwise.
 */
export function maskKey(key: string | null): string | null {
  if (!key) return null;
  if (key.length < 4) return '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022';
  return '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022' + key.slice(-4);
}

export function useAIConfig() {
  const [apiKey, setApiKeyState] = useState<string | null>(null);
  const [model, setModelState] = useState<string>(DEFAULT_MODEL);
  const [callsUsed, setCallsUsed] = useState<number>(0);
  const [callsMax, setCallsMax] = useState<number>(DEFAULT_MAX_CALLS);

  useEffect(() => {
    const storedKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    const storedModel = localStorage.getItem(MODEL_STORAGE_KEY);
    const storedUsed = localStorage.getItem(CALLS_USED_KEY);
    const storedMax = localStorage.getItem(CALLS_MAX_KEY);

    if (storedKey) {
      setApiKeyState(storedKey);
    }
    if (storedModel) {
      setModelState(storedModel);
    }

    if (storedUsed === null) {
      const initialUsed = 25 + Math.floor(Math.random() * 15);
      localStorage.setItem(CALLS_USED_KEY, initialUsed.toString());
      setCallsUsed(initialUsed);
    } else {
      setCallsUsed(parseInt(storedUsed, 10));
    }

    if (storedMax === null) {
      localStorage.setItem(CALLS_MAX_KEY, DEFAULT_MAX_CALLS.toString());
      setCallsMax(DEFAULT_MAX_CALLS);
    } else {
      setCallsMax(parseInt(storedMax, 10));
    }
  }, []);

  const maskedKey = maskKey(apiKey);

  const saveConfig = useCallback((newApiKey: string, newModel: string) => {
    setApiKeyState(newApiKey);
    setModelState(newModel);
    localStorage.setItem(API_KEY_STORAGE_KEY, newApiKey);
    localStorage.setItem(MODEL_STORAGE_KEY, newModel);
  }, []);

  const clearConfig = useCallback(() => {
    setApiKeyState(null);
    setModelState(DEFAULT_MODEL);
    localStorage.removeItem(API_KEY_STORAGE_KEY);
    localStorage.removeItem(MODEL_STORAGE_KEY);
  }, []);

  const simulateUsage = useCallback(() => {
    setCallsUsed((prev) => {
      const next = prev >= callsMax ? 0 : Math.min(prev + 5, callsMax);
      localStorage.setItem(CALLS_USED_KEY, next.toString());
      return next;
    });
  }, [callsMax]);

  const resetUsage = useCallback(() => {
    setCallsUsed(0);
    localStorage.setItem(CALLS_USED_KEY, '0');
  }, []);

  return {
    apiKey,
    model,
    maskedKey,
    saveConfig,
    clearConfig,
    callsUsed,
    callsMax,
    simulateUsage,
    resetUsage,
  };
}
