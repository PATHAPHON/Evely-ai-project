import { describe, it, expect } from 'vitest';
import { parseLessonResponse } from './parseLessonResponse';

const mc = {
  type: 'multiple_choice',
  prompt: 'เลือกคำแปลที่ถูกต้องของ 사과',
  korean: '사과',
  reading: 'ซากวา',
  romanization: 'sagwa',
  translation: 'แอปเปิ้ล',
  options: ['แอปเปิ้ล', 'กล้วย', 'ส้ม', 'องุ่น'],
  answerIndex: 0,
};

const matching = {
  type: 'matching',
  prompt: 'จับคู่คำเกาหลีกับคำแปล',
  pairs: [
    { korean: '물', thai: 'น้ำ' },
    { korean: '밥', thai: 'ข้าว' },
  ],
};

const listening = {
  type: 'listening',
  prompt: 'ฟังแล้วเลือกคำที่ได้ยิน',
  korean: '감사합니다',
  reading: 'คัมซาฮัมนีดา',
  romanization: 'gamsahamnida',
  translation: 'ขอบคุณ',
  options: ['감사합니다', '안녕하세요', '미안합니다'],
  answerIndex: 0,
};

describe('parseLessonResponse', () => {
  it('parses a valid { exercises } object', () => {
    const content = JSON.stringify({ exercises: [mc, matching, listening] });
    const result = parseLessonResponse(content);
    expect(result.exercises).toHaveLength(3);
    expect(result.exercises[0]).toMatchObject({
      type: 'multiple_choice',
      answerIndex: 0,
      options: mc.options,
    });
    expect(result.exercises[1].pairs).toHaveLength(2);
    expect(result.exercises[2].type).toBe('listening');
    // ids are assigned
    expect(result.exercises[0].id).toBeTruthy();
  });

  it('accepts a bare top-level array', () => {
    const content = JSON.stringify([mc, matching]);
    const result = parseLessonResponse(content);
    expect(result.exercises).toHaveLength(2);
  });

  it('parses JSON wrapped in markdown code fences', () => {
    const content = '```json\n' + JSON.stringify({ exercises: [mc] }) + '\n```';
    const result = parseLessonResponse(content);
    expect(result.exercises).toHaveLength(1);
  });

  it('handles extra prose around the JSON', () => {
    const content =
      'Here is your lesson:\n' +
      JSON.stringify({ exercises: [mc, listening] }) +
      '\nGood luck!';
    const result = parseLessonResponse(content);
    expect(result.exercises).toHaveLength(2);
  });

  it('drops malformed items but keeps valid ones', () => {
    const content = JSON.stringify({
      exercises: [
        mc,
        { type: 'multiple_choice', prompt: 'no options' },
        { type: 'unknown_type', options: ['a', 'b'], answerIndex: 0 },
        { type: 'matching', pairs: [{ korean: '물', thai: 'น้ำ' }] }, // <2 pairs
        { ...mc, answerIndex: 9 }, // out of range
        matching,
      ],
    });
    const result = parseLessonResponse(content);
    expect(result.exercises).toHaveLength(2);
    expect(result.exercises.map((e) => e.type)).toEqual([
      'multiple_choice',
      'matching',
    ]);
  });

  it('drops listening exercises missing korean', () => {
    const content = JSON.stringify({
      exercises: [{ ...listening, korean: '' }],
    });
    expect(() => parseLessonResponse(content)).toThrow('Invalid response format');
  });

  it('coerces a string answerIndex', () => {
    const content = JSON.stringify({
      exercises: [{ ...mc, answerIndex: '2' }],
    });
    const result = parseLessonResponse(content);
    expect(result.exercises[0].answerIndex).toBe(2);
  });

  it('throws on empty input', () => {
    expect(() => parseLessonResponse('')).toThrow('Empty response content');
    expect(() => parseLessonResponse('   ')).toThrow('Empty response content');
  });

  it('throws when no valid exercises survive', () => {
    expect(() => parseLessonResponse('hello world')).toThrow(
      'Invalid response format'
    );
    const content = JSON.stringify({ exercises: [{ type: 'multiple_choice' }] });
    expect(() => parseLessonResponse(content)).toThrow('Invalid response format');
  });
});
