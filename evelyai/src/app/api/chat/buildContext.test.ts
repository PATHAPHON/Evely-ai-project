import { describe, it, expect } from 'vitest';
import { buildContext } from './buildContext';
import type { ChatMessage } from '@/shared/types/chatTypes';

function makeChatMessage(
  overrides: Partial<ChatMessage> & { role: ChatMessage['role'] },
  index = 0
): ChatMessage {
  return {
    id: `msg-${index}`,
    role: overrides.role,
    englishText: overrides.englishText ?? `english text ${index}`,
    translation: overrides.translation ?? `translation ${index}`,
    english: overrides.english ?? `english ${index}`,
    rawText: overrides.rawText ?? `raw text ${index}`,
    timestamp: overrides.timestamp ?? new Date(2024, 0, 1, 0, 0, index).toISOString(),
    status: overrides.status ?? 'sent',
  };
}

describe('buildContext', () => {
  it('returns empty array for empty message history', () => {
    expect(buildContext([])).toEqual([]);
  });

  it('maps user messages using rawText as content', () => {
    const messages: ChatMessage[] = [
      makeChatMessage({ role: 'user', rawText: 'Hello in English' }, 0),
    ];

    const result = buildContext(messages);

    expect(result).toEqual([{ role: 'user', content: 'Hello in English' }]);
  });

  it('maps assistant messages using englishText as content', () => {
    const messages: ChatMessage[] = [
      makeChatMessage({ role: 'assistant', englishText: 'Good morning!' }, 0),
    ];

    const result = buildContext(messages);

    expect(result).toEqual([{ role: 'assistant', content: 'Good morning!' }]);
  });

  it('returns all messages when history has 20 or fewer messages', () => {
    const messages: ChatMessage[] = Array.from({ length: 20 }, (_, i) =>
      makeChatMessage({ role: i % 2 === 0 ? 'user' : 'assistant' }, i)
    );

    const result = buildContext(messages);

    expect(result).toHaveLength(20);
  });

  it('caps to the most recent 20 messages when history exceeds 20', () => {
    const messages: ChatMessage[] = Array.from({ length: 25 }, (_, i) =>
      makeChatMessage({ role: i % 2 === 0 ? 'user' : 'assistant' }, i)
    );

    const result = buildContext(messages);

    // Oldest 5 messages (indices 0-4) are dropped from the front.
    expect(result).toHaveLength(20);
    // First kept message is index 5 (odd → assistant, content is englishText).
    expect(result[0]).toEqual({ role: 'assistant', content: 'english text 5' });
    // Last kept message is index 24 (even → user, content is rawText).
    expect(result[19]).toEqual({ role: 'user', content: 'raw text 24' });
  });

  it('preserves chronological order', () => {
    const messages: ChatMessage[] = [
      makeChatMessage({ role: 'user', rawText: 'first' }, 0),
      makeChatMessage({ role: 'assistant', englishText: 'second response' }, 1),
      makeChatMessage({ role: 'user', rawText: 'third' }, 2),
    ];

    const result = buildContext(messages);

    expect(result).toEqual([
      { role: 'user', content: 'first' },
      { role: 'assistant', content: 'second response' },
      { role: 'user', content: 'third' },
    ]);
  });
});
