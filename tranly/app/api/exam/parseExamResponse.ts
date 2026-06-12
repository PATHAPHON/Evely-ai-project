import {
  CEFR_LEVELS,
  TOEIC_LEVELS,
  type ExamLevel,
  type ExamQuestion,
} from '@/app/exam/_lib/types';

export interface ParsedExam {
  questions: ExamQuestion[];
  /** Difficulty the AI chose for itself, or null when it omitted/garbled it. */
  level: ExamLevel | null;
}

/**
 * Parse the AI exam-generation response into questions plus the level the AI
 * decided to write at. Survives markdown fences and stray prose around the
 * JSON object. Returns null when no usable question list can be recovered.
 */
export function parseExamResponse(content: string): ParsedExam | null {
  const json = extractJsonObject(content);
  if (!json) return null;

  const record = json as { questions?: unknown; level?: unknown };
  if (!Array.isArray(record.questions)) return null;

  const parsed: ExamQuestion[] = [];
  for (const item of record.questions) {
    const question = normalizeQuestion(item, parsed.length);
    if (question) parsed.push(question);
  }

  if (parsed.length === 0) return null;
  return { questions: parsed, level: normalizeLevel(record.level) };
}

const ALL_LEVELS: string[] = [...CEFR_LEVELS, ...TOEIC_LEVELS];

function normalizeLevel(value: unknown): ExamLevel | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return ALL_LEVELS.includes(trimmed) ? (trimmed as ExamLevel) : null;
}

function extractJsonObject(content: string): unknown {
  const trimmed = content.trim();

  // Direct parse first.
  try {
    return JSON.parse(trimmed);
  } catch {
    // fall through
  }

  // Strip markdown fences / surrounding prose: take first { .. last }.
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(trimmed.slice(start, end + 1));
  } catch {
    return null;
  }
}

function normalizeQuestion(item: unknown, index: number): ExamQuestion | null {
  if (typeof item !== 'object' || item === null) return null;
  const record = item as Record<string, unknown>;

  const type = record.type;
  if (type !== 'reading' && type !== 'listening') return null;

  if (typeof record.question !== 'string' || record.question.trim() === '')
    return null;

  if (
    !Array.isArray(record.choices) ||
    record.choices.length !== 4 ||
    !record.choices.every((c) => typeof c === 'string' && c.trim() !== '')
  )
    return null;

  const correctAnswer = record.correctAnswer;
  if (
    typeof correctAnswer !== 'number' ||
    !Number.isInteger(correctAnswer) ||
    correctAnswer < 0 ||
    correctAnswer > 3
  )
    return null;

  const base = {
    id: `${type}-${index + 1}`,
    question: record.question.trim(),
    choices: record.choices.map((c: string) => c.trim()) as [
      string,
      string,
      string,
      string,
    ],
    correctAnswer,
  };

  if (type === 'reading') {
    if (typeof record.passage !== 'string' || record.passage.trim() === '')
      return null;
    return { ...base, type: 'reading', passage: record.passage.trim() };
  }

  if (typeof record.script !== 'string' || record.script.trim() === '')
    return null;
  return { ...base, type: 'listening', script: record.script.trim() };
}
