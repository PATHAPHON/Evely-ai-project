import { describe, it, expect } from 'vitest';
import { selectQuestions } from './useTopikExam';
import type { QuestionBank, TopikQuestion, TopikListeningQuestion } from './types';

function makeReadingQuestion(id: string): TopikQuestion {
  return {
    id,
    type: 'reading',
    passage: `Passage ${id}`,
    question: `Question ${id}`,
    choices: ['A', 'B', 'C', 'D'],
    correctAnswer: 0,
  };
}

function makeListeningQuestion(id: string): TopikListeningQuestion {
  return {
    id,
    type: 'listening',
    audioSrc: `/audio/${id}.mp3`,
    question: `Question ${id}`,
    choices: ['A', 'B', 'C', 'D'],
    correctAnswer: 1,
  };
}

function createBank(readingCount: number, listeningCount: number): QuestionBank {
  return {
    examType: 'topik1',
    reading: Array.from({ length: readingCount }, (_, i) =>
      makeReadingQuestion(`r-${i + 1}`)
    ),
    listening: Array.from({ length: listeningCount }, (_, i) =>
      makeListeningQuestion(`l-${i + 1}`)
    ),
  };
}

describe('selectQuestions', () => {
  it('returns exactly 10 questions (5 reading + 5 listening)', () => {
    const bank = createBank(10, 10);
    const selected = selectQuestions(bank);

    expect(selected).toHaveLength(10);
  });

  it('returns first 5 as reading and last 5 as listening', () => {
    const bank = createBank(10, 10);
    const selected = selectQuestions(bank);

    const readingPart = selected.slice(0, 5);
    const listeningPart = selected.slice(5, 10);

    readingPart.forEach((q) => expect(q.type).toBe('reading'));
    listeningPart.forEach((q) => expect(q.type).toBe('listening'));
  });

  it('returns no duplicate question IDs', () => {
    const bank = createBank(10, 10);
    const selected = selectQuestions(bank);

    const ids = selected.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('selects from the provided bank (all IDs come from the bank)', () => {
    const bank = createBank(10, 10);
    const allIds = [...bank.reading, ...bank.listening].map((q) => q.id);
    const selected = selectQuestions(bank);

    selected.forEach((q) => {
      expect(allIds).toContain(q.id);
    });
  });

  it('produces different orderings across calls (randomness)', () => {
    const bank = createBank(20, 20);
    const results = Array.from({ length: 10 }, () =>
      selectQuestions(bank).map((q) => q.id)
    );

    // With 20 questions and random shuffle, it's extremely unlikely
    // all 10 calls produce the same first 5 reading IDs
    const uniqueFirstIds = new Set(results.map((r) => r.slice(0, 5).join(',')));
    expect(uniqueFirstIds.size).toBeGreaterThan(1);
  });

  it('works with exactly 5 reading and 5 listening questions', () => {
    const bank = createBank(5, 5);
    const selected = selectQuestions(bank);

    expect(selected).toHaveLength(10);
    expect(selected.slice(0, 5).every((q) => q.type === 'reading')).toBe(true);
    expect(selected.slice(5, 10).every((q) => q.type === 'listening')).toBe(true);
  });
});
