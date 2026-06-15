import type { ChatMessage, ChatMessagePayload } from '@/app/chat/_lib/types';

const MAX_CONTEXT_MESSAGES = 20;

/**
 * Builds the conversation context payload for the Chat API.
 * Takes the full message history and returns at most 20 most recent messages
 * in chronological order, mapped to ChatMessagePayload format.
 */
export function buildContext(messages: ChatMessage[]): ChatMessagePayload[] {
  const recent = messages.slice(-MAX_CONTEXT_MESSAGES);

  return recent.map((msg): ChatMessagePayload => ({
    role: msg.role,
    content: msg.role === 'user' ? msg.rawText : msg.englishText,
  }));
}
