import { describe, it, expect } from 'vitest';
import { parseChatResponse } from './parseChatResponse';
import type { ChatSuccessResponse } from '@/app/chat/_lib/types';

const validResponse: ChatSuccessResponse = {
  englishText: 'Hello',
  reading: 'เฮลโล',
  romanization: 'hello',
  translation: 'สวัสดี',
  english: 'Hello',
};

const expectedResponse: ChatSuccessResponse = {
  ...validResponse,
  sentences: [
    {
      englishText: 'Hello',
      reading: 'เฮลโล',
      romanization: 'hello',
      translation: 'สวัสดี',
      english: 'Hello',
    },
  ],
};

describe('parseChatResponse', () => {
  it('parses a valid JSON object', () => {
    const content = JSON.stringify(validResponse);
    const result = parseChatResponse(content);
    expect(result).toEqual(expectedResponse);
  });

  it('parses englishPhrases when the AI supplies them', () => {
    const content = JSON.stringify({
      sentences: [
        {
          englishText: 'good day',
          reading: 'กูด เดย์',
          romanization: 'good day',
          translation: 'วันที่ดี',
          english: 'good day',
          englishPhrases: ['good day'],
        },
      ],
    });
    const result = parseChatResponse(content);
    expect(result.sentences?.[0].englishPhrases).toEqual(['good day']);
  });

  it('omits englishPhrases when absent or malformed but keeps the sentence valid', () => {
    const content = JSON.stringify({
      sentences: [
        {
          englishText: 'Hi',
          reading: 'ฮาย',
          romanization: 'hi',
          translation: 'สวัสดี',
          english: 'Hi',
          englishPhrases: 'not-an-array',
        },
      ],
    });
    const result = parseChatResponse(content);
    expect(result.sentences?.[0].english).toBe('Hi');
    expect(result.sentences?.[0].englishPhrases).toBeUndefined();
  });

  it('parses JSON wrapped in markdown code fences', () => {
    const content = '```json\n' + JSON.stringify(validResponse) + '\n```';
    const result = parseChatResponse(content);
    expect(result).toEqual(expectedResponse);
  });

  it('parses JSON wrapped in plain code fences', () => {
    const content = '```\n' + JSON.stringify(validResponse) + '\n```';
    const result = parseChatResponse(content);
    expect(result).toEqual(expectedResponse);
  });

  it('handles extra prose before and after JSON', () => {
    const content =
      'Here is the response:\n' +
      JSON.stringify(validResponse) +
      '\nHope this helps!';
    const result = parseChatResponse(content);
    expect(result).toEqual(expectedResponse);
  });

  it('handles extra prose with markdown fences', () => {
    const content =
      'Here is your English response:\n```json\n' +
      JSON.stringify(validResponse) +
      '\n```\nLet me know if you need more.';
    const result = parseChatResponse(content);
    expect(result).toEqual(expectedResponse);
  });

  it('trims whitespace from field values', () => {
    const responseWithSpaces = {
      englishText: '  Hello  ',
      reading: '  เฮลโล  ',
      romanization: '  hello  ',
      translation: '  สวัสดี  ',
      english: '  Hello  ',
    };
    const content = JSON.stringify(responseWithSpaces);
    const result = parseChatResponse(content);
    expect(result).toEqual(expectedResponse);
  });

  it('throws error for empty input', () => {
    expect(() => parseChatResponse('')).toThrow('Empty response content');
    expect(() => parseChatResponse('   ')).toThrow('Empty response content');
  });

  it('throws error for content without valid fields', () => {
    expect(() => parseChatResponse('hello world')).toThrow(
      'Invalid response format'
    );
    expect(() => parseChatResponse('not json at all')).toThrow(
      'Invalid response format'
    );
  });

  it('throws error when required fields are missing', () => {
    const incomplete = { englishText: 'Hello', reading: 'เฮลโล' };
    const content = JSON.stringify(incomplete);
    expect(() => parseChatResponse(content)).toThrow('Invalid response format');
  });

  it('throws error when fields are empty strings', () => {
    const emptyField = { ...validResponse, translation: '' };
    const content = JSON.stringify(emptyField);
    expect(() => parseChatResponse(content)).toThrow('Invalid response format');
  });

  it('handles malformed JSON by extracting fields via regex', () => {
    // Simulate truncated JSON where fields are still extractable
    const content =
      '{"englishText":"Hello","reading":"เฮลโล","romanization":"hello","translation":"สวัสดี","english":"Hello"';
    const result = parseChatResponse(content);
    expect(result).toEqual(expectedResponse);
  });

  it('handles double-encoded JSON (backslash-escaped)', () => {
    const inner = JSON.stringify(validResponse);
    const doubleEncoded = inner.replace(/"/g, '\\"');
    const result = parseChatResponse(doubleEncoded);
    expect(result).toEqual(expectedResponse);
  });

  it('extracts reply suggestions when present', () => {
    const withSuggestions = {
      ...validResponse,
      suggestions: [
        { englishText: 'Yes, sounds good', translation: 'ได้ ดีเลย' },
        { englishText: 'I am not sure', translation: 'ไม่ค่อยแน่ใจ' },
      ],
    };
    const result = parseChatResponse(JSON.stringify(withSuggestions));
    expect(result.suggestions).toHaveLength(2);
    expect(result.suggestions?.[0]).toEqual({
      englishText: 'Yes, sounds good',
      translation: 'ได้ ดีเลย',
    });
  });

  it('omits suggestions when absent or empty', () => {
    expect(parseChatResponse(JSON.stringify(validResponse)).suggestions).toBeUndefined();
    const emptyArr = { ...validResponse, suggestions: [] };
    expect(parseChatResponse(JSON.stringify(emptyArr)).suggestions).toBeUndefined();
  });

  it('drops malformed suggestion entries', () => {
    const messy = {
      ...validResponse,
      suggestions: [
        { englishText: 'Yes', translation: 'ใช่' },
        { translation: 'no englishText' },
        'not an object',
      ],
    };
    const result = parseChatResponse(JSON.stringify(messy));
    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions?.[0].englishText).toBe('Yes');
  });

  it('reads the ended flag when true', () => {
    const ended = { ...validResponse, ended: true };
    expect(parseChatResponse(JSON.stringify(ended)).ended).toBe(true);
  });

  it('defaults ended to undefined when absent or non-boolean', () => {
    expect(parseChatResponse(JSON.stringify(validResponse)).ended).toBeUndefined();
    const weird = { ...validResponse, ended: 'yes' };
    expect(parseChatResponse(JSON.stringify(weird)).ended).toBeUndefined();
  });

  it('reads ended:false explicitly', () => {
    const ended = { ...validResponse, ended: false };
    expect(parseChatResponse(JSON.stringify(ended)).ended).toBe(false);
  });

  it('ignores extra fields in the response', () => {
    const withExtra = {
      ...validResponse,
      extra: 'some extra field',
      notes: 'additional notes',
    };
    const content = JSON.stringify(withExtra);
    const result = parseChatResponse(content);
    expect(result).toEqual(expectedResponse);
  });

  it('handles response with escaped characters in field values', () => {
    const responseWithEscapes: ChatSuccessResponse = {
      englishText: 'He said "Hello"',
      reading: 'ฮี เซด "เฮลโล"',
      romanization: 'he said hello',
      translation: 'เขาพูดว่า "สวัสดี"',
      english: 'He said "Hello"',
    };
    const expectedResponseWithEscapes: ChatSuccessResponse = {
      ...responseWithEscapes,
      sentences: [
        {
          englishText: 'He said "Hello"',
          reading: 'ฮี เซด "เฮลโล"',
          romanization: 'he said hello',
          translation: 'เขาพูดว่า "สวัสดี"',
          english: 'He said "Hello"',
        },
      ],
    };
    const content = JSON.stringify(responseWithEscapes);
    const result = parseChatResponse(content);
    expect(result).toEqual(expectedResponseWithEscapes);
  });

  // Backward-compat: AI model may still respond with legacy key `korean`
  it('accepts legacy `korean` key as fallback for englishText', () => {
    const legacyResponse = {
      korean: 'Hello',
      reading: 'เฮลโล',
      romanization: 'hello',
      translation: 'สวัสดี',
      english: 'Hello',
    };
    const result = parseChatResponse(JSON.stringify(legacyResponse));
    expect(result.englishText).toBe('Hello');
    expect(result.sentences?.[0].englishText).toBe('Hello');
  });

  it('accepts legacy `korean` key in sentences as fallback', () => {
    const legacyWithSentences = {
      sentences: [
        {
          korean: 'Good morning',
          reading: 'กูด มอร์นิ่ง',
          romanization: 'good morning',
          translation: 'อรุณสวัสดิ์',
          english: 'Good morning',
        },
      ],
    };
    const result = parseChatResponse(JSON.stringify(legacyWithSentences));
    expect(result.sentences?.[0].englishText).toBe('Good morning');
  });

  it('prefers englishText over korean when both present', () => {
    const mixed = {
      englishText: 'Hello',
      korean: 'old value',
      reading: 'เฮลโล',
      romanization: 'hello',
      translation: 'สวัสดี',
      english: 'Hello',
    };
    const result = parseChatResponse(JSON.stringify(mixed));
    expect(result.englishText).toBe('Hello');
  });
});
