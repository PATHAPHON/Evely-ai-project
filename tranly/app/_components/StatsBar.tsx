"use client";

import { useState, useEffect, useRef } from "react";
import { CalendarOutlined, ThunderboltOutlined } from "@ant-design/icons";
import { useActiveLanguage } from "@/app/_lib/ActiveLanguageContext";
import { useGems } from "@/app/_lib/GemsContext";
import { useStudyHeatmap } from "@/app/profile/_lib/useStudyHeatmap";
import type { TargetLanguage } from "@/app/_lib/wordTypes";

/**
 * Duolingo-style stats bar shown at the top of Home and Library, replacing the
 * plain page title. Four cells: active-language flag, streak, gems, energy.
 *
 * NOTE: The numbers below are temporary placeholders. Only the flag is wired to
 * real state (the active language). When backing data exists, replace these:
 *   - LANG_DAYS -> whatever the leading flag counter should represent
 */
const LANG_DAYS = 7;

const LANGUAGE_FLAGS: Record<TargetLanguage, string> = {
  english: "🇺🇸",
  japanese: "🇯🇵",
  korean: "🇰🇷",
  chinese: "🇨🇳",
};

interface LanguageOption {
  value: TargetLanguage;
  nativeName: string;
}

/** Learning languages available for switching. Currently Korean only. */
const LANGUAGE_OPTIONS: LanguageOption[] = [
  { value: "korean", nativeName: "한국어" },
];

export default function StatsBar() {
  const { activeLanguage, setActiveLanguage } = useActiveLanguage();
  const { gems, energy } = useGems();
  const heatmap = useStudyHeatmap(53);
  const studiedDays = heatmap?.studiedDays ?? 0;
  const flag = LANGUAGE_FLAGS[activeLanguage] ?? "🏳️";
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="flex items-center justify-between px-4 pt-6">
      {/* Active-language flag — tap to switch learning language */}
      <div ref={containerRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label="Switch learning language"
          className="flex items-center gap-1.5 rounded-lg px-1.5 py-1 -mx-1.5 active:scale-95 transition-transform cursor-pointer"
        >
          <span className="text-xl leading-none" aria-hidden>
            {flag}
          </span>
          <span className="font-extrabold tabular-nums text-text-primary">
            {LANG_DAYS}
          </span>
        </button>

        {open && (
          <div
            role="listbox"
            className="absolute top-full left-0 mt-2 min-w-[140px] flex flex-col gap-1
              bg-card-bg border-2 border-border-color rounded-xl shadow-nb-md p-1.5 z-50
              animate-[fadeIn_0.15s_ease-out]"
          >
            {LANGUAGE_OPTIONS.map((option) => {
              const isActive = option.value === activeLanguage;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  onClick={() => {
                    if (option.value !== activeLanguage) {
                      setActiveLanguage(option.value);
                    }
                    setOpen(false);
                  }}
                  className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer
                    ${
                      isActive
                        ? "bg-accent-blue/10 text-accent-blue"
                        : "text-text-secondary hover:bg-border-color/10"
                    }`}
                >
                  <span className="text-lg leading-none" aria-hidden>
                    {LANGUAGE_FLAGS[option.value]}
                  </span>
                  {option.nativeName}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Days studied — reflects overall study activity */}
      <div className="flex items-center gap-1.5" title="วันที่เรียน">
        <CalendarOutlined style={{ fontSize: 20 }} className="text-orange-500" />
        <span className="font-extrabold tabular-nums text-orange-500">
          {studiedDays}
        </span>
      </div>

      {/* Gems */}
      <div className="flex items-center gap-1.5">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="text-accent-blue"
          aria-hidden
        >
          <path d="M6 2h12l4 6-10 14L2 8z" opacity="0.95" />
          <path d="M2 8h20l-10 14z" opacity="0.5" />
        </svg>
        <span className="font-extrabold tabular-nums text-accent-blue">
          {gems}
        </span>
      </div>

      {/* Energy */}
      <div className="flex items-center gap-1.5">
        <ThunderboltOutlined style={{ fontSize: 20 }} className="text-pink-500" />
        <span className="font-extrabold tabular-nums text-pink-500">
          {energy}
        </span>
      </div>
    </div>
  );
}

