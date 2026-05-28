import { describe, it, expect } from 'vitest';
import { buildContext } from './buildContext';
import type { ChatMessage } from '@/app/chat/_lib/types';

function makeChatMessage(
  overrides: Partial<ChatMessage> & { role: ChatMessage['role'] },
  index = 0
): ChatMessage {
  return {
    id: `msg-${index}`,
    role: overrides.role,
    korean: overrides.korean ?? `한국어 ${index}`,
    reading: overrides.reading ?? `reading ${index}`,
    romanization: overrides.romanization ?? `romanization ${index}`,
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
      makeChatMessage({ role: 'user', rawText: 'Hello in Korean' }, 0),
    ];

    const result = buildContext(messages);

    expect(result).toEqual([{ role: 'user', content: 'Hello in Korean' }]);
  });

  it('maps assistant messages using korean as content', () => {
    const messages: ChatMessage[] = [
      makeChatMessage({ role: 'assistant', korean: '안녕하세요' }, 0),
    ];

    const result = buildContext(messages);

    expect(result).toEqual([{ role: 'assistant', content: '안녕하세요' }]);
  });

  it('returns all messages when history has 20 or fewer messages', () => {
    const messages: ChatMessage[] = Array.from({ length: 20 }, (_, i) =>
      makeChatMessage({ role: i % 2 === 0 ? 'user' : 'assistant' }, i)
    );

    const result = buildContext(messages);

    expect(result).toHaveLength(20);
  });

  it('returns only the 20 most recent messages when history exceeds 20', () => {
    const messages: ChatMessage[] = Array.from({ length: 25 }, (_, i) =>
      makeChatMessage({ role: i % 2 === 0 ? 'user' : 'assistant' }, i)
    );

    const result = buildContext(messages);

    expect(result).toHaveLength(20);
    // Should be messages 5-24 (the last 20)
    // Index 5 is odd → assistant, so content is korean
    expect(result[0]).toEqual({ role: 'assistant', content: '한국어 5' });
    // Index 24 is even → user, so content is rawText
    expect(result[19]).toEqual({ role: 'user', content: 'raw text 24' });
  });

  it('preserves chronological order', () => {
    const messages: ChatMessage[] = [
      makeChatMessage({ role: 'user', rawText: 'first' }, 0),
      makeChatMessage({ role: 'assistant', korean: '두번째' }, 1),
      makeChatMessage({ role: 'user', rawText: 'third' }, 2),
    ];

    const result = buildContext(messages);

    expect(result).toEqual([
      { role: 'user', content: 'first' },
      { role: 'assistant', content: '두번째' },
      { role: 'user', content: 'third' },
    ]);
  });
});
