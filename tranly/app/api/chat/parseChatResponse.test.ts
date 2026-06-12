import { describe, it, expect } from 'vitest';
import { parseChatResponse } from './parseChatResponse';
import type { ChatSuccessResponse } from '@/app/chat/_lib/types';

const validResponse: ChatSuccessResponse = {
  korean: '안녕하세요',
  reading: 'อันนยองฮาเซโย',
  romanization: 'annyeonghaseyo',
  translation: 'สวัสดี',
  english: 'Hello',
};

const expectedResponse: ChatSuccessResponse = {
  ...validResponse,
  sentences: [
    {
      korean: '안녕하세요',
      reading: 'อันนยองฮาเซโย',
      romanization: 'annyeonghaseyo',
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
          korean: '좋은 하루',
          reading: 'โชอึน ฮารู',
          romanization: 'joeun haru',
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
          korean: '안녕',
          reading: 'อันนยอง',
          romanization: 'annyeong',
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
      'Here is your Korean response:\n```json\n' +
      JSON.stringify(validResponse) +
      '\n```\nLet me know if you need more.';
    const result = parseChatResponse(content);
    expect(result).toEqual(expectedResponse);
  });

  it('trims whitespace from field values', () => {
    const responseWithSpaces = {
      korean: '  안녕하세요  ',
      reading: '  อันนยองฮาเซโย  ',
      romanization: '  annyeonghaseyo  ',
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
    const incomplete = { korean: '안녕하세요', reading: 'อันนยองฮาเซโย' };
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
      '{"korean":"안녕하세요","reading":"อันนยองฮาเซโย","romanization":"annyeonghaseyo","translation":"สวัสดี","english":"Hello"';
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
        { korean: '네, 좋아요', translation: 'ได้ ดีเลย' },
        { korean: '잘 모르겠어요', translation: 'ไม่ค่อยแน่ใจ' },
      ],
    };
    const result = parseChatResponse(JSON.stringify(withSuggestions));
    expect(result.suggestions).toHaveLength(2);
    expect(result.suggestions?.[0]).toEqual({
      korean: '네, 좋아요',
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
        { korean: '네', translation: 'ใช่' },
        { translation: 'no korean' },
        'not an object',
      ],
    };
    const result = parseChatResponse(JSON.stringify(messy));
    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions?.[0].korean).toBe('네');
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
      korean: '그는 "안녕"이라고 말했어요',
      reading: 'คือนึน "อันนยอง"อีราโก มาแรซอโย',
      romanization: 'geuneun "annyeong"irago malhaesseoyo',
      translation: 'เขาพูดว่า "สวัสดี"',
      english: 'He said "Hello"',
    };
    const expectedResponseWithEscapes: ChatSuccessResponse = {
      ...responseWithEscapes,
      sentences: [
        {
          korean: '그는 "안녕"이라고 말했어요',
          reading: 'คือนึน "อันนยอง"อีราโก มาแรซอโย',
          romanization: 'geuneun "annyeong"irago malhaesseoyo',
          translation: 'เขาพูดว่า "สวัสดี"',
          english: 'He said "Hello"',
        },
      ],
    };
    const content = JSON.stringify(responseWithEscapes);
    const result = parseChatResponse(content);
    expect(result).toEqual(expectedResponseWithEscapes);
  });
});
