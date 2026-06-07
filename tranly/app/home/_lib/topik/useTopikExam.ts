"use client";

import { useState, useMemo } from "react";
import type {
  TopikExamType,
  ExamState,
  TopikQuestion,
  TopikListeningQuestion,
  UserAnswer,
  ExamResult,
  QuestionBank,
} from "./types";
import topik1Bank from "./topik1Questions.json";
import topik2Bank from "./topik2Questions.json";
import { supabase } from "@/app/_lib/supabaseClient";

/**
 * Shuffles an array using Fisher-Yates algorithm.
 * Returns a new shuffled array without mutating the original.
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Selects 5 random reading + 5 random listening questions from the bank.
 * Returns them in order: reading first, then listening.
 */
export function selectQuestions(
  bank: QuestionBank
): (TopikQuestion | TopikListeningQuestion)[] {
  const reading = shuffleArray(bank.reading).slice(0, 5);
  const listening = shuffleArray(bank.listening).slice(0, 5);
  return [...reading, ...listening];
}

/**
 * Computes the exam result from the user's answers.
 */
export function calculateResult(
  examType: TopikExamType,
  questions: (TopikQuestion | TopikListeningQuestion)[],
  answers: UserAnswer[]
): ExamResult {
  const readingScore = answers.filter(
    (a) => a.questionType === "reading" && a.isCorrect
  ).length;
  const listeningScore = answers.filter(
    (a) => a.questionType === "listening" && a.isCorrect
  ).length;

  return {
    examType,
    answers,
    readingScore,
    listeningScore,
    totalScore: readingScore + listeningScore,
    totalQuestions: 10,
  };
}

/**
 * Hook managing the TOPIK exam state machine.
 *
 * States:
 *  - "selecting" — user chooses TOPIK I or II
 *  - "examining" — user is answering questions
 *  - "completed" — exam is done, show results
 */
export function useTopikExam() {
  const [examState, setExamState] = useState<ExamState>("selecting");
  const [examType, setExamType] = useState<TopikExamType | null>(null);
  const [examSetId, setExamSetId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<
    (TopikQuestion | TopikListeningQuestion)[]
  >([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<UserAnswer[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  /** The currently active question (or undefined if not examining) */
  const currentQuestion = useMemo(
    () => (examState === "examining" ? questions[currentIndex] : undefined),
    [examState, questions, currentIndex]
  );

  /** The computed exam result (available when completed) */
  const result = useMemo<ExamResult | null>(() => {
    if (examState !== "completed" || !examType) return null;
    return calculateResult(examType, questions, answers);
  }, [examState, examType, questions, answers]);

  /**
   * Start the exam with the selected type and optional set ID.
   * When examSetId is provided, questions are filtered to that specific set.
   * Transitions: selecting → examining
   */
  async function startExam(type: TopikExamType, setId?: string): Promise<void> {
    setIsLoading(true);
    setExamType(type);
    setExamSetId(setId ?? null);
    setCurrentIndex(0);
    setAnswers([]);
    
    try {
      let query = supabase
        .from('topik_questions')
        .select('*');

      if (setId) {
        // Filter by the specific exam set ID
        query = query.eq('exam_set_id', setId);
      } else {
        // Fallback: filter by exam type (legacy behaviour)
        query = query.eq('exam_type', type);
      }

      const { data, error } = await query;

      if (error) throw error;

      let dbQuestions: (TopikQuestion | TopikListeningQuestion)[] = [];
      if (data && data.length > 0) {
        dbQuestions = data.map((q: any) => ({
          id: q.id,
          type: q.type as 'reading' | 'listening',
          passage: q.passage || '',
          question: q.question,
          choices: q.choices as [string, string, string, string],
          correctAnswer: q.correct_answer,
          audioSrc: q.audio_src || '',
        }));
      }

      // Check if we have enough questions in the database
      const dbReading = dbQuestions.filter((q) => q.type === 'reading');
      const dbListening = dbQuestions.filter((q) => q.type === 'listening');

      const bank = (type === "topik1" ? topik1Bank : topik2Bank) as QuestionBank;

      // Select 5 reading questions
      let selectedReading: TopikQuestion[] = [];
      if (dbReading.length >= 5) {
        selectedReading = shuffleArray(dbReading).slice(0, 5) as TopikQuestion[];
      } else {
        selectedReading = shuffleArray(bank.reading).slice(0, 5);
      }

      // Select 5 listening questions
      let selectedListening: TopikListeningQuestion[] = [];
      if (dbListening.length >= 5) {
        selectedListening = shuffleArray(dbListening).slice(0, 5) as TopikListeningQuestion[];
      } else {
        selectedListening = shuffleArray(bank.listening).slice(0, 5);
      }

      setQuestions([...selectedReading, ...selectedListening]);
      setExamState("examining");
    } catch (err) {
      console.error('Failed to load TOPIK questions from DB, falling back to JSON:', err);
      const bank = (type === "topik1" ? topik1Bank : topik2Bank) as QuestionBank;
      const selected = selectQuestions(bank);
      setQuestions(selected);
      setExamState("examining");
    } finally {
      setIsLoading(false);
    }
  }


  /**
   * Submit an answer for the current question and advance.
   * If this is the last question, transitions to completed.
   */
  function submitAnswer(selectedIndex: number): void {
    if (examState !== "examining" || !currentQuestion) return;

    const answer: UserAnswer = {
      questionId: currentQuestion.id,
      questionType: currentQuestion.type,
      selectedIndex,
      correctIndex: currentQuestion.correctAnswer,
      isCorrect: selectedIndex === currentQuestion.correctAnswer,
    };

    const updatedAnswers = [...answers, answer];
    setAnswers(updatedAnswers);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Last question answered → completed
      setExamState("completed");
    }
  }

  /**
   * Retry the exam with the same type and same set but new random questions.
   * Transitions: completed → examining
   */
  function retry(): void {
    if (examState !== "completed" || !examType) return;
    startExam(examType, examSetId ?? undefined);
  }

  /**
   * Go back to exam type selection.
   * Transitions: completed → selecting
   */
  function changeType(): void {
    setExamType(null);
    setExamSetId(null);
    setQuestions([]);
    setCurrentIndex(0);
    setAnswers([]);
    setExamState("selecting");
  }

  return {
    // State
    examState,
    examType,
    examSetId,
    questions,
    currentIndex,
    answers,
    isLoading,
    // Derived
    currentQuestion,
    result,
    // Actions
    startExam,
    submitAnswer,
    retry,
    changeType,
  };
}

