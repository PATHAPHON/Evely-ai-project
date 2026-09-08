import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useConversationHistory } from '../useConversationHistory';
import type { ChatMessage, ReplySuggestion } from '@/shared/types/chatTypes';

const mockUpsert = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();

vi.mock('@/shared/supabase/supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } } }),
    },
    from: vi.fn((table: string) => {
      if (table === 'conversation_messages') {
        return {
          upsert: mockUpsert,
          select: mockSelect.mockReturnValue({
            eq: mockEq.mockReturnValue({
              order: mockOrder,
            }),
          }),
        };
      }
      return {};
    }),
  },
}));

describe('useConversationHistory - suggestion persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpsert.mockResolvedValue({ error: null });
  });

  it('serializes suggestions and suggestionsLocked into english_phrases when saving assistant message', async () => {
    const { result } = renderHook(() => useConversationHistory());

    const suggestions: ReplySuggestion[] = [
      { englishText: 'Sounds great!', translation: 'ฟังดูดีจัง!' },
      { englishText: 'Not really.', translation: 'ไม่ค่อยเท่าไหร่' },
    ];

    const assistantMessage: ChatMessage = {
      id: 'msg-assistant-1',
      role: 'assistant',
      englishText: 'What kind of music do you like?',
      translation: 'คุณชอบดนตรีแนวไหน?',
      english: 'What kind of music do you like?',
      rawText: '',
      timestamp: '2026-09-08T10:00:00.000Z',
      status: 'sent',
      suggestions,
      suggestionsLocked: false,
    };

    await act(async () => {
      await result.current.saveMessage('session-1', assistantMessage);
    });

    expect(mockUpsert).toHaveBeenCalledTimes(1);
    const savedRecord = mockUpsert.mock.calls[0][0];
    expect(savedRecord.id).toBe('msg-assistant-1');
    expect(savedRecord.role).toBe('assistant');
    expect(savedRecord.english_phrases).toBe(
      JSON.stringify({
        suggestions,
        suggestionsLocked: false,
      })
    );
  });

  it('restores suggestions and suggestionsLocked from english_phrases when loading messages', async () => {
    const suggestions: ReplySuggestion[] = [
      { englishText: 'I love pop music!', translation: 'ฉันชอบเพลงป๊อปมาก!' },
    ];

    mockOrder.mockResolvedValue({
      data: [
        {
          id: 'msg-assistant-1',
          session_id: 'session-1',
          role: 'assistant',
          english_text: 'What kind of music do you like?',
          translation: 'คุณชอบดนตรีแนวไหน?',
          english: 'What kind of music do you like?',
          raw_text: '',
          timestamp: '2026-09-08T10:00:00.000Z',
          english_phrases: JSON.stringify({
            suggestions,
            suggestionsLocked: false,
          }),
        },
      ],
      error: null,
    });

    const { result } = renderHook(() => useConversationHistory());

    let loadedMessages: ChatMessage[] = [];
    await act(async () => {
      loadedMessages = await result.current.loadSessionMessages('session-1');
    });

    expect(loadedMessages).toHaveLength(1);
    expect(loadedMessages[0].suggestions).toEqual(suggestions);
    expect(loadedMessages[0].suggestionsLocked).toBe(false);
  });
});
