// --- English Exam Practice Types ---

export type ExamCategory = 'cefr' | 'toeic';

export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2';
export type ToeicLevel = 'easy' | 'medium' | 'hard';
export type ExamLevel = CefrLevel | ToeicLevel;

export interface ExamReadingQuestion {
  id: string;
  type: 'reading';
  /** English passage or question context */
  passage: string;
  /** The question prompt in English */
  question: string;
  /** 4 answer choices */
  choices: [string, string, string, string];
  /** Index of the correct answer (0-3) */
  correctAnswer: number;
}

export interface ExamListeningQuestion {
  id: string;
  type: 'listening';
  /** English script spoken via TTS (not shown to the learner) */
  script: string;
  /** The question prompt shown on screen */
  question: string;
  /** 4 answer choices */
  choices: [string, string, string, string];
  /** Index of the correct answer (0-3) */
  correctAnswer: number;
}

export type ExamQuestion = ExamReadingQuestion | ExamListeningQuestion;

export interface UserAnswer {
  questionId: string;
  questionType: 'reading' | 'listening';
  selectedIndex: number;
  correctIndex: number;
  isCorrect: boolean;
}


/** Row in the Supabase `wrong_questions` table */
export interface WrongQuestionRow {
  id: string;
  user_id: string;
  exam_type: ExamCategory;
  level: ExamLevel;
  question_type: 'reading' | 'listening';
  payload: ExamQuestion;
  explanation: string | null;
  created_at: string;
}

/** Row in the Supabase `exam_sets` table — a generated exam ready to be played at /exam?examId=... */
export interface ExamSetRow {
  id: string;
  user_id: string;
  category: ExamCategory;
  level: ExamLevel;
  topic: string;
  payload: ExamQuestion[];
  created_at: string;
}

export const CEFR_LEVELS: CefrLevel[] = ['A1', 'A2', 'B1', 'B2'];
export const TOEIC_LEVELS: ToeicLevel[] = ['easy', 'medium', 'hard'];

export function isValidExamCategory(value: unknown): value is ExamCategory {
  return value === 'cefr' || value === 'toeic';
}

export function isValidExamLevel(
  category: ExamCategory,
  value: unknown
): value is ExamLevel {
  if (typeof value !== 'string') return false;
  return category === 'cefr'
    ? (CEFR_LEVELS as string[]).includes(value)
    : (TOEIC_LEVELS as string[]).includes(value);
}
