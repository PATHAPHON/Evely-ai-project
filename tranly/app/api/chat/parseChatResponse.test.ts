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

describe('parseChatResponse', () => {
  it('parses a valid JSON object', () => {
    const content = JSON.stringify(validResponse);
    const result = parseChatResponse(content);
    expect(result).toEqual(validResponse);
  });

  it('parses JSON wrapped in markdown code fences', () => {
    const content = '```json\n' + JSON.stringify(validResponse) + '\n```';
    const result = parseChatResponse(content);
    expect(result).toEqual(validResponse);
  });

  it('parses JSON wrapped in plain code fences', () => {
    const content = '```\n' + JSON.stringify(validResponse) + '\n```';
    const result = parseChatResponse(content);
    expect(result).toEqual(validResponse);
  });

  it('handles extra prose before and after JSON', () => {
    const content =
      'Here is the response:\n' +
      JSON.stringify(validResponse) +
      '\nHope this helps!';
    const result = parseChatResponse(content);
    expect(result).toEqual(validResponse);
  });

  it('handles extra prose with markdown fences', () => {
    const content =
      'Here is your Korean response:\n```json\n' +
      JSON.stringify(validResponse) +
      '\n```\nLet me know if you need more.';
    const result = parseChatResponse(content);
    expect(result).toEqual(validResponse);
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
    expect(result).toEqual(validResponse);
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
    expect(result).toEqual(validResponse);
  });

  it('handles double-encoded JSON (backslash-escaped)', () => {
    const inner = JSON.stringify(validResponse);
    const doubleEncoded = inner.replace(/"/g, '\\"');
    const result = parseChatResponse(doubleEncoded);
    expect(result).toEqual(validResponse);
  });

  it('ignores extra fields in the response', () => {
    const withExtra = {
      ...validResponse,
      extra: 'some extra field',
      notes: 'additional notes',
    };
    const content = JSON.stringify(withExtra);
    const result = parseChatResponse(content);
    expect(result).toEqual(validResponse);
  });

  it('handles response with escaped characters in field values', () => {
    const responseWithEscapes: ChatSuccessResponse = {
      korean: '그는 "안녕"이라고 말했어요',
      reading: 'คือนึน "อันนยอง"อีราโก มาแรซอโย',
      romanization: 'geuneun "annyeong"irago malhaesseoyo',
      translation: 'เขาพูดว่า "สวัสดี"',
      english: 'He said "Hello"',
    };
    const content = JSON.stringify(responseWithEscapes);
    const result = parseChatResponse(content);
    expect(result).toEqual(responseWithEscapes);
  });
});
