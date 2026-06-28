'use client';

import { useCallback } from 'react';
import { getCustomAIHeaders } from '@/app/_lib/utils/getCustomAIHeaders';
import { markBudgetExhausted, clearBudgetExhausted } from '@/app/_lib/hooks/useBudgetExhausted';
import { parseChatResponse } from '@/app/api/chat/parseChatResponse';
import { MAX_CONTEXT_MESSAGES } from '@/app/api/chat/buildContext';

import type { TargetLanguage } from '@/app/_lib/types/wordTypes';
import type {
  ChatMessage,
  ChatMessagePayload,
  ChatSuccessResponse,
} from '../types/types';

export interface UseChatApiReturn {
  callChatApi: (
    contextMessages: ChatMessage[],
    language: TargetLanguage,
  ) => Promise<ChatSuccessResponse>;
}

/**
 * Stateless hook that owns the /api/chat network layer.
 *
 * Responsibilities:
 *  - POST /api/chat with the right headers and the most recent context window
 *  - Await the complete response text
 *  - Parse and return the final ChatSuccessResponse
 */
export function useChatApi(): UseChatApiReturn {
  const buildContextPayload = useCallback(
    (msgs: ChatMessage[]): ChatMessagePayload[] =>
      // Trim from the front to match the server-side cap and shrink the payload
      // before it goes over the wire. Server still enforces this independently.
      msgs.slice(-MAX_CONTEXT_MESSAGES).map(
        (msg): ChatMessagePayload => ({
          role: msg.role,
          content:
            msg.role === 'user'
              ? (msg.englishText || msg.rawText)
              : msg.englishText,
        }),
      ),
    [],
  );

  const callChatApi = useCallback(
    async (
      contextMessages: ChatMessage[],
      language: TargetLanguage,
    ): Promise<ChatSuccessResponse> => {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getCustomAIHeaders() },
        body: JSON.stringify({
          messages: buildContextPayload(contextMessages),
          language,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const message = errorData?.error?.message ?? 'ไม่สามารถสร้างข้อความได้ กรุณาลองอีกครั้ง';
        if (response.status === 401) {
          window.location.href = '/auth';
          throw new Error(message);
        }
        if (response.status === 429) {
          console.error('AI budget exhausted:', message);
          markBudgetExhausted();
          const e = new Error(message);
          (e as Error & { budget?: boolean }).budget = true;
          throw e;
        }
        throw new Error(message);
      }

      clearBudgetExhausted();

      const suggestionsLocked = response.headers.get('X-Suggestions-Locked') === '1';

      const responseText = await response.text();
      const parsed = parseChatResponse(responseText);
      return suggestionsLocked ? { ...parsed, suggestionsLocked: true } : parsed;
    },
    [buildContextPayload],
  );

  return { callChatApi };
}
