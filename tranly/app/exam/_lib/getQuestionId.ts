import type { ExamQuestion } from './types';

/**
 * Deterministically generates a stable string ID for an ExamQuestion based on its content.
 * This is used to track user exam history and prevent the same question from repeating.
 */
export function getQuestionId(question: ExamQuestion): string {
  const content = question.type === 'reading' ? question.passage : question.script;
  const raw = `${content}||${question.question}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return `q_${Math.abs(hash).toString(36)}`;
}
