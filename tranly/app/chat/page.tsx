'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { useActiveLanguage } from '@/app/_lib/ActiveLanguageContext';

import { speechLangForLanguage } from './_lib/speechLangForLanguage';
import { useConversationSession } from './_lib/useConversationSession';
import { useTTS } from './_lib/useTTS';
import { useSTT } from './_lib/useSTT';
import ChatList from './_components/ChatList';
import ChatInput from './_components/ChatInput';
import ExamAdvisorOptions from './_components/ExamAdvisorOptions';
import ElephantMascot from './_components/ElephantMascot';
import { useUserProfile } from '@/app/_lib/useUserProfile';
import type { SessionConfig } from './_lib/types';

import { useExamHistory } from '@/app/exam/_lib/useExamHistory';
import { useExamSets } from '@/app/exam/_lib/useExamSets';
import { BulbOutlined } from '@ant-design/icons';
import { useStageProgress } from '@/app/exam/_lib/useStageProgress';
import { EXAM_STAGES, getCurrentStageId } from '@/app/exam/_lib/stages';
import type { ExamLevel } from '@/app/exam/_lib/types';
import { getCustomAIHeaders } from '@/app/_lib/getCustomAIHeaders';
import GeminiLayout from '@/app/_components/GeminiLayout';

/**
 * The "Evely" tab — a full-screen, open-ended chat with Evely.
 *
 * Exams are a chat skill: typing `/exam <topic>` generates an English exam,
 * saves it to `exam_sets`, and drops an "exam-link" card whose button opens
 * the dedicated /exam?examId=... play page.
 */
function ChatPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionParam = searchParams.get('session');

  const { activeLanguage } = useActiveLanguage();
  const { displayName } = useUserProfile();
  const {
    messages: sessionMessages,
    sendMessage: sendSessionMessage,
    retryLastMessage: retrySessionMessage,
    isLoading: isSessionLoading,
    error: sessionError,
    startSession,
    restoreSession,
    addUserMessage,
    addAssistantMessage,
    addExamLinkMessage,
  } = useConversationSession();

  const speechLang = speechLangForLanguage(activeLanguage);
  const { speak } = useTTS(speechLang);

  const {
    startListening,
    stopListening,
    isListening,
    transcript,
    isSupported: sttSupported,
  } = useSTT();

  // Exam history (dedup) + stage progress (level) + exam set persistence
  const examHistory = useExamHistory();
  const stageProgress = useStageProgress();
  const { createExamSet } = useExamSets();

  const [isExamLoading, setIsExamLoading] = useState(false);
  const [examError, setExamError] = useState<string | null>(null);

  // While the exam advisor Q&A is running, user input feeds the advisor
  // (not the normal chat) until it has enough to build the test.
  const [examAdvisorActive, setExamAdvisorActive] = useState(false);
  const advisorHistoryRef = useRef<{ role: 'user' | 'assistant'; content: string }[]>([]);

  // Start a fresh open-ended session.
  const startOpenSession = useCallback(() => {
    const config: SessionConfig = {
      topic: 'พูดคุยทั่วไป',
      goal: '',
      proficiencyLevel: 'beginner',
      wordContext: [],
      language: activeLanguage,
    };
    startSession(config);
  }, [activeLanguage, startSession]);

  // On mount (or when ?session= changes): restore an existing conversation,
  // otherwise begin a brand-new one.
  const restoredRef = useRef<string | null>(null);
  useEffect(() => {
    if (sessionParam) {
      if (restoredRef.current === sessionParam) return;
      restoredRef.current = sessionParam;
      void restoreSession(sessionParam, activeLanguage);
    } else {
      restoredRef.current = null;
      startOpenSession();
    }
  }, [sessionParam, activeLanguage, restoreSession, startOpenSession]);

  // Generate the exam for a negotiated topic/category, persist it, and drop an
  // exam-link card. When level is provided, the exam is forced to that level.
  const generateExam = useCallback(
    async (topic: string, category: 'cefr' | 'toeic', level?: ExamLevel) => {
      setIsExamLoading(true);
      setExamError(null);
      try {
        const response = await fetch('/api/exam', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getCustomAIHeaders() },
          body: JSON.stringify({
            category,
            topic,
            questionCount: 5,
            excludeTexts: examHistory.completedQuestionTexts,
            ...(level ? { level } : {}),
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error?.message ?? 'Failed to generate exam');
        }

        const examId = await createExamSet(
          data.questions,
          data.category,
          data.level,
          topic
        );
        if (!examId) throw new Error('บันทึกข้อสอบไม่สำเร็จ กรุณาลองอีกครั้ง');

        await addExamLinkMessage({
          examId,
          topic,
          count: data.questions.length,
        });
      } catch (err) {
        console.error('Exam generation failed:', err);
        setExamError(
          err instanceof Error
            ? err.message
            : 'เกิดข้อผิดพลาดในการเชื่อมต่อเพื่อสร้างข้อสอบ'
        );
      } finally {
        setIsExamLoading(false);
      }
    },
    [examHistory.completedQuestionTexts, addExamLinkMessage, createExamSet]
  );

  // One turn of the exam advisor: ask the AI what kind of exam the user wants
  // (it returns a Thai reply + tappable chips). Once it's ready, build the test.
  const runAdvisorTurn = useCallback(
    async (userText: string) => {
      advisorHistoryRef.current.push({ role: 'user', content: userText });
      setIsExamLoading(true);
      setExamError(null);
      try {
        const response = await fetch('/api/exam/negotiate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getCustomAIHeaders() },
          body: JSON.stringify({ messages: advisorHistoryRef.current }),
        });
        if (!response.ok) {
          const e = await response.json().catch(() => null);
          throw new Error(e?.error ?? 'ไม่สามารถเตรียมข้อสอบได้ กรุณาลองอีกครั้ง');
        }
        const data = await response.json();
        advisorHistoryRef.current.push({ role: 'assistant', content: data.reply });

        // Quick exam is always cefr at the user's current stage level.
        const currentStageId = getCurrentStageId(stageProgress.completedStageIds);
        const currentStage =
          EXAM_STAGES.find((s) => s.id === currentStageId) || EXAM_STAGES[0];
        const topic =
          (typeof data.topic === 'string' && data.topic.trim()) ||
          currentStage.topic;

        if (data.readyToStart) {
          setExamAdvisorActive(false);
          advisorHistoryRef.current = [];
          if (data.reply) await addAssistantMessage(data.reply);
          await generateExam(topic, 'cefr', currentStage.level);
        } else {
          await addAssistantMessage(
            data.reply,
            Array.isArray(data.suggestions) ? data.suggestions : []
          );
        }
      } catch (err) {
        console.error('Exam advisor failed:', err);
        setExamError(
          err instanceof Error
            ? err.message
            : 'เกิดข้อผิดพลาดในการเชื่อมต่อ'
        );
      } finally {
        setIsExamLoading(false);
      }
    },
    [stageProgress.completedStageIds, addAssistantMessage, generateExam]
  );

  // Enter exam-advisor mode: the AI asks first, then builds the test.
  const runExamSkill = useCallback(
    async (topic: string, commandText: string) => {
      await addUserMessage(commandText);
      setExamAdvisorActive(true);
      advisorHistoryRef.current = [];
      await runAdvisorTurn(topic || 'อยากทำข้อสอบภาษาอังกฤษ');
    },
    [addUserMessage, runAdvisorTurn]
  );

  // Send router: while the advisor is active, input feeds it; otherwise a
  // leading "/exam" starts the advisor and everything else is normal chat.
  const handleSendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      if (examAdvisorActive) {
        await addUserMessage(trimmed);
        await runAdvisorTurn(trimmed);
        return;
      }

      if (/^\/exam\b/i.test(trimmed)) {
        const topic = trimmed.replace(/^\/exam/i, '').trim();
        await runExamSkill(topic, trimmed);
      } else {
        await sendSessionMessage(trimmed);
      }
    },
    [examAdvisorActive, addUserMessage, runAdvisorTurn, sendSessionMessage, runExamSkill]
  );

  // "ข้าม": stop answering and let the advisor proceed to build the exam.
  const handleAdvisorSkip = useCallback(() => {
    void handleSendMessage('เริ่มเลย');
  }, [handleSendMessage]);

  // Suggested replies for latest AI message
  const lastMessage = sessionMessages[sessionMessages.length - 1];
  const currentSuggestions =
    lastMessage && lastMessage.role === 'assistant'
      ? lastMessage.suggestions ?? []
      : [];

  const handleSpeak = useCallback(
    (messageId: string, text?: string) => {
      if (text) {
        speak(text);
        return;
      }
      const message = sessionMessages.find((m) => m.id === messageId);
      if (message && message.korean) {
        speak(message.korean);
      }
    },
    [sessionMessages, speak]
  );

  const handleStartListening = useCallback(() => {
    startListening(speechLang);
  }, [startListening, speechLang]);

  const noopRemoveWord = useCallback(() => {}, []);

  const handleStartExam = useCallback(
    (examId: string) => {
      router.push(`/exam?examId=${examId}`);
    },
    [router]
  );

  // (+) "ทำข้อสอบด่วน": start a brand-new chat (the input then prefills /exam).
  const handleNewExamChat = useCallback(() => {
    if (sessionParam) {
      // Drop ?session= — the mount effect will start a fresh session.
      router.push('/chat');
    } else {
      startOpenSession();
    }
  }, [sessionParam, router, startOpenSession]);

  const isEmptyChat =
    sessionMessages.length === 0 &&
    !isSessionLoading &&
    !isExamLoading &&
    !sessionError &&
    !examError;

  // Reply suggestions a user skipped ("ข้าม") — keyed by message id so the
  // panel stays hidden for that turn but returns on the next AI reply.
  const [dismissedSuggestId, setDismissedSuggestId] = useState<string | null>(null);

  // Track collapsed state for option suggestions
  const [isOptionsCollapsed, setIsOptionsCollapsed] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [inputResetKey, setInputResetKey] = useState(0);

  // Reset collapsed state on new suggestions
  const lastSuggestionsKey = lastMessage ? lastMessage.id : '';
  useEffect(() => {
    setIsOptionsCollapsed(false);
  }, [lastSuggestionsKey]);

  const toggleOptions = useCallback((collapse: boolean) => {
    setIsAnimating(true);
    setTimeout(() => {
      setIsOptionsCollapsed(collapse);
      setIsAnimating(false);
    }, 200); // 200ms smooth animation
  }, []);

  const handleToggleSuggestions = useCallback(() => {
    setInputResetKey((prev) => prev + 1);
    toggleOptions(false);
  }, [toggleOptions]);

  // Whenever the latest AI message has options ready, the input merges with
  // the option list into a single expanding card (advisor and normal chat).
  const optionsMode =
    currentSuggestions.length > 0 &&
    !(isSessionLoading || isExamLoading) &&
    (examAdvisorActive ||
      (lastMessage != null && dismissedSuggestId !== lastMessage.id));

  // "ข้าม": the advisor proceeds to build the exam; a normal chat just
  // dismisses the options and shows the plain input again.
  const handleOptionsSkip = useCallback(() => {
    if (examAdvisorActive) {
      handleAdvisorSkip();
    } else if (lastMessage) {
      setDismissedSuggestId(lastMessage.id);
    }
  }, [examAdvisorActive, handleAdvisorSkip, lastMessage]);

  const chatInput = (
    <ChatInput
      onSend={handleSendMessage}
      isLoading={isSessionLoading || isExamLoading}
      sttSupported={sttSupported}
      isListening={isListening}
      onStartListening={handleStartListening}
      onStopListening={stopListening}
      transcript={transcript}
      selectedWords={[]}
      onRemoveWord={noopRemoveWord}
      skillsEnabled
      allowInlineSkill={sessionMessages.length === 0}
      onNewExamChat={handleNewExamChat}
      resetKey={inputResetKey}
    />
  );

  return (
    <GeminiLayout onNewChat={() => router.push('/chat')}>
      <div
        className={`flex-1 flex flex-col overflow-hidden relative ${
          isEmptyChat
            ? 'bg-gradient-to-b from-white via-white to-[#d3e3fd] dark:from-[#131314] dark:via-[#131314] dark:to-[#1c2a44]'
            : ''
        }`}
      >
        {isEmptyChat ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-5 px-8 text-center">
            <ElephantMascot state="idle" size={64} />
            <p className="text-2xl font-semibold leading-snug text-gray-900 dark:text-gray-100">
              สวัสดี คุณ {displayName}
              <br />
              จะทำอะไรต่อดี
            </p>
          </div>
        ) : (
          <ChatList
            messages={sessionMessages}
            isLoading={isSessionLoading || isExamLoading}
            error={sessionError || examError}
            onRetry={retrySessionMessage}
            onSpeak={handleSpeak}
            onStartExam={handleStartExam}
          />
        )}

        {/* Floating Gemini-style input area */}
        <div className="px-4 pb-4 pt-1 bg-transparent">
          <div className="max-w-2xl mx-auto">
            <div className={`transition-all duration-200 ease-out transform ${
              isAnimating ? 'opacity-0 translate-y-2 scale-[0.99]' : 'opacity-100 translate-y-0 scale-100'
            }`}>
              {optionsMode && !isOptionsCollapsed ? (
                <div className="rounded-[28px] bg-white dark:bg-[#1e1f20] p-2 shadow-[0_2px_16px_rgba(0,0,0,0.10)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.45)]">
                  <ExamAdvisorOptions
                    options={currentSuggestions.map((s) => ({
                      text: s.korean,
                      subtext: s.translation,
                    }))}
                    onSelect={handleSendMessage}
                    onSkip={handleOptionsSkip}
                    onCollapse={() => toggleOptions(true)}
                    disabled={isSessionLoading || isExamLoading}
                  />
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {optionsMode && isOptionsCollapsed && (
                    <div className="flex justify-center animate-bubble-pop-in">
                      <button
                        type="button"
                        onClick={handleToggleSuggestions}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/30 text-xs font-bold text-blue-700 dark:text-blue-300 hover:bg-blue-100/50 dark:hover:bg-blue-950/45 cursor-pointer shadow-sm"
                      >
                        <BulbOutlined style={{ fontSize: 13 }} />
                        <span>แสดงคำแนะนำตัวเลือกการตอบ</span>
                      </button>
                    </div>
                  )}
                  {chatInput}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </GeminiLayout>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={null}>
      <ChatPageInner />
    </Suspense>
  );
}
