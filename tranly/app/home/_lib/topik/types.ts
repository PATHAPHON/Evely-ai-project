// --- TOPIK Exam Practice Types ---

export type TopikExamType = 'topik1' | 'topik2';

export type ExamState = 'selecting' | 'examining' | 'completed';

export interface TopikQuestion {
  id: string;
  type: 'reading';
  /** Korean passage or question context */
  passage: string;
  /** The question prompt in Korean */
  question: string;
  /** 4 answer choices in Korean */
  choices: [string, string, string, string];
  /** Index of the correct answer (0-3) */
  correctAnswer: number;
}

export interface TopikListeningQuestion {
  id: string;
  type: 'listening';
  /** Path to the audio file (relative to public/) */
  audioSrc: string;
  /** The question prompt in Korean (shown on screen) */
  question: string;
  /** 4 answer choices in Korean */
  choices: [string, string, string, string];
  /** Index of the correct answer (0-3) */
  correctAnswer: number;
}

export interface QuestionBank {
  examType: TopikExamType;
  reading: TopikQuestion[];
  listening: TopikListeningQuestion[];
}

export interface UserAnswer {
  questionId: string;
  questionType: 'reading' | 'listening';
  selectedIndex: number;
  correctIndex: number;
  isCorrect: boolean;
}

export interface ExamResult {
  examType: TopikExamType;
  answers: UserAnswer[];
  readingScore: number;
  listeningScore: number;
  totalScore: number;
  totalQuestions: number;
}

// --- Question Bank Grid Types ---

export type FilterValue = 'all' | 'topik1' | 'topik2';

export interface QuestionBankSetMeta {
  /** Unique identifier, e.g. "topik1-set-1" */
  id: string;
  /** Exam type: "topik1" or "topik2" */
  examType: TopikExamType;
  /** Localized set name key used with useStrings() */
  nameKey: string;
  /** Total number of questions in this set */
  questionCount: number;
  /** Difficulty label key, e.g. "beginner", "intermediate" */
  difficultyKey: string;
}
