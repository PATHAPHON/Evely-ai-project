import type { ChatMessage, ChatMessagePayload } from '@/app/chat/_lib/types/types';

/**
 * ponytail: Hard ceiling on how many recent messages we forward to the model.
 * Caps token growth so the daily budget (µ฿) isn't burned by ever-growing
 * history and we don't slam the model token limit (502). Trim from the FRONT —
 * the most recent turns matter most.
 * Upgrade path: if conversations need deeper memory, replace this fixed window
 * with token-aware trimming or a summarized-history prefix.
 */
export const MAX_CONTEXT_MESSAGES = 20;

/**
 * Builds the conversation context payload for the Chat API.
 * Takes the message history, keeps the most recent MAX_CONTEXT_MESSAGES
 * (dropping older ones), and maps them to ChatMessagePayload format
 * in chronological order.
 */
export function buildContext(messages: ChatMessage[]): ChatMessagePayload[] {
  return messages.slice(-MAX_CONTEXT_MESSAGES).map((msg): ChatMessagePayload => ({
    role: msg.role,
    content: msg.role === 'user' ? msg.rawText : msg.englishText,
  }));
}
