import { describe, it, expect } from 'vitest';
import { parseExamResponse } from './parseExamResponse';

const readingItem = {
  type: 'reading',
  passage: 'Tom goes to school every day.',
  question: 'How often does Tom go to school?',
  choices: ['Every day', 'Once a week', 'Never', 'On weekends'],
  correctAnswer: 0,
};

const listeningItem = {
  type: 'listening',
  script: 'The meeting starts at three in the afternoon.',
  question: 'When does the meeting start?',
  choices: ['At noon', 'At 3 PM', 'At 3 AM', 'Tomorrow'],
  correctAnswer: 1,
};

describe('parseExamResponse', () => {
  it('parses a valid JSON response', () => {
    const content = JSON.stringify({ questions: [readingItem, listeningItem] });
    const result = parseExamResponse(content);
    expect(result!.questions).toHaveLength(2);
    expect(result!.questions[0]).toMatchObject({ type: 'reading', passage: readingItem.passage });
    expect(result!.questions[1]).toMatchObject({ type: 'listening', script: listeningItem.script });
    expect(result!.questions[0].id).toBe('reading-1');
    expect(result!.questions[1].id).toBe('listening-2');
  });

  it('extracts the AI-chosen level when valid', () => {
    const content = JSON.stringify({ level: 'B1', questions: [readingItem] });
    expect(parseExamResponse(content)!.level).toBe('B1');

    const toeic = JSON.stringify({ level: 'hard', questions: [readingItem] });
    expect(parseExamResponse(toeic)!.level).toBe('hard');
  });

  it('returns null level when missing or unrecognized', () => {
    expect(parseExamResponse(JSON.stringify({ questions: [readingItem] }))!.level).toBeNull();
    expect(
      parseExamResponse(JSON.stringify({ level: 'expert', questions: [readingItem] }))!.level
    ).toBeNull();
  });

  it('parses JSON wrapped in markdown fences', () => {
    const content =
      '```json\n' + JSON.stringify({ questions: [readingItem] }) + '\n```';
    const result = parseExamResponse(content);
    expect(result!.questions).toHaveLength(1);
  });

  it('skips malformed items but keeps valid ones', () => {
    const content = JSON.stringify({
      questions: [
        readingItem,
        { type: 'reading', question: 'missing fields' },
        { ...listeningItem, correctAnswer: 7 },
        { ...listeningItem, choices: ['only', 'three', 'choices'] },
      ],
    });
    const result = parseExamResponse(content);
    expect(result!.questions).toHaveLength(1);
  });

  it('returns null for empty content', () => {
    expect(parseExamResponse('')).toBeNull();
  });

  it('returns null for non-JSON prose', () => {
    expect(parseExamResponse('Sorry, I cannot help with that.')).toBeNull();
  });

  it('returns null when questions array is empty or missing', () => {
    expect(parseExamResponse('{"questions":[]}')).toBeNull();
    expect(parseExamResponse('{"foo":1}')).toBeNull();
  });

  it('returns null for truncated JSON', () => {
    const content = JSON.stringify({ questions: [readingItem] }).slice(0, 40);
    expect(parseExamResponse(content)).toBeNull();
  });
});
