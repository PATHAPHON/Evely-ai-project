'use client';

import { useEffect, useRef } from 'react';
import { useTopikExam } from '../../_lib/topik/useTopikExam';
import type { TopikQuestion, TopikListeningQuestion } from '../../_lib/topik/types';

import { useLanguagePreference } from '@/app/_lib/useLanguagePreference';
import QuestionBankGrid from './QuestionBankGrid';
import ReadingQuestion from './ReadingQuestion';
import ListeningQuestion from './ListeningQuestion';
import ScoreSummary from './ScoreSummary';

/**
 * Main TOPIK Practice container.
 *
 * Orchestrates the exam state machine and renders the appropriate
 * sub-component based on the current exam state.
 *
 * - Uses `animate-card-fade-in` for smooth entry animation (Req 8.4)
 * - Matches padding/spacing of other Home tab panels (Req 8.3)
 * - Scrolls to top on question transitions for proper reading position
 */
export default function TopikPractice() {
  const {
    examState,
    currentQuestion,
    currentIndex,
    questions,
    result,
    startExam,
    submitAnswer,
    retry,
    changeType,
  } = useTopikExam();

  const containerRef = useRef<HTMLDivElement>(null);
  const { language } = useLanguagePreference();



  // Scroll to top when the question index changes or exam state transitions
  useEffect(() => {
    if (containerRef.current) {
      // Scroll the nearest scrollable ancestor to top
      const scrollParent = containerRef.current.closest('.overflow-y-auto');
      if (scrollParent) {
        scrollParent.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }, [currentIndex, examState]);


  return (
    <div
      ref={containerRef}
      className="px-4 pb-4 animate-card-fade-in"
    >
      {examState === 'selecting' && (
        <QuestionBankGrid />
      )}

      {examState === 'examining' && currentQuestion && (
        <>
          {currentQuestion.type === 'reading' ? (
            <ReadingQuestion
              question={currentQuestion as TopikQuestion}
              questionNumber={currentIndex + 1}
              totalQuestions={questions.length}
              onAnswer={submitAnswer}
            />
          ) : (
            <ListeningQuestion
              question={currentQuestion as TopikListeningQuestion}
              currentIndex={currentIndex}
              totalQuestions={questions.length}
              onAnswer={submitAnswer}
            />
          )}
        </>
      )}

      {examState === 'completed' && result && (
        <ScoreSummary
          result={result}
          onRetry={retry}
          onChangeType={changeType}
        />
      )}
    </div>
  );
}
