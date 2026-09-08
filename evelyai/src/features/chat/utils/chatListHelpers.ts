import type { ChatMessage } from '@/shared/types/chatTypes';

/**
 * Find the id of the freshest non-pending assistant message — it gets the
 * "happy hop" / typewriter animation while older ones idle. Returns null when
 * there is no settled assistant message.
 */
export function findLastAssistantId(messages: ChatMessage[]): string | null {
  let lastAssistantId: string | null = null;
  for (const m of messages) {
    if (m.role === 'assistant' && m.status !== 'pending') lastAssistantId = m.id;
  }
  return lastAssistantId;
}
