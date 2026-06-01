"use client";

import { useEffect, useMemo, useState } from "react";
import type { WordRecord } from "../_lib/useWordStorage";
import { useFlashcardSets, type FlashcardSet } from "../_lib/useFlashcardSets";
import { useLanguagePreference } from "@/app/_lib/useLanguagePreference";
import { useActiveLanguage } from "@/app/_lib/ActiveLanguageContext";
import { useTTS } from "@/app/chat/_lib/useTTS";
import { getCustomAIHeaders } from "@/app/_lib/getCustomAIHeaders";

const LANGUAGE_NAMES: Record<string, string> = {
  english: 'English',
  japanese: '日本語',
  korean: '한국어',
  chinese: '中文',
};

interface FlashcardModeProps {
  words: WordRecord[];
  onStudyingChange?: (studying: boolean) => void;
}

type SubView =
  | { kind: "list" }
  | { kind: "create" }
  | { kind: "study"; set: FlashcardSet };

/**
 * Flashcard mode for the My Words page.
 * - Lists the flashcard sets the user has created (or prompts to create one).
 * - Lets the user create a new set by picking words and naming it.
 * - Studies a chosen set by flipping through its words.
 */
export function FlashcardMode({ words, onStudyingChange }: FlashcardModeProps) {
  const { sets, createSet, removeSet } = useFlashcardSets();
  const { activeLanguage } = useActiveLanguage();
  const [view, setView] = useState<SubView>({ kind: "list" });

  // Word ids already used in any existing set — the AI picker avoids these.
  const usedWordIds = useMemo(() => {
    const used = new Set<string>();
    sets?.forEach((set) => set.wordIds.forEach((id) => used.add(id)));
    return used;
  }, [sets]);

  useEffect(() => {
    onStudyingChange?.(view.kind === "study");
    return () => onStudyingChange?.(false);
  }, [view.kind, onStudyingChange]);

  if (view.kind === "create") {
    return (
      <CreateSet
        words={words}
        usedWordIds={usedWordIds}
        onCancel={() => setView({ kind: "list" })}
        onSave={async (name, wordIds) => {
          await createSet(name, wordIds);
          setView({ kind: "list" });
        }}
      />
    );
  }

  if (view.kind === "study") {
    const deck = view.set.wordIds
      .map((id) => words.find((w) => w.id === id))
      .filter((w): w is WordRecord => Boolean(w));
    if (deck.length === 0) {
      return (
        <div className="flex flex-col gap-3">
          <p className="mt-8 text-center text-base font-bold text-black/60 dark:text-white/60">
            ชุดนี้ไม่มีคำที่ใช้งานได้แล้ว
          </p>
          <button
            type="button"
            onClick={() => setView({ kind: "list" })}
            className="rounded-xl border-3 border-black dark:border-[#4a4a6a] bg-white dark:bg-[#2d2d44] px-5 py-3 font-extrabold text-black dark:text-white shadow-nb-md active:translate-y-[2px] active:shadow-nb-sm"
          >
            ← กลับ
          </button>
        </div>
      );
    }
    return (
      <Study
        deck={deck}
        title={view.set.name}
        onExit={() => setView({ kind: "list" })}
      />
    );
  }

  // list view
  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => setView({ kind: "create" })}
        disabled={words.length === 0}
        className="flex items-center justify-center gap-2 rounded-xl border-3 border-border-color bg-accent-green px-5 py-3 font-extrabold text-white shadow-nb-md active:translate-y-[2px] active:shadow-nb-sm disabled:cursor-not-allowed disabled:opacity-40"
      >
        <span className="text-xl leading-none">＋</span> สร้าง Flashcard
      </button>

      {sets === null && (
        <p className="mt-8 text-center text-sm font-bold text-text-meta">
          Loading...
        </p>
      )}

      {sets !== null && sets.length === 0 && (
        <p className="mt-8 text-center text-base font-bold text-black/60 dark:text-white/60">
          ยังไม่มี Flashcard สำหรับ {LANGUAGE_NAMES[activeLanguage] ?? activeLanguage}
          <br />
          โปรดสร้าง Flashcard
        </p>
      )}

      {sets?.map((set) => (
        <div
          key={set.id}
          className="flex items-center gap-3 rounded-2xl border-3 border-black dark:border-[#4a4a6a] bg-white dark:bg-[#2d2d44] p-3 shadow-nb-md"
        >
          <button
            type="button"
            onClick={() => setView({ kind: "study", set })}
            className="min-w-0 flex-1 text-left"
          >
            <span className="block truncate text-base font-extrabold text-black dark:text-white">
              {set.name}
            </span>
            <span className="block text-sm font-bold text-text-secondary">
              {set.wordIds.length} คำ
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm(`ลบชุด "${set.name}"?`)) removeSet(set.id);
            }}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border-3 border-black dark:border-[#4a4a6a] bg-[#FFF0F6] dark:bg-[#3d2d44] font-extrabold text-black dark:text-white shadow-nb-sm active:translate-y-[2px] active:shadow-[1px_1px_0_var(--shadow-color)]"
            aria-label="ลบ"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

function CreateSet({
  words,
  usedWordIds,
  onCancel,
  onSave,
}: {
  words: WordRecord[];
  usedWordIds: Set<string>;
  onCancel: () => void;
  onSave: (name: string, wordIds: string[]) => void | Promise<void>;
}) {
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const allSelected = selected.size === words.length;

  // Words not yet used in any existing set — the only ones AI may pick from.
  const aiCandidates = useMemo(
    () => words.filter((w) => !usedWordIds.has(w.id)),
    [words, usedWordIds]
  );

  const handleAiPick = async () => {
    setAiError(null);
    if (aiCandidates.length === 0) {
      setAiError("ทุกคำถูกใช้ใน Flashcard หมดแล้ว");
      return;
    }
    setAiLoading(true);
    try {
      const res = await fetch("/api/flashcard/select", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getCustomAIHeaders(),
        },
        body: JSON.stringify({
          candidates: aiCandidates.map((w) => ({
            id: w.id,
            korean: w.korean || w.label,
            english: w.english,
          })),
        }),
      });
      if (!res.ok) {
        setAiError("ให้ AI เลือกไม่สำเร็จ ลองอีกครั้ง");
        return;
      }
      const data = (await res.json()) as { ids?: string[]; name?: string };
      const ids = (data.ids ?? []).filter((id) =>
        aiCandidates.some((w) => w.id === id)
      );
      if (ids.length === 0) {
        setAiError("AI ไม่สามารถเลือกคำได้ ลองอีกครั้ง");
        return;
      }
      setSelected(new Set(ids));
      if (data.name && name.trim().length === 0) setName(data.name);
    } catch {
      setAiError("เกิดข้อผิดพลาด ลองอีกครั้ง");
    } finally {
      setAiLoading(false);
    }
  };

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(words.map((w) => w.id)));
  };

  const canSave = name.trim().length > 0 && selected.size > 0 && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await onSave(name.trim(), [...selected]);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border-3 border-border-color bg-card-bg px-3 py-1.5 text-xs font-extrabold text-text-primary shadow-nb-sm active:translate-y-[2px] active:shadow-[1px_1px_0_var(--shadow-color)]"
        >
          ← ยกเลิก
        </button>
        <button
          type="button"
          onClick={toggleAll}
          className="rounded-lg border-3 border-border-color bg-card-bg px-3 py-1.5 text-xs font-extrabold text-text-primary shadow-nb-sm active:translate-y-[2px] active:shadow-[1px_1px_0_var(--shadow-color)]"
        >
          {allSelected ? "ล้างทั้งหมด" : "เลือกทั้งหมด"}
        </button>
      </div>

      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="ชื่อชุด Flashcard"
        className="rounded-xl border-3 border-border-color bg-card-bg px-4 py-3 text-base font-bold text-text-primary shadow-nb-sm outline-none placeholder:text-text-secondary"
      />

      <button
        type="button"
        onClick={handleAiPick}
        disabled={aiLoading}
        className="flex items-center justify-center gap-2 rounded-xl border-3 border-border-color bg-accent-yellow px-5 py-3 font-extrabold text-black shadow-nb-md active:translate-y-[2px] active:shadow-nb-sm disabled:cursor-not-allowed disabled:opacity-60"
      >
        {aiLoading ? "กำลังให้ AI เลือก..." : "✨ ให้ AI เลือกให้"}
      </button>

      {aiError && (
        <p className="rounded-xl border-3 border-accent-red bg-card-bg px-4 py-2 text-sm font-bold text-accent-red shadow-nb-sm">
          {aiError}
        </p>
      )}

      <p className="text-sm font-bold text-text-secondary">
        เลือกคำ ({selected.size}/{words.length})
      </p>

      {words.map((w) => {
        const isOn = selected.has(w.id);
        const korean = w.korean || "";
        const main = korean || w.label;
        return (
          <button
            key={w.id}
            type="button"
            onClick={() => toggle(w.id)}
            className={`flex items-center gap-3 rounded-2xl border-3 border-border-color p-3 text-left shadow-nb-md active:translate-y-[2px] active:shadow-nb-sm ${
              isOn ? "bg-accent-pink-bg" : "bg-card-bg"
            }`}
          >
            <span
              className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md border-3 border-border-color font-extrabold ${
                isOn ? "bg-accent-green text-white" : "bg-card-bg"
              }`}
            >
              {isOn ? "✓" : ""}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-base font-extrabold text-text-primary">
                {main}
              </span>
              {korean && w.label && w.label !== korean && (
                <span className="block truncate text-sm font-bold text-text-secondary">
                  {w.label}
                </span>
              )}
            </span>
          </button>
        );
      })}

      <button
        type="button"
        onClick={handleSave}
        disabled={!canSave}
        className="mt-2 rounded-xl border-3 border-border-color bg-accent-green px-5 py-3 font-extrabold text-white shadow-nb-md active:translate-y-[2px] active:shadow-nb-sm disabled:cursor-not-allowed disabled:opacity-40"
      >
        {saving ? "กำลังบันทึก..." : `บันทึกชุด (${selected.size})`}
      </button>
    </div>
  );
}

function Study({
  deck,
  title,
  onExit,
}: {
  deck: WordRecord[];
  title: string;
  onExit: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const { language } = useLanguagePreference();
  const { speak } = useTTS("ko-KR");

  const safeIndex = Math.min(index, deck.length - 1);
  const word = deck[safeIndex];

  const url = useMemo(
    () => URL.createObjectURL(word.imageBlob),
    [word.imageBlob]
  );
  useEffect(() => () => URL.revokeObjectURL(url), [url]);

  const korean = word.korean || "";
  const thai = word.label && word.label !== korean ? word.label : "";
  const reading = word.reading || "";
  const romanization = word.romanization || reading || korean || thai;
  const translation = language === "thai" ? thai : word.english || "";
  const canSpeak = Boolean(korean);

  const go = (next: number) => {
    setFlipped(false);
    setIndex(next);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex w-full items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-extrabold text-black dark:text-white">
            {title}
          </p>
          <p className="text-xs font-bold text-black/60 dark:text-white/60">
            {safeIndex + 1} / {deck.length}
          </p>
        </div>
        <button
          type="button"
          onClick={onExit}
          className="flex-shrink-0 rounded-lg border-3 border-black dark:border-[#4a4a6a] bg-accent-red px-3 py-1.5 text-xs font-extrabold text-white shadow-nb-sm active:translate-y-[2px] active:shadow-[1px_1px_0_var(--shadow-color)]"
        >
          ยกเลิก
        </button>
      </div>

      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        className="flex min-h-[20rem] w-full flex-col items-center justify-center rounded-2xl border-3 border-black dark:border-[#4a4a6a] bg-white dark:bg-[#2d2d44] p-6 text-center shadow-nb-md active:translate-y-[2px] active:shadow-nb-sm"
        aria-label="แตะเพื่อพลิกการ์ด"
      >
        {!flipped ? (
          <>
            <p className="break-words text-4xl font-extrabold text-black dark:text-white">
              {korean || word.label}
            </p>
            <p className="mt-6 text-xs font-bold text-text-meta">
              แตะเพื่อดูคำแปล
            </p>
          </>
        ) : (
          <div className="flex w-full flex-col items-center gap-3">
            <img
              src={url}
              alt={korean || thai}
              className="h-36 w-36 rounded-xl border-3 border-black object-cover dark:border-[#4a4a6a]"
            />
            <p className="break-words text-2xl font-extrabold text-black dark:text-white">
              {romanization}
            </p>
            {reading && (
              <p className="text-sm font-bold text-text-secondary">
                {reading}
              </p>
            )}
            {translation && (
              <p className="text-base font-bold text-black/70 dark:text-white/70">
                {translation}
              </p>
            )}
            {canSpeak && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  speak(korean);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.stopPropagation();
                    speak(korean);
                  }
                }}
                className="mt-1 flex h-10 w-10 items-center justify-center rounded-xl border-3 border-black bg-accent-blue text-white shadow-nb-sm active:translate-y-[2px] active:shadow-[1px_1px_0_var(--shadow-color)] dark:border-[#4a4a6a] dark:shadow-nb-sm"
                aria-label="ฟังเสียง"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                </svg>
              </span>
            )}
          </div>
        )}
      </button>

      <div className="flex w-full gap-3">
        <button
          type="button"
          onClick={() => go(safeIndex - 1)}
          disabled={safeIndex === 0}
          className="flex-1 rounded-xl border-3 border-black dark:border-[#4a4a6a] bg-white dark:bg-[#2d2d44] py-3 font-extrabold text-black dark:text-white shadow-nb-md active:translate-y-[2px] active:shadow-nb-sm disabled:opacity-40"
        >
          ก่อนหน้า
        </button>
        {safeIndex === deck.length - 1 ? (
          <button
            type="button"
            onClick={onExit}
            className="flex-1 rounded-xl border-3 border-black dark:border-[#4a4a6a] bg-accent-green py-3 font-extrabold text-white shadow-nb-md active:translate-y-[2px] active:shadow-nb-sm"
          >
            จบ
          </button>
        ) : (
          <button
            type="button"
            onClick={() => go(safeIndex + 1)}
            className="flex-1 rounded-xl border-3 border-black dark:border-[#4a4a6a] bg-accent-pink-bg py-3 font-extrabold text-black dark:text-white shadow-nb-md active:translate-y-[2px] active:shadow-nb-sm"
          >
            ถัดไป
          </button>
        )}
      </div>
    </div>
  );
}
