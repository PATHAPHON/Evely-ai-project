'use client';

import { useState, useCallback, useEffect } from 'react';
import { safeLocalStorage } from '@/shared/utils/safeStorage';

export const CUSTOM_ROLE_PROMPT_KEY = 'evely_custom_role_prompt';
export const MAX_CUSTOM_ROLE_PROMPT_LENGTH = 1000;

/**
 * Custom hook for managing AI custom persona/role prompt persistence.
 */
export function useCustomRolePrompt() {
  const [customPrompt, setCustomPromptState] = useState<string>(() => {
    return safeLocalStorage.getItem(CUSTOM_ROLE_PROMPT_KEY) ?? '';
  });

  // Keep state synchronized with storage after mount (e.g. hydration or external updates)
  useEffect(() => {
    const stored = safeLocalStorage.getItem(CUSTOM_ROLE_PROMPT_KEY) ?? '';
    if (stored !== customPrompt) {
      setCustomPromptState(stored);
    }
  }, [customPrompt]);

  const setCustomPrompt = useCallback((prompt: string) => {
    const trimmedAndSliced = prompt.trim().slice(0, MAX_CUSTOM_ROLE_PROMPT_LENGTH);
    setCustomPromptState(trimmedAndSliced);
    safeLocalStorage.setItem(CUSTOM_ROLE_PROMPT_KEY, trimmedAndSliced);
  }, []);

  const clearCustomPrompt = useCallback(() => {
    setCustomPromptState('');
    safeLocalStorage.removeItem(CUSTOM_ROLE_PROMPT_KEY);
  }, []);

  return {
    customPrompt,
    setCustomPrompt,
    clearCustomPrompt,
  };
}

export default useCustomRolePrompt;
