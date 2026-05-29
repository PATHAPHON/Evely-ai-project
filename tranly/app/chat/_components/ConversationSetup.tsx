'use client';

import { useCallback, useState } from 'react';
import { BookOutlined, MessageOutlined } from '@ant-design/icons';
import type { ProficiencyLevel, SavedWord, SessionConfig } from '../_lib/types';
import { validateTopic } from '../_lib/validateTopic';
import { validateSessionConfig } from '../_lib/validateSessionConfig';
import { useLanguagePreference } from '@/app/_lib/useLanguagePreference';
import { getCustomAIHeaders } from '@/app/_lib/getCustomAIHeaders';

interface ConversationSetupProps {
  onStart: (config: SessionConfig) => void;
  savedWords: SavedWord[];
  onOpenWordSelector?: () => void;
  selectedWords?: SavedWord[];
}

const PROFICIENCY_OPTIONS: {
  value: ProficiencyLevel;
  labelEn: string;
  labelTh: string;
  description: string;
}[] = [
  { value: 'beginner', labelEn: 'Beginner', labelTh: 'ผู้เริ่มต้น', description: 'TOPIK 1-2' },
  { value: 'intermediate', labelEn: 'Intermediate', labelTh: 'ระดับกลาง', description: 'TOPIK 3-4' },
  { value: 'advanced', labelEn: 'Advanced', labelTh: 'ขั้นสูง', description: 'TOPIK 5-6' },
];

/**
 * Conversation setup form for starting a new AI conversation session.
 * Renders topic input, proficiency level selector, word selection button,
 * and start button. Styled with Neobrutalist design system.
 */
export default function ConversationSetup({
  onStart,
  savedWords,
  onOpenWordSelector,
  selectedWords = [],
}: ConversationSetupProps) {
  const [topic, setTopic] = useState('');
  const [goal, setGoal] = useState('');
  const [proficiencyLevel, setProficiencyLevel] = useState<ProficiencyLevel | null>(null);
  const [isGeneratingTopic, setIsGeneratingTopic] = useState(false);
  const { language } = useLanguagePreference();
  const isThai = language === 'thai';

  const isTopicValid = validateTopic(topic);
  const isFormValid =
    proficiencyLevel !== null &&
    validateSessionConfig({ topic, proficiencyLevel, wordContext: selectedWords, goal });

  const handleStart = useCallback(() => {
    if (!isFormValid || proficiencyLevel === null) return;
    onStart({
      topic: topic.trim(),
      proficiencyLevel,
      wordContext: selectedWords,
      goal: goal.trim(),
    });
  }, [isFormValid, proficiencyLevel, topic, selectedWords, goal, onStart]);

  const handleTopicChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setTopic(e.target.value);
    },
    [],
  );

  const handleLevelSelect = useCallback((level: ProficiencyLevel) => {
    setProficiencyLevel(level);
  }, []);

  const handleSuggestTopic = useCallback(async () => {
    if (selectedWords.length === 0 || isGeneratingTopic) return;
    setIsGeneratingTopic(true);

    try {
      const headers = getCustomAIHeaders();
      const res = await fetch('/api/chat/suggest-topic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({
          words: selectedWords.map((w) => ({ korean: w.korean, thai: w.thai })),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.topic) setTopic(data.topic);
        if (data.goal) setGoal(data.goal);
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'Failed to suggest topic.');
      }
    } catch (e) {
      console.error(e);
      alert('Network error when suggesting topic.');
    } finally {
      setIsGeneratingTopic(false);
    }
  }, [selectedWords, isGeneratingTopic]);

  return (
    <div className="flex flex-col gap-5 p-4">
      {/* Word selection button */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-text-primary">
          {isThai ? 'คำศัพท์ประกอบ' : 'Word Context'}
        </label>
        <button
          type="button"
          onClick={onOpenWordSelector}
          disabled={savedWords.length === 0}
          className={`flex items-center gap-3 w-full rounded-xl border-3 border-border-color px-4 py-3 text-left transition-all cursor-pointer ${
            savedWords.length === 0
              ? 'bg-gray-100 dark:bg-gray-800 text-text-secondary shadow-[4px_4px_0_#d9d9d9] cursor-not-allowed'
              : 'bg-card-bg text-text-primary shadow-nb-md hover:bg-gray-50 dark:hover:bg-[#3d3d5c] active:translate-x-[2px] active:translate-y-[2px] active:shadow-nb-sm'
          }`}
        >
          <BookOutlined style={{ fontSize: 18 }} />
          <span className="flex-1">
            {selectedWords.length > 0
              ? isThai
                ? `เลือกแล้ว ${selectedWords.length} คำ`
                : `${selectedWords.length} word${selectedWords.length > 1 ? 's' : ''} selected`
              : isThai ? 'เลือกคำศัพท์' : 'Select words'}
          </span>
          <span
            className={`rounded-lg border-2 border-border-color px-2 py-0.5 text-xs font-bold ${
              savedWords.length === 0 ? 'bg-gray-200 dark:bg-gray-700 text-text-secondary' : 'bg-accent-yellow text-black'
            }`}
          >
            {savedWords.length}
          </span>
        </button>
      </div>

      {/* Topic input */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label htmlFor="topic-input" className="text-sm font-semibold text-text-primary">
            {isThai ? 'หัวข้อสนทนา' : 'Conversation Topic'}
          </label>
          <button
            type="button"
            onClick={handleSuggestTopic}
            disabled={selectedWords.length === 0 || isGeneratingTopic}
            className={`flex items-center gap-1.5 rounded-lg border-2 border-border-color px-2.5 py-1 text-xs font-bold transition-all ${
              selectedWords.length === 0 || isGeneratingTopic
                ? 'bg-gray-100 dark:bg-gray-800 text-text-secondary cursor-not-allowed opacity-50'
                : 'bg-accent-yellow text-black shadow-nb-sm cursor-pointer hover:bg-[#ffe169] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0_var(--shadow-color)]'
            }`}
          >
            {isGeneratingTopic ? (
              <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-black/30 border-t-black" />
            ) : (
              <span>✨</span>
            )}
            {isGeneratingTopic
              ? (isThai ? 'กำลังแนะนำ...' : 'Suggesting...')
              : (isThai ? 'แนะนำด้วย AI' : 'AI Suggest')}
          </button>
        </div>
        <input
          id="topic-input"
          type="text"
          value={topic}
          onChange={handleTopicChange}
          placeholder={isThai ? 'เช่น สั่งอาหารที่ร้าน, ถามทาง, แนะนำตัว...' : 'e.g. Ordering food, Asking for directions, Self-introduction...'}
          maxLength={100}
          className="w-full rounded-xl border-3 border-border-color bg-card-bg px-4 py-3 text-base text-text-primary shadow-nb-md outline-none placeholder:text-text-secondary focus:shadow-nb-sm dark:focus:shadow-nb-sm focus:translate-x-[2px] focus:translate-y-[2px] transition-all"
        />
        {selectedWords.length === 0 && (
          <span className="text-[11px] text-accent-red font-bold">
            {isThai
              ? '💡 เลือกคำศัพท์ประกอบ (ด้านบน) ก่อน เพื่อใช้ AI แนะนำหัวข้อ'
              : '💡 Select word context above first to use AI suggest'}
          </span>
        )}
        <span className="text-xs text-text-secondary">
          {isThai
            ? `${topic.trim().length}/100 ตัวอักษร (ขั้นต่ำ 2 ตัวอักษร)`
            : `${topic.trim().length}/100 characters (min. 2)`}
        </span>
      </div>

      {/* Goal input (optional) */}
      <div className="flex flex-col gap-2">
        <label htmlFor="goal-input" className="text-sm font-semibold text-text-primary">
          {isThai ? 'เป้าหมายบทสนทนา (ไม่บังคับ)' : 'Conversation Goal (optional)'}
        </label>
        <input
          id="goal-input"
          type="text"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder={isThai ? 'เช่น สั่งกาแฟให้สำเร็จ, จองโต๊ะอาหาร...' : 'e.g. Successfully order a coffee, Book a table...'}
          maxLength={100}
          className="w-full rounded-xl border-3 border-border-color bg-card-bg px-4 py-3 text-base text-text-primary shadow-nb-md outline-none placeholder:text-text-secondary focus:shadow-nb-sm dark:focus:shadow-nb-sm focus:translate-x-[2px] focus:translate-y-[2px] transition-all"
        />
        <span className="text-xs text-text-secondary">
          {isThai
            ? 'เมื่อบรรลุเป้าหมาย AI จะจบบทสนทนาให้เอง'
            : 'When the goal is reached, the AI ends the conversation.'}
        </span>
      </div>

      {/* Proficiency level selector */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-text-primary">
          {isThai ? 'ระดับภาษา' : 'Proficiency Level'}
        </label>
        <div className="flex flex-col gap-2">
          {PROFICIENCY_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleLevelSelect(option.value)}
              className={`w-full rounded-xl border-3 border-border-color px-4 py-3 text-left transition-all cursor-pointer ${
                proficiencyLevel === option.value
                  ? 'bg-accent-green text-white shadow-nb-sm translate-x-[2px] translate-y-[2px]'
                  : 'bg-card-bg text-text-primary shadow-nb-md hover:bg-gray-50 dark:hover:bg-[#3d3d5c] active:translate-x-[2px] active:translate-y-[2px] active:shadow-nb-sm'
              }`}
            >
              <span className="font-semibold">{isThai ? option.labelTh : option.labelEn}</span>
              <span className="ml-2 text-sm opacity-80">({option.description})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Start conversation button */}
      <button
        type="button"
        onClick={handleStart}
        disabled={!isFormValid}
        className={`flex items-center justify-center gap-2 w-full rounded-xl border-3 border-border-color px-4 py-4 text-base font-bold uppercase tracking-wider transition-all ${
          isFormValid
            ? 'bg-accent-green text-white shadow-nb-md cursor-pointer hover:bg-[#49b018] active:translate-x-[2px] active:translate-y-[2px] active:shadow-nb-sm'
            : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 shadow-[4px_4px_0_#d9d9d9] cursor-not-allowed'
        }`}
      >
        <MessageOutlined style={{ fontSize: 18 }} />
        {isThai ? 'เริ่มสนทนา' : 'Start Conversation'}
      </button>
    </div>
  );
}
