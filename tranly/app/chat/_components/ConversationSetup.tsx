'use client';

import { useCallback, useState } from 'react';
import { BookOutlined, MessageOutlined } from '@ant-design/icons';
import type { ProficiencyLevel, SavedWord, SessionConfig } from '../_lib/types';
import { validateTopic } from '../_lib/validateTopic';
import { validateSessionConfig } from '../_lib/validateSessionConfig';
import { useLanguagePreference } from '@/app/_lib/useLanguagePreference';

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
  const [proficiencyLevel, setProficiencyLevel] = useState<ProficiencyLevel | null>(null);
  const { language } = useLanguagePreference();
  const isThai = language === 'thai';

  const isTopicValid = validateTopic(topic);
  const isFormValid =
    proficiencyLevel !== null &&
    validateSessionConfig({ topic, proficiencyLevel, wordContext: selectedWords });

  const handleStart = useCallback(() => {
    if (!isFormValid || proficiencyLevel === null) return;
    onStart({
      topic: topic.trim(),
      proficiencyLevel,
      wordContext: selectedWords,
    });
  }, [isFormValid, proficiencyLevel, topic, selectedWords, onStart]);

  const handleTopicChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setTopic(e.target.value);
    },
    [],
  );

  const handleLevelSelect = useCallback((level: ProficiencyLevel) => {
    setProficiencyLevel(level);
  }, []);

  return (
    <div className="flex flex-col gap-5 p-4">
      {/* Topic input */}
      <div className="flex flex-col gap-2">
        <label htmlFor="topic-input" className="text-sm font-semibold text-black">
          {isThai ? 'หัวข้อสนทนา' : 'Conversation Topic'}
        </label>
        <input
          id="topic-input"
          type="text"
          value={topic}
          onChange={handleTopicChange}
          placeholder={isThai ? 'เช่น สั่งอาหารที่ร้าน, ถามทาง, แนะนำตัว...' : 'e.g. Ordering food, Asking for directions, Self-introduction...'}
          maxLength={100}
          className="w-full rounded-xl border-3 border-black bg-white px-4 py-3 text-base shadow-[4px_4px_0_#000000] outline-none placeholder:text-gray-400 focus:shadow-[2px_2px_0_#000000] focus:translate-x-[2px] focus:translate-y-[2px] transition-all"
        />
        <span className="text-xs text-gray-500">
          {isThai
            ? `${topic.trim().length}/100 ตัวอักษร (ขั้นต่ำ 2 ตัวอักษร)`
            : `${topic.trim().length}/100 characters (min. 2)`}
        </span>
      </div>

      {/* Proficiency level selector */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-black">
          {isThai ? 'ระดับภาษา' : 'Proficiency Level'}
        </label>
        <div className="flex flex-col gap-2">
          {PROFICIENCY_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleLevelSelect(option.value)}
              className={`w-full rounded-xl border-3 border-black px-4 py-3 text-left transition-all cursor-pointer ${
                proficiencyLevel === option.value
                  ? 'bg-[#52C41A] text-white shadow-[2px_2px_0_#000000] translate-x-[2px] translate-y-[2px]'
                  : 'bg-white text-black shadow-[4px_4px_0_#000000] hover:bg-gray-50 active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_#000000]'
              }`}
            >
              <span className="font-semibold">{isThai ? option.labelTh : option.labelEn}</span>
              <span className="ml-2 text-sm opacity-80">({option.description})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Word selection button */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-black">
          {isThai ? 'คำศัพท์ประกอบ' : 'Word Context'}
        </label>
        <button
          type="button"
          onClick={onOpenWordSelector}
          disabled={savedWords.length === 0}
          className={`flex items-center gap-3 w-full rounded-xl border-3 border-black px-4 py-3 text-left transition-all cursor-pointer ${
            savedWords.length === 0
              ? 'bg-gray-100 text-gray-400 shadow-[4px_4px_0_#d9d9d9] cursor-not-allowed'
              : 'bg-white text-black shadow-[4px_4px_0_#000000] hover:bg-gray-50 active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_#000000]'
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
            className={`rounded-lg border-2 border-black px-2 py-0.5 text-xs font-bold ${
              savedWords.length === 0 ? 'bg-gray-200 text-gray-400' : 'bg-[#FFD93D] text-black'
            }`}
          >
            {savedWords.length}
          </span>
        </button>
      </div>

      {/* Start conversation button */}
      <button
        type="button"
        onClick={handleStart}
        disabled={!isFormValid}
        className={`flex items-center justify-center gap-2 w-full rounded-xl border-3 border-black px-4 py-4 text-base font-bold uppercase tracking-wider transition-all ${
          isFormValid
            ? 'bg-[#52C41A] text-white shadow-[4px_4px_0_#000000] cursor-pointer hover:bg-[#49b018] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_#000000]'
            : 'bg-gray-200 text-gray-400 shadow-[4px_4px_0_#d9d9d9] cursor-not-allowed'
        }`}
      >
        <MessageOutlined style={{ fontSize: 18 }} />
        {isThai ? 'เริ่มสนทนา' : 'Start Conversation'}
      </button>
    </div>
  );
}
