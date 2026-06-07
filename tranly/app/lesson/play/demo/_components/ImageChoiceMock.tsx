'use client';

import { useState } from 'react';
import {
  SettingOutlined,
  SoundOutlined,
  ThunderboltFilled,
} from '@ant-design/icons';
import { useLanguagePreference } from '@/app/_lib/useLanguagePreference';
import { useTTS } from '@/app/chat/_lib/useTTS';

/**
 * Static mockup of a Duolingo-style "pick the correct image" multiple-choice
 * screen, reproducing the provided screenshot. This lives only in the demo
 * route — it does not touch the real lesson engine or types. Answer cards use
 * flat colored placeholder blocks instead of real images.
 */

const OPTIONS = ['ห้า', 'เทา', 'สามสิบ', 'แมว'];

const HANGUL = '회색';
const ROMANIZATION = 'hoe saek';
const TRANSLATION = 'สีเทา';

export default function ImageChoiceMock() {
  const { language } = useLanguagePreference();
  const isThai = language === 'thai';
  const { speak } = useTTS('ko-KR');

  const [selected, setSelected] = useState<number | null>(null);
  const [showHint, setShowHint] = useState(false);
  const hasSelection = selected !== null;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Top bar: settings + progress + energy */}
      <div className="flex items-center gap-3 px-4 pt-1">
        <button
          type="button"
          aria-label={isThai ? 'ตั้งค่า' : 'Settings'}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-text-secondary transition-all active:translate-y-[1px] cursor-pointer"
        >
          <SettingOutlined style={{ fontSize: 24 }} />
        </button>

        <div className="h-4 flex-1 overflow-hidden rounded-full bg-[#000]/10 dark:bg-white/10">
          <div className="h-full w-[18%] rounded-full bg-accent-green" />
        </div>

        <div className="flex items-center gap-1.5 font-extrabold text-[#ff4d94]">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#ff4d94] text-white">
            <ThunderboltFilled style={{ fontSize: 16 }} />
          </span>
          <span className="text-xl">20</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-4">
        {/* Heading */}
        <h2
          className="mt-5 text-[28px] font-extrabold leading-tight text-text-primary"
          style={{ fontFamily: 'var(--font-outfit), sans-serif' }}
        >
          {isThai ? 'เลือกภาพที่ถูกต้อง' : 'Pick the correct image'}
        </h2>

        {/* Audio + target word */}
        <div className="mt-6 flex items-center gap-4">
          <button
            type="button"
            onClick={() => speak(HANGUL)}
            aria-label={isThai ? 'เล่นเสียง' : 'Play audio'}
            className="flex h-16 w-16 items-center justify-center rounded-2xl border-3 border-border-color bg-accent-blue text-white shadow-nb-md transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-nb-sm cursor-pointer"
          >
            <SoundOutlined style={{ fontSize: 26 }} />
          </button>

          <div className="relative flex flex-col">
            <span className="text-sm font-bold text-text-secondary">
              {ROMANIZATION}
            </span>
            <button
              type="button"
              onClick={() => setShowHint((v) => !v)}
              aria-label={isThai ? 'ดูคำแปล' : 'Show translation'}
              className="w-fit border-b-3 border-dotted border-border-color pb-1 text-4xl font-extrabold text-text-primary cursor-pointer"
            >
              {HANGUL}
            </button>

            {/* Tap-to-reveal translation tooltip (absolute = no layout shift) */}
            {showHint && (
              <div className="animate-bubble-pop-in absolute left-0 top-full z-10 mt-2 rounded-xl border-3 border-border-color bg-card-bg px-3 py-1.5 text-sm font-bold text-text-primary shadow-nb-sm">
                {TRANSLATION}
              </div>
            )}
          </div>
        </div>

        {/* 2×2 answer grid */}
        <div className="mt-6 grid grid-cols-2 gap-4">
          {OPTIONS.map((label, index) => {
            const isSelected = index === selected;
            return (
              <button
                key={label}
                type="button"
                onClick={() => setSelected(index)}
                className={`flex min-h-[7rem] items-center justify-center rounded-2xl border-3 p-4 text-center transition-all cursor-pointer ${
                  isSelected
                    ? 'border-accent-blue bg-accent-blue/10 shadow-nb-md translate-x-[1px] translate-y-[1px]'
                    : 'border-border-color bg-card-bg shadow-nb-md active:translate-x-[2px] active:translate-y-[2px] active:shadow-nb-sm'
                }`}
              >
                <span className="text-2xl font-extrabold text-text-primary">
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Check button */}
      <div className="border-t-3 border-border-color p-4">
        <button
          type="button"
          disabled={!hasSelection}
          className={`w-full rounded-xl border-3 py-4 text-base font-extrabold uppercase tracking-wider transition-all ${
            hasSelection
              ? 'border-border-color bg-accent-green text-white shadow-nb-md active:translate-x-[2px] active:translate-y-[2px] active:shadow-nb-sm cursor-pointer'
              : 'border-[#000]/15 bg-[#000]/5 text-text-secondary dark:border-white/15 dark:bg-white/5 cursor-not-allowed'
          }`}
        >
          {isThai ? 'ตรวจ' : 'Check'}
        </button>
      </div>
    </div>
  );
}
