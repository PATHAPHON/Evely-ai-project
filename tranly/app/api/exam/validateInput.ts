import {
  isValidExamCategory,
  isValidExamLevel,
  type ExamCategory,
  type ExamLevel,
} from '@/app/exam/_lib/types';

const MAX_TOPIC_LENGTH = 60;

export interface ExamRequest {
  category: ExamCategory;
  /** Optional stage topic constraining the exam content */
  topic?: string;
  /** 5 (stage exam) or 10 (full exam, default) */
  questionCount: number;
  /** Optional array of question texts to exclude for preventing duplication */
  excludeTexts?: string[];
  /** When provided, forces the exam to be written at this exact level */
  level?: ExamLevel;
}

export function validateInput(body: unknown): ExamRequest | null {
  if (typeof body !== 'object' || body === null) return null;
  const record = body as Record<string, unknown>;

  if (!isValidExamCategory(record.category)) return null;

  let topic: string | undefined;
  if (record.topic !== undefined) {
    if (typeof record.topic !== 'string') return null;
    topic = record.topic.trim();
    if (topic.length === 0 || topic.length > MAX_TOPIC_LENGTH) return null;
  }

  let questionCount = 10;
  if (record.questionCount !== undefined) {
    if (record.questionCount !== 5 && record.questionCount !== 10) return null;
    questionCount = record.questionCount;
  }

  let excludeTexts: string[] | undefined;
  if (record.excludeTexts !== undefined) {
    if (!Array.isArray(record.excludeTexts)) return null;
    if (!record.excludeTexts.every((t) => typeof t === 'string')) return null;
    excludeTexts = record.excludeTexts;
  }

  let level: ExamLevel | undefined;
  if (record.level !== undefined) {
    if (!isValidExamLevel(record.category as ExamCategory, record.level)) return null;
    level = record.level as ExamLevel;
  }

  return { category: record.category, topic, questionCount, excludeTexts, level };
}
