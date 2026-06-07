'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AudioOutlined, MessageOutlined, ReadOutlined, SendOutlined } from '@ant-design/icons';
import { useLanguagePreference } from '@/app/_lib/useLanguagePreference';
import { useActiveLanguage } from '@/app/_lib/ActiveLanguageContext';
import { LANGUAGE_DISPLAY } from '@/app/_lib/languageDisplay';
import { getCustomAIHeaders } from '@/app/_lib/getCustomAIHeaders';
import { useAIGuide } from '../_lib/useAIGuide';
import { useSTT } from '../_lib/useSTT';
import { speechLangForLanguage } from '../_lib/speechLangForLanguage';
import { validateTopic } from '../_lib/validateTopic';
import type { ProficiencyLevel, SavedWord } from '../_lib/types';
import type { LessonConfig } from '../_lib/lessonTypes';
import type { SessionConfig } from '../_lib/types';
import {
  TypewriterQueueProvider,
  AIBubble,
  UserBubble,
  GuideAnimations,
  ThinkingOverlay,
} from './guideChat';

interface AIGuideProps {
  savedWords: SavedWord[];
  selectedWords: SavedWord[];
  onOpenWordSelector: () => void;
  /** Whether the parent's WordSelector modal is currently open. */
  wordSelectorOpen: boolean;
  onStartChat: (config: SessionConfig) => void;
  onStartLesson: (config: LessonConfig) => void;
}

const PROFICIENCY_OPTIONS: {
  value: ProficiencyLevel;
  labelTh: string;
  labelEn: string;
  description: string;
}[] = [
  { value: 'beginner', labelTh: 'ผู้เริ่มต้น', labelEn: 'Beginner', description: 'TOPIK 1-2' },
  { value: 'intermediate', labelTh: 'ระดับกลาง', labelEn: 'Intermediate', description: 'TOPIK 3-4' },
  { value: 'advanced', labelTh: 'ขั้นสูง', labelEn: 'Advanced', description: 'TOPIK 5-6' },
];


/**
 * Fixed-sequence interview that feels like an AI chat. It asks one question at a
 * time (mode → topic → level → [goal] → words → summary), then hands the
 * collected config to the existing chat or lesson engines via the callbacks.
 */
export default function AIGuide({
  selectedWords,
  onOpenWordSelector,
  wordSelectorOpen,
  onStartChat,
  onStartLesson,
}: AIGuideProps) {
  const { language } = useLanguagePreference();
  const isThai = language === 'thai';
  const { activeLanguage } = useActiveLanguage();
  const langDisplay = LANGUAGE_DISPLAY[activeLanguage];
  const topicExamples = ['การทักทาย', langDisplay.topicExampleTh, 'ตัวเลข', 'ช้อปปิ้ง', 'การเดินทาง'];
  const guide = useAIGuide(activeLanguage);
  const { answers, currentStep, answeredSteps } = guide;

  // One shared chat-style input drives every step. Tapping a quick-reply option
  // fills this draft; pressing send commits it as the answer and advances. This
  // makes the whole guide feel like a back-and-forth chat.
  const [draft, setDraft] = useState('');
  const [isCurrentStepCompleted, setIsCurrentStepCompleted] = useState(false);

  // Auto-focus the input field on the topic step once it is completed/revealed
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (isCurrentStepCompleted && currentStep === 'topic') {
      const t = setTimeout(() => {
        inputRef.current?.focus();
      }, 150); // Small delay to let the spring bounce animation start smoothly
      return () => clearTimeout(t);
    }
  }, [isCurrentStepCompleted, currentStep]);

  // Clear the draft and reset completion state whenever the step changes so each question starts empty.
  useEffect(() => {
    setIsCurrentStepCompleted(false);
    setDraft('');
  }, [currentStep]);

  // After the learner confirms the summary, the mascot "thinks" for a beat
  // before we hand off to the chat/lesson engine, so the transition feels like
  // the AI is preparing rather than jumping abruptly.
  const [isThinking, setIsThinking] = useState(false);
  const thinkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear the pending think-timer if the component unmounts mid-countdown.
  useEffect(() => {
    return () => {
      if (thinkTimer.current) clearTimeout(thinkTimer.current);
    };
  }, []);

  // Voice input for the quick-chat bar, mirroring the active-chat ChatInput.
  const {
    startListening,
    stopListening,
    isListening,
    transcript,
    isSupported: sttSupported,
  } = useSTT();
  const speechLang = speechLangForLanguage(activeLanguage);

  // Fold dictated speech into the shared input as it arrives.
  useEffect(() => {
    if (transcript) {
      setDraft((prev) => (prev ? `${prev} ${transcript}` : transcript).slice(0, 100));
    }
  }, [transcript]);

  const handleMicClick = useCallback(() => {
    if (isListening) stopListening();
    else startListening(speechLang);
  }, [isListening, startListening, stopListening, speechLang]);

  // The word selector is auto-opened by the words-step bubble's onDone, once
  // its typing animation finishes — see the `currentStep === 'words'` render
  // below. A ref guards against reopening it more than once per visit.
  const wordsAutoOpened = useRef(false);
  useEffect(() => {
    if (currentStep !== 'words') wordsAutoOpened.current = false;
  }, [currentStep]);
  const handleWordsBubbleDone = useCallback(() => {
    setIsCurrentStepCompleted(true);
    if (wordsAutoOpened.current) return;
    wordsAutoOpened.current = true;
    onOpenWordSelector();
  }, [onOpenWordSelector]);

  // Pressing "Done" in the WordSelector closes it — on the words step that
  // counts as the answer, so advance immediately rather than making the learner
  // confirm a second time. We only fire on a genuine open→close transition.
  const wordsSelectorWasOpen = useRef(false);
  useEffect(() => {
    if (currentStep !== 'words') {
      wordsSelectorWasOpen.current = false;
      return;
    }
    if (wordSelectorOpen) {
      wordsSelectorWasOpen.current = true;
    } else if (wordsSelectorWasOpen.current) {
      wordsSelectorWasOpen.current = false;
      guide.skip();
    }
  }, [currentStep, wordSelectorOpen, guide]);

  // Quick-reply options per step. Tapping one fills the shared input with its
  // label; the value is what gets committed when the learner presses send.
  const modeReplies = [
    { label: isThai ? '💬 แชทกับ AI' : '💬 Chat with AI', value: 'chat' as const },
    { label: isThai ? '📚 ทำบทเรียน' : '📚 Take a lesson', value: 'lesson' as const },
  ];
  const levelReplies = PROFICIENCY_OPTIONS.map((o) => ({
    label: isThai ? o.labelTh : o.labelEn,
    value: o.value,
    hint: langDisplay.proficiency[o.value],
  }));

  // Whether the current draft is a valid answer for the active step. Enum steps
  // (mode/level) require the draft to match one of the offered labels — which
  // tapping a quick-reply guarantees — while topic accepts any valid free text.
  const trimmed = draft.trim();
  const canSend =
    currentStep === 'topic'
      ? validateTopic(draft)
      : currentStep === 'mode'
        ? modeReplies.some((r) => r.label === trimmed)
        : currentStep === 'level'
          ? levelReplies.some((r) => r.label === trimmed)
          : false;

  // Commit the draft as the current step's answer and advance. The transcript
  // bubble for the answered step then renders automatically.
  const handleSend = useCallback(() => {
    const text = draft.trim();
    if (currentStep === 'topic') {
      if (!validateTopic(text)) return;
      guide.answer({ topic: text });
    } else if (currentStep === 'mode') {
      const match = modeReplies.find((r) => r.label === text);
      if (!match) return;
      guide.answer({ mode: match.value });
    } else if (currentStep === 'level') {
      const match = levelReplies.find((r) => r.label === text);
      if (!match) return;
      guide.answer({ level: match.value });
    }
    setDraft('');
  }, [draft, currentStep, guide, modeReplies, levelReplies]);



  const handleConfirm = useCallback(() => {
    const outcome = guide.buildOutcome();
    if (!outcome) return;
    setIsThinking(true);
    if (outcome.kind === 'lesson') {
      onStartLesson({ ...outcome.config, wordContext: selectedWords });
    } else {
      onStartChat({ ...outcome.config, wordContext: selectedWords });
    }
  }, [guide, selectedWords, onStartChat, onStartLesson]);

  const levelLabel = (value: ProficiencyLevel | null) =>
    PROFICIENCY_OPTIONS.find((o) => o.value === value)?.[isThai ? 'labelTh' : 'labelEn'] ?? '';

  return (
    <TypewriterQueueProvider>
    <div className="flex flex-1 flex-col min-h-0 relative">
      <GuideAnimations />
      <div className={`flex flex-1 flex-col gap-3 overflow-y-auto p-4 pt-16 ${isThinking ? 'animate-absorb' : ''}`}>
      {/* Greeting */}
      <AIBubble animate>
        {isThai
          ? '👋 สวัสดี! ฉันจะช่วยจัดการเรียนให้เหมาะกับคุณ ตอบคำถามทีละข้อได้เลยนะ'
          : "👋 Hi! I'll set up the right practice for you — just answer a few quick questions."}
      </AIBubble>

      {/* ===== Transcript of answered steps (rendered in question order) ===== */}
      {answeredSteps.includes('mode') && (
        <>
          <AIBubble>{isThai ? 'อยากเรียนแบบไหนดี?' : 'What would you like to do?'}</AIBubble>
          <UserBubble>
            {answers.mode === 'chat'
              ? isThai ? '💬 แชทกับ AI' : '💬 Chat with AI'
              : isThai ? '📚 ทำบทเรียน' : '📚 Take a lesson'}
          </UserBubble>
        </>
      )}
      {answeredSteps.includes('words') && (
        <>
          <AIBubble>{isThai ? 'ใช้คำศัพท์ที่บันทึกไว้ไหม?' : 'Use your saved words?'}</AIBubble>
          <UserBubble>
            {selectedWords.length > 0
              ? isThai ? `${selectedWords.length} คำ` : `${selectedWords.length} words`
              : isThai ? 'ไม่ใช้' : 'None'}
          </UserBubble>
        </>
      )}
      {answeredSteps.includes('topic') && (
        <>
          <AIBubble>{isThai ? 'อยากเรียนเรื่องอะไร?' : 'What topic?'}</AIBubble>
          <UserBubble>{answers.topic}</UserBubble>
        </>
      )}
      {answeredSteps.includes('level') && (
        <>
          <AIBubble>{isThai ? 'ระดับไหนดี?' : 'Which level?'}</AIBubble>
          <UserBubble>{levelLabel(answers.level)}</UserBubble>
        </>
      )}

      {/* ===== Current question ===== */}
      {currentStep === 'mode' && (
        <AIBubble animate onDone={() => setIsCurrentStepCompleted(true)}>
          {isThai ? 'อยากเรียนแบบไหนดี?' : 'What would you like to do?'}
        </AIBubble>
      )}

      {currentStep === 'topic' && (
        <AIBubble animate onDone={() => setIsCurrentStepCompleted(true)}>
          {selectedWords.length > 0
            ? isThai
              ? 'อยากเรียนเรื่องอะไรดี? จะให้ AI แนะนำหัวข้อจากคำศัพท์ที่เลือกก็ได้นะ'
              : 'What topic? I can suggest one based on your selected words.'
            : answers.mode === 'chat'
              ? isThai ? 'อยากคุยเรื่องอะไรดี?' : 'What would you like to chat about?'
              : isThai ? 'อยากเรียนเรื่องอะไร?' : 'What topic do you want to learn?'}
        </AIBubble>
      )}

      {currentStep === 'level' && (
        <AIBubble animate onDone={() => setIsCurrentStepCompleted(true)}>
          {isThai ? 'ระดับไหนดี?' : 'Which level?'}
        </AIBubble>
      )}

      {currentStep === 'words' && (
        <>
          <AIBubble animate onDone={handleWordsBubbleDone}>
            {isThai
              ? 'อยากใช้คำศัพท์ที่บันทึกไว้ประกอบไหม? (ข้ามได้)'
              : 'Want to include your saved words? (optional)'}
          </AIBubble>
          {/* If the learner dismissed the selector without it advancing, offer a
              quick way to reopen it. Pressing "Done" inside advances the flow. */}
          {isCurrentStepCompleted && (
            <button
              type="button"
              onClick={onOpenWordSelector}
              className="self-start rounded-xl border-3 border-border-color bg-card-bg px-4 py-3 font-semibold text-text-primary shadow-nb-md transition-all cursor-pointer hover:bg-gray-50 dark:hover:bg-[#3d3d5c] active:translate-x-[2px] active:translate-y-[2px] active:shadow-nb-sm animate-slide-up-bounce"
            >
              {selectedWords.length > 0
                ? isThai
                  ? `เลือกแล้ว ${selectedWords.length} คำ — แก้ไข`
                  : `${selectedWords.length} selected — edit`
                : isThai
                  ? 'เลือกคำศัพท์'
                  : 'Choose words'}
            </button>
          )}
        </>
      )}

      {currentStep === 'summary' && (
        <>
          <AIBubble animate onDone={() => setIsCurrentStepCompleted(true)}>
            {isThai ? 'เยี่ยม! สรุปข้อมูลตามนี้นะ 👇' : 'Great! Here is the summary 👇'}
          </AIBubble>
          {isCurrentStepCompleted && (
            <div className="flex flex-col gap-3 animate-slide-up-bounce w-full">
              <div className="rounded-2xl border-3 border-border-color bg-card-bg p-4 shadow-nb-md">
                <dl className="flex flex-col gap-1.5 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="font-semibold text-text-secondary">{isThai ? 'รูปแบบ' : 'Mode'}</dt>
                    <dd className="font-bold text-text-primary">
                      {answers.mode === 'chat' ? (isThai ? 'แชท' : 'Chat') : (isThai ? 'บทเรียน' : 'Lesson')}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="font-semibold text-text-secondary">{isThai ? 'หัวข้อ' : 'Topic'}</dt>
                    <dd className="font-bold text-text-primary">{answers.topic}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="font-semibold text-text-secondary">{isThai ? 'ระดับ' : 'Level'}</dt>
                    <dd className="font-bold text-text-primary">{levelLabel(answers.level)}</dd>
                  </div>
                  {selectedWords.length > 0 && (
                    <div className="flex justify-between gap-3">
                      <dt className="font-semibold text-text-secondary">{isThai ? 'คำศัพท์' : 'Words'}</dt>
                      <dd className="font-bold text-text-primary">{selectedWords.length}</dd>
                    </div>
                  )}
                </dl>
              </div>
              {!isThinking && (
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="flex items-center justify-center gap-2 rounded-xl border-3 border-border-color bg-accent-green px-4 py-4 text-base font-bold uppercase tracking-wider text-white shadow-nb-md transition-all cursor-pointer active:translate-x-[2px] active:translate-y-[2px] active:shadow-nb-sm"
                >
                  {answers.mode === 'lesson' ? (
                    <>
                      <ReadOutlined style={{ fontSize: 18 }} />
                      {isThai ? 'สร้างบทเรียน' : 'Create Lesson'}
                    </>
                  ) : (
                    <>
                      <MessageOutlined style={{ fontSize: 18 }} />
                      {isThai ? 'เริ่มแชท' : 'Start Chat'}
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </>
      )}

      {/* Footer controls */}
      {isCurrentStepCompleted && currentStep !== 'mode' && !isThinking && (
        <div className="flex items-center pt-2 animate-fade-in">
          <button
            type="button"
            onClick={guide.back}
            className="text-sm font-bold text-text-secondary underline cursor-pointer"
          >
            {isThai ? '← ย้อนกลับ' : '← Back'}
          </button>
        </div>
      )}
      </div>

      {/* Unified chat-style input bar pinned to the bottom. Every question step
          shares it: quick-reply options sit above the input and *fill* it when
          tapped, then pressing send commits the answer and advances — so the
          guide reads like a real back-and-forth chat. */}
      {isCurrentStepCompleted &&
        (currentStep === 'mode' ||
          currentStep === 'topic' ||
          currentStep === 'level') && (
        <div className="p-3 pt-1 animate-slide-up-bounce">
          {/* ===== Quick-reply options for the active step ===== */}
          {currentStep === 'mode' && (
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {modeReplies.map((r, idx) => {
                const selected = trimmed === r.label;
                return (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setDraft(r.label)}
                    style={{ animationDelay: `${idx * 60}ms` }}
                    className={`flex items-center gap-1.5 rounded-xl border-3 border-border-color px-3.5 py-2 text-sm font-bold shadow-nb-sm transition-all cursor-pointer active:translate-x-[1px] active:translate-y-[1px] active:shadow-none animate-button-in ${
                      selected
                        ? 'bg-accent-green text-white'
                        : 'bg-card-bg text-text-primary hover:bg-gray-50 dark:hover:bg-[#3d3d5c]'
                    }`}
                  >
                    {r.value === 'chat' ? (
                      <MessageOutlined style={{ fontSize: 20 }} />
                    ) : (
                      <ReadOutlined style={{ fontSize: 20 }} />
                    )}
                    {r.label}
                  </button>
                );
              })}
            </div>
          )}

          {currentStep === 'topic' && (
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {topicExamples.map((ex, idx) => {
                const delay = idx * 60;
                return (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => setDraft(ex)}
                    style={{ animationDelay: `${delay}ms` }}
                    className={`rounded-lg border-2 border-border-color px-3 py-1.5 text-sm font-bold shadow-nb-sm transition-all cursor-pointer active:translate-x-[1px] active:translate-y-[1px] active:shadow-none animate-button-in ${
                      trimmed === ex
                        ? 'bg-accent-green text-white'
                        : 'bg-card-bg text-text-primary'
                    }`}
                  >
                    {ex}
                  </button>
                );
              })}
            </div>
          )}

          {currentStep === 'level' && (
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {levelReplies.map((r, idx) => {
                const selected = trimmed === r.label;
                return (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setDraft(r.label)}
                    style={{ animationDelay: `${idx * 60}ms` }}
                    className={`flex items-center gap-1.5 rounded-xl border-3 border-border-color px-3.5 py-2 text-sm font-bold shadow-nb-sm transition-all cursor-pointer active:translate-x-[1px] active:translate-y-[1px] active:shadow-none animate-button-in ${
                      selected
                        ? 'bg-accent-green text-white'
                        : 'bg-card-bg text-text-primary hover:bg-gray-50 dark:hover:bg-[#3d3d5c]'
                    }`}
                  >
                    {r.label}
                    <span className="text-sm opacity-70">({r.hint})</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* ===== Shared input row ===== */}
          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-xl border-3 border-border-color bg-card-bg shadow-nb-md">
              <input
                ref={inputRef}
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value.slice(0, 100))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && canSend) handleSend();
                }}
                maxLength={100}
                readOnly={currentStep !== 'topic'}
                placeholder={
                  currentStep === 'topic'
                    ? isThai ? 'พิมพ์หัวข้อ หรือแตะตัวอย่างด้านบน...' : 'Type a topic or tap an example...'
                    : currentStep === 'mode'
                      ? isThai ? 'แตะตัวเลือกด้านบน แล้วกดส่ง' : 'Tap an option above, then send'
                      : isThai ? 'แตะระดับด้านบน แล้วกดส่ง' : 'Tap a level above, then send'
                }
                aria-label={isThai ? 'ช่องตอบ' : 'Your answer'}
                className="w-full rounded-xl bg-transparent px-4 py-3 text-base text-text-primary outline-none placeholder:text-text-secondary"
              />
            </div>

            {/* Microphone — only on the free-text topic step, if STT is supported */}
            {currentStep === 'topic' && sttSupported && (
              <button
                type="button"
                onClick={handleMicClick}
                aria-label={isListening ? 'Stop recording' : 'Start recording'}
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-3 border-border-color shadow-nb-md transition-all duration-100 active:translate-y-[2px] active:shadow-[1px_1px_0_var(--shadow-color)] ${
                  isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-card-bg text-text-primary'
                }`}
              >
                <AudioOutlined style={{ fontSize: 20 }} />
              </button>
            )}

            {/* Send — commits the draft as the step's answer */}
            <button
              type="button"
              disabled={!canSend}
              onClick={handleSend}
              aria-label={isThai ? 'ส่ง' : 'Send'}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-3 border-border-color bg-[#4096FF] text-white shadow-nb-md transition-all duration-100 active:translate-y-[2px] active:shadow-[1px_1px_0_var(--shadow-color)] cursor-pointer disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed disabled:shadow-[4px_4px_0_#666666]"
            >
              <SendOutlined style={{ fontSize: 20 }} />
            </button>
          </div>
        </div>
      )}
      {isThinking && (
        <ThinkingOverlay
          title={
            answers.mode === 'lesson'
              ? isThai ? 'กำลังดูดซับข้อมูลเพื่อแต่งบทเรียน...' : 'Absorbing topics to tailor your lesson...'
              : isThai ? 'กำลังเตรียมการสนทนาสำหรับคุณ...' : 'Setting up your conversation...'
          }
          subtitle={isThai ? 'กรุณารอสักครู่นะจ๊ะ' : 'Please wait a moment'}
        />
      )}
    </div>
    </TypewriterQueueProvider>
  );
}
