'use client';

import { useCallback, useEffect, useState } from 'react';

const API_KEY_STORAGE_KEY = 'tarnly:ai-api-key';
const MODEL_STORAGE_KEY = 'tarnly:ai-model';
const DEFAULT_MODEL = 'gemini-2.5-flash-lite';

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

  useEffect(() => {
    const storedKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    const storedModel = localStorage.getItem(MODEL_STORAGE_KEY);

    if (storedKey) {
      setApiKeyState(storedKey);
    }
    if (storedModel) {
      setModelState(storedModel);
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

  return { apiKey, model, maskedKey, saveConfig, clearConfig };
}
