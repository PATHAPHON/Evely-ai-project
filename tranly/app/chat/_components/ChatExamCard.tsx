'use client';

import { useState } from 'react';
import { SoundOutlined, ReloadOutlined, BulbOutlined, LoadingOutlined } from '@ant-design/icons';
import { useTTS } from '@/app/chat/_lib/useTTS';
import { getCustomAIHeaders } from '@/app/_lib/getCustomAIHeaders';
import type { ExamQuestion, UserAnswer } from '@/app/exam/_lib/types';

interface ChatExamCardProps {
  questions: ExamQuestion[];
  category: 'cefr' | 'toeic';
  level: string;
  onSaveRecord: (question: ExamQuestion, isCorrect: boolean) => Promise<void>;
  onAddWrongQuestion: (question: ExamQuestion) => Promise<void>;
  onFinishExam: (score: number, total: number) => void;
}

export default function ChatExamCard({
  questions,
  category,
  level,
  onSaveRecord,
  onAddWrongQuestion,
  onFinishExam,
}: ChatExamCardProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [answers, setAnswers] = useState<UserAnswer[]>([]);
  const [hasPlayedAudio, setHasPlayedAudio] = useState(false);
  const [isExplaining, setIsExplaining] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [explainError, setExplainError] = useState(false);

  const { speak, stop, isSpeaking } = useTTS('en-US');

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;
  const isListening = currentQuestion?.type === 'listening';

  const currentAnswer = answers.find((a) => a.questionId === currentQuestion?.id);
  const isAnswered = currentAnswer !== undefined;
  const isLastQuestion = currentIndex === totalQuestions - 1;

  const handlePlayAudio = () => {
    if (currentQuestion.type !== 'listening') return;
    setHasPlayedAudio(true);
    speak(currentQuestion.script);
  };

  const handleExplain = async () => {
    if (!currentAnswer || isExplaining) return;
    setIsExplaining(true);
    setExplainError(false);
    try {
      const response = await fetch('/api/exam/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getCustomAIHeaders() },
        body: JSON.stringify({
          context:
            currentQuestion.type === 'reading'
              ? currentQuestion.passage
              : currentQuestion.script,
          question: currentQuestion.question,
          choices: currentQuestion.choices,
          correctIndex: currentQuestion.correctAnswer,
          selectedIndex: currentAnswer.selectedIndex,
        }),
      });
      const data = await response.json();
      if (!response.ok || typeof data?.explanation !== 'string') {
        throw new Error('Explain failed');
      }
      setExplanation(data.explanation);
    } catch (err) {
      console.error(err);
      setExplainError(true);
    } finally {
      setIsExplaining(false);
    }
  };

  const handleSubmit = async () => {
    if (selectedChoice === null || isAnswered) return;

    const isCorrect = selectedChoice === currentQuestion.correctAnswer;
    const newAnswer: UserAnswer = {
      questionId: currentQuestion.id,
      questionType: currentQuestion.type,
      selectedIndex: selectedChoice,
      correctIndex: currentQuestion.correctAnswer,
      isCorrect,
    };

    setAnswers((prev) => [...prev, newAnswer]);

    // Save to user exam history in database
    void onSaveRecord(currentQuestion, isCorrect);

    // Save to wrong questions if incorrect
    if (!isCorrect) {
      void onAddWrongQuestion(currentQuestion);
    }
  };

  const handleNext = () => {
    stop();
    if (isLastQuestion) {
      const correctCount = answers.filter((a) => a.isCorrect).length;
      onFinishExam(correctCount, totalQuestions);
    } else {
      setCurrentIndex((prev) => prev + 1);
      setSelectedChoice(null);
      setHasPlayedAudio(false);
      setExplanation(null);
      setExplainError(false);
    }
  };

  const getChoiceStyle = (index: number) => {
    if (!isAnswered) {
      return index === selectedChoice
        ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
        : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-[#202124] hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200';
    }

    if (index === currentQuestion.correctAnswer) {
      return 'border-green-500 bg-green-50/50 dark:bg-green-950/20 text-green-700 dark:text-green-300';
    }

    if (index === currentAnswer.selectedIndex) {
      return 'border-red-500 bg-red-50/50 dark:bg-red-950/20 text-red-700 dark:text-red-300';
    }

    return 'border-gray-100 dark:border-gray-800/40 bg-white dark:bg-[#202124] opacity-50 text-gray-400 dark:text-gray-600';
  };

  if (!currentQuestion) return null;

  return (
    <div className="w-full max-w-xl mx-auto rounded-3xl border border-gray-200/60 dark:border-gray-800/40 bg-white dark:bg-[#1e1f20] p-6 shadow-sm flex flex-col gap-5 text-left transition-all duration-300">
      
      {/* Header and Progress Indicator */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800/40">
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
            {isListening ? '🎧 listening' : '📖 reading'}
          </span>
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            {category} · {level}
          </span>
        </div>
        <span className="text-sm font-semibold text-gray-500">
          ข้อที่ {currentIndex + 1} จาก {totalQuestions}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden">
        <div
          className="bg-blue-500 h-full transition-all duration-300"
          style={{ width: `${((currentIndex + (isAnswered ? 1 : 0)) / totalQuestions) * 100}%` }}
        />
      </div>

      {/* Passage (for reading) or Audio Play (for listening) */}
      {currentQuestion.type === 'reading' ? (
        <div className="rounded-2xl bg-[#f8f9fa] dark:bg-[#202124] p-4 border border-gray-100 dark:border-gray-800/50">
          <p className="text-base leading-relaxed text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans">
            {currentQuestion.passage}
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-6 rounded-2xl bg-[#f8f9fa] dark:bg-[#202124] border border-gray-100 dark:border-gray-800/50 gap-3">
          <button
            type="button"
            onClick={handlePlayAudio}
            className={`flex items-center justify-center gap-2 px-6 py-3 rounded-full font-semibold text-white shadow-sm transition-all duration-200 cursor-pointer ${
              isSpeaking ? 'bg-green-600 animate-pulse' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {hasPlayedAudio ? (
              <ReloadOutlined style={{ fontSize: 16 }} />
            ) : (
              <SoundOutlined style={{ fontSize: 16 }} />
            )}
            <span>{hasPlayedAudio ? 'ฟังซ้ำอีกครั้ง' : 'กดฟังเสียงอ่าน'}</span>
          </button>
          <span className="text-xs text-gray-400 font-medium">
            (เปิดเสียงลำโพงหรือใส่หูฟังเพื่อฟังข้อสอบ)
          </span>
        </div>
      )}

      {/* Question Text */}
      <p className="text-lg font-bold text-gray-950 dark:text-white leading-snug">
        {currentQuestion.question}
      </p>

      {/* Choices Grid */}
      <div className="flex flex-col gap-3">
        {currentQuestion.choices.map((choice, index) => (
          <button
            key={index}
            type="button"
            disabled={isAnswered}
            onClick={() => setSelectedChoice(index)}
            className={`w-full rounded-2xl border px-4 py-3.5 text-left text-base font-medium transition-all flex items-center justify-between gap-3 ${getChoiceStyle(
              index
            )} ${!isAnswered ? 'cursor-pointer active:scale-[0.99]' : ''}`}
          >
            <span className="flex items-center gap-3">
              <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-gray-300/60 text-xs font-bold">
                {String.fromCharCode(65 + index)}
              </span>
              <span className="leading-tight">{choice}</span>
            </span>
          </button>
        ))}
      </div>

      {/* Answer Feedback & Explanation */}
      {isAnswered && (
        <div
          className={`rounded-2xl p-4 border transition-all duration-300 flex flex-col gap-2 ${
            currentAnswer.isCorrect
              ? 'border-green-300/40 bg-green-500/5 dark:bg-green-500/10'
              : 'border-red-300/40 bg-red-500/5 dark:bg-red-500/10'
          }`}
        >
          <p
            className={`text-base font-bold flex items-center gap-1.5 ${
              currentAnswer.isCorrect ? 'text-green-600' : 'text-red-500'
            }`}
          >
            {currentAnswer.isCorrect ? '✓ ถูกต้อง!' : '✗ ยังไม่ถูกนะ'}
          </p>

          {explanation ? (
            <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300 whitespace-pre-wrap mt-1">
              {explanation}
            </p>
          ) : (
            <button
              type="button"
              disabled={isExplaining}
              onClick={handleExplain}
              className="self-start mt-2 px-4 py-2 rounded-xl text-xs font-bold border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#202124] hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              {isExplaining ? (
                <>
                  <LoadingOutlined spin />
                  <span>กำลังดึงคำอธิบาย...</span>
                </>
              ) : (
                <>
                  <BulbOutlined />
                  <span>ดูเฉลยคำอธิบายจาก AI</span>
                </>
              )}
            </button>
          )}

          {explainError && (
            <p className="text-xs font-semibold text-red-500 mt-1">
              เกิดข้อผิดพลาดในการโหลดคำอธิบาย กรุณาลองใหม่อีกครั้ง
            </p>
          )}
        </div>
      )}

      {/* Action Button: Submit or Next */}
      {!isAnswered ? (
        <button
          type="button"
          disabled={selectedChoice === null}
          onClick={handleSubmit}
          className={`mt-2 w-full rounded-2xl py-4 text-base font-bold transition-all ${
            selectedChoice !== null
              ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm cursor-pointer'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
          }`}
        >
          ตรวจคำตอบ
        </button>
      ) : (
        <button
          type="button"
          onClick={handleNext}
          className="mt-2 w-full rounded-2xl bg-blue-600 hover:bg-blue-700 text-white py-4 text-base font-bold shadow-sm transition-all cursor-pointer"
        >
          {isLastQuestion ? 'เสร็จสิ้นการสอบ' : 'ข้อถัดไป'}
        </button>
      )}
    </div>
  );
}
