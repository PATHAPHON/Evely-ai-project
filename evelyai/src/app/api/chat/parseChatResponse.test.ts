import { describe, it, expect } from 'vitest';
import { parseChatResponse } from './parseChatResponse';
import type { ChatSuccessResponse } from '@/shared/types/chatTypes';

const validResponse: ChatSuccessResponse = {
  englishText: 'Hello',
  translation: 'สวัสดี',
  english: 'Hello',
};

const expectedResponse: ChatSuccessResponse = {
  ...validResponse,
  sentences: [
    {
      englishText: 'Hello',
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
      translation: '  สวัสดี  ',
      english: '  Hello  ',
    };
    const content = JSON.stringify(responseWithSpaces);
    const result = parseChatResponse(content);
    expect(result).toEqual(expectedResponse);
  });

  it('parses sentence emotion tags and compiles ttsText with inline audio tags', () => {
    const responseWithEmotion = {
      sentences: [
        { englishText: "That's wonderful news!", translation: 'เป็นข่าวที่ยอดเยี่ยมมาก!', emotion: 'cheerful' },
        { englishText: 'What will you do next?', translation: 'คุณจะทำอะไรต่อ?', emotion: 'curious' },
      ],
    };
    const content = JSON.stringify(responseWithEmotion);
    const result = parseChatResponse(content);
    expect(result).toEqual({
      sentences: [
        { english: '', englishText: "That's wonderful news!", translation: 'เป็นข่าวที่ยอดเยี่ยมมาก!', emotion: 'cheerful' },
        { english: '', englishText: 'What will you do next?', translation: 'คุณจะทำอะไรต่อ?', emotion: 'curious' },
      ],
      englishText: "That's wonderful news! What will you do next?",
      translation: 'เป็นข่าวที่ยอดเยี่ยมมาก! คุณจะทำอะไรต่อ?',
      english: ' ',
      ttsText: "[cheerful] That's wonderful news! [curious] What will you do next?",
    });
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

  it('accepts an English-only response (translation filled later on-device)', () => {
    // The model now replies in English only; Thai is added client-side via Chrome.
    const englishOnly = { englishText: 'Hello' };
    const result = parseChatResponse(JSON.stringify(englishOnly));
    expect(result.englishText).toBe('Hello');
    expect(result.sentences?.[0].englishText).toBe('Hello');
  });

  it('throws error when englishText is empty', () => {
    const emptyField = { ...validResponse, englishText: '' };
    const content = JSON.stringify(emptyField);
    expect(() => parseChatResponse(content)).toThrow('Invalid response format');
  });

  it('handles malformed JSON by extracting fields via regex', () => {
    // Simulate truncated JSON where fields are still extractable
    const content =
      '{"englishText":"Hello","romanization":"hello","translation":"สวัสดี","english":"Hello"';
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
      translation: 'เขาพูดว่า "สวัสดี"',
      english: 'He said "Hello"',
    };
    const expectedResponseWithEscapes: ChatSuccessResponse = {
      ...responseWithEscapes,
      sentences: [
        {
          englishText: 'He said "Hello"',
          translation: 'เขาพูดว่า "สวัสดี"',
          english: 'He said "Hello"',
        },
      ],
    };
    const content = JSON.stringify(responseWithEscapes);
    const result = parseChatResponse(content);
    expect(result).toEqual(expectedResponseWithEscapes);
  });

  it('extracts grammar feedback fields when grammar check detects errors', () => {
    const grammarResponse = {
      englishText: 'I went to school yesterday.',
      translation: 'ฉันไปโรงเรียนเมื่อวานนี้',
      english: 'I went to school yesterday.',
      grammarCorrect: false,
      originalText: 'I goes to school yesterday',
      correctedText: 'I went to school yesterday.',
      grammarNotes: 'ใช้ "went" แทน "goes" เพราะมี yesterday เป็นอดีต',
    };
    const result = parseChatResponse(JSON.stringify(grammarResponse));
    expect(result.grammarCorrect).toBe(false);
    expect(result.originalText).toBe('I goes to school yesterday');
    expect(result.correctedText).toBe('I went to school yesterday.');
    expect(result.grammarNotes).toBe('ใช้ "went" แทน "goes" เพราะมี yesterday เป็นอดีต');
  });

  it('handles string representation of grammarCorrect (e.g. "false" / "true")', () => {
    const grammarResponse = {
      englishText: 'She is smart.',
      translation: 'เธอฉลาด',
      grammarCorrect: 'true',
    };
    const result = parseChatResponse(JSON.stringify(grammarResponse));
    expect(result.grammarCorrect).toBe(true);

    const grammarErrorResponse = {
      englishText: 'She is smart.',
      translation: 'เธอฉลาด',
      grammarCorrect: 'false',
    };
    const resultError = parseChatResponse(JSON.stringify(grammarErrorResponse));
    expect(resultError.grammarCorrect).toBe(false);
  });

  it('extracts grammar feedback via regex fallback when JSON is malformed', () => {
    const malformed =
      '{"englishText":"I went","translation":"ฉันไป","originalText":"I goes","correctedText":"I went","grammarNotes":"ควรใช้ went","grammarCorrect":false';
    const result = parseChatResponse(malformed);
    expect(result.grammarCorrect).toBe(false);
    expect(result.originalText).toBe('I goes');
    expect(result.correctedText).toBe('I went');
    expect(result.grammarNotes).toBe('ควรใช้ went');
  });
});
