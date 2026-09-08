import { describe, it, expect } from 'vitest';
import { buildAssistantMessage } from './buildAssistantMessage';
import { baseMessage } from './baseMessage';
import type { ChatSuccessResponse } from '@/shared/types/chatTypes';

const pending = baseMessage({ role: 'assistant', status: 'pending', id: 'pending-1' });

const aiResponse: ChatSuccessResponse = {
  englishText: 'Hello there. How are you?',
  english: 'Hello there. How are you?',
  translation: '',
  sentences: [
    { englishText: 'Hello there.', translation: '', english: 'Hello there.' },
    { englishText: 'How are you?', translation: '', english: 'How are you?' },
  ],
  suggestions: [
    { englishText: "I'm fine.", translation: '' },
    { englishText: 'Not bad.', translation: '' },
  ],
  suggestionsLocked: true,
};

describe('buildAssistantMessage', () => {
  it('resolves the pending placeholder into a sent message', () => {
    const msg = buildAssistantMessage(pending, aiResponse, null);
    expect(msg.id).toBe('pending-1'); // keeps the placeholder id
    expect(msg.status).toBe('sent');
    expect(msg.englishText).toBe(aiResponse.englishText);
    expect(msg.rawText).toBe(aiResponse.englishText);
    expect(msg.suggestionsLocked).toBe(true);
    expect(typeof msg.timestamp).toBe('string');
  });

  it('keeps sentences/suggestions untranslated when translated is null', () => {
    const msg = buildAssistantMessage(pending, aiResponse, null);
    expect(msg.sentences).toEqual(aiResponse.sentences);
    expect(msg.suggestions).toEqual(aiResponse.suggestions);
    expect(msg.translation).toBe(' '); // two empty sentence translations joined by a space
  });

  it('maps the flat translated batch: sentences first, then suggestions', () => {
    const translated = ['สวัสดี', 'สบายดีไหม', 'ฉันสบายดี', 'ก็ไม่เลว'];
    const msg = buildAssistantMessage(pending, aiResponse, translated);

    expect(msg.sentences?.map((s) => s.translation)).toEqual(['สวัสดี', 'สบายดีไหม']);
    // suggestions are offset by sentences.length (2)
    expect(msg.suggestions?.map((s) => s.translation)).toEqual(['ฉันสบายดี', 'ก็ไม่เลว']);
    expect(msg.translation).toBe('สวัสดี สบายดีไหม'); // joined sentence translations
  });

  it('falls back to empty strings when the translated batch is short', () => {
    const msg = buildAssistantMessage(pending, aiResponse, ['สวัสดี']);
    expect(msg.sentences?.map((s) => s.translation)).toEqual(['สวัสดี', '']);
    expect(msg.suggestions?.map((s) => s.translation)).toEqual(['', '']);
  });

  it('uses translations directly from aiResponse when translated is omitted', () => {
    const responseWithTranslations: ChatSuccessResponse = {
      englishText: 'Hello there. How are you?',
      english: 'Hello there. How are you?',
      translation: 'สวัสดี สบายดีไหม',
      sentences: [
        { englishText: 'Hello there.', translation: 'สวัสดี', english: 'Hello there.' },
        { englishText: 'How are you?', translation: 'สบายดีไหม', english: 'How are you?' },
      ],
      suggestions: [
        { englishText: "I'm fine.", translation: 'ฉันสบายดี' },
        { englishText: 'Not bad.', translation: 'ก็ไม่เลว' },
      ],
      suggestionsLocked: false,
    };

    const msg = buildAssistantMessage(pending, responseWithTranslations);
    expect(msg.translation).toBe('สวัสดี สบายดีไหม');
    expect(msg.sentences?.map((s) => s.translation)).toEqual(['สวัสดี', 'สบายดีไหม']);
    expect(msg.suggestions?.map((s) => s.translation)).toEqual(['ฉันสบายดี', 'ก็ไม่เลว']);
    expect(msg.suggestionsLocked).toBe(false);
  });
});
