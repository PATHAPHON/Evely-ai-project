'use client';

import { useCallback } from 'react';
import { getCustomAIHeaders } from '@/app/_lib/getCustomAIHeaders';
import { parseChatResponse } from '@/app/api/chat/parseChatResponse';
import { parsePartialChat } from '@/app/api/chat/parsePartialChat';

import type { TargetLanguage } from '@/app/_lib/wordTypes';
import type {
  ChatMessage,
  ChatMessagePayload,
  ChatSuccessResponse,
} from './types';

const MAX_CONTEXT_MESSAGES = 20;

// Shape of each streaming chunk passed to the caller.
export type PartialReply = {
  sentences: { englishText: string; english?: string; translation?: string }[];
};

export interface UseChatApiReturn {
  callChatApi: (
    contextMessages: ChatMessage[],
    language: TargetLanguage,
    onPartial?: (partial: PartialReply) => void,
  ) => Promise<ChatSuccessResponse>;
}

/**
 * Stateless hook that owns the /api/chat network layer.
 *
 * Responsibilities:
 *  - Trim context to the last MAX_CONTEXT_MESSAGES messages
 *  - POST /api/chat with the right headers
 *  - Stream the response body and call `onPartial` per chunk
 *  - Parse and return the final ChatSuccessResponse
 */
export function useChatApi(): UseChatApiReturn {
  const buildContextPayload = useCallback(
    (msgs: ChatMessage[]): ChatMessagePayload[] =>
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
      onPartial?: (partial: PartialReply) => void,
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
        const errorData = await response.json();
        throw new Error(
          errorData?.error?.message ?? 'ไม่สามารถสร้างข้อความได้ กรุณาลองอีกครั้ง',
        );
      }

      // Stream body, forwarding each accumulated chunk to the caller.
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      if (reader) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            if (onPartial) {
              const partial = parsePartialChat(buffer);
              if (partial.sentences.length > 0) onPartial(partial);
            }
          }
        } finally {
          reader.releaseLock();
        }
      }

      return parseChatResponse(buffer);
    },
    [buildContextPayload],
  );

  return { callChatApi };
}
