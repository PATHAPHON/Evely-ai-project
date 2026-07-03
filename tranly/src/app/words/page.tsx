"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Search } from "lucide-react";
import { useStrings } from "@/shared/utils/strings";
import { useWordStorage, type WordRecord } from "@/shared/hooks/useWordStorage";
import { useTTS } from "@/shared/hooks/useTTS";
import type { FeedWordRecord } from "@/shared/types/wordTypes";
import { useActiveLanguage } from "@/shared/contexts/ActiveLanguageContext";
import AppShell from "@/shared/components/AppShell";
import WordDetailPopup from "@/shared/components/WordDetailPopup";

type SortMode = 0 | 1 | 2 | 3; // newest, oldest, A→Z, Z→A

function wordsCacheKey(language: string): string {
  return `tarnly:words:cache:${language}`;
}

function sortWords(words: WordRecord[], mode: SortMode): WordRecord[] {
  const arr = [...words];
  const name = (w: WordRecord) => (w.english || w.label).toLowerCase();
  switch (mode) {
    case 0:
      return arr.sort((a, b) => b.createdAt - a.createdAt);
    case 1:
      return arr.sort((a, b) => a.createdAt - b.createdAt);
    case 2:
      return arr.sort((a, b) => name(a).localeCompare(name(b)));
    case 3:
      return arr.sort((a, b) => name(b).localeCompare(name(a)));
  }
}

function SortIcon({ mode }: { mode: SortMode }) {
  const gradId = `sort-grad-${mode}`;
  const stroke = `url(#${gradId})`;
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4f8df7" />
          <stop offset="100%" stopColor="#1b62d1" />
        </linearGradient>
      </defs>
      {mode === 0 && (
        <>
          <circle cx="9" cy="12" r="7" stroke={stroke} />
          <polyline points="9 9 9 12 12 13.5" stroke={stroke} />
          <path d="M19 8v8M19 16l-3-3M19 16l3-3" stroke={stroke} />
        </>
      )}
      {mode === 1 && (
        <>
          <circle cx="9" cy="12" r="7" stroke={stroke} />
          <polyline points="9 9 9 12 12 13.5" stroke={stroke} />
          <path d="M19 16V8M19 8l-3 3M19 8l3-3" stroke={stroke} />
        </>
      )}
      {mode === 2 && (
        <>
          <path d="M4 11V6h4v5M4 9h4" stroke={stroke} />
          <path d="M4 14h4L4 19h4" stroke={stroke} />
          <path d="M19 8v8M19 16l-3-3M19 16l3-3" stroke={stroke} />
        </>
      )}
      {mode === 3 && (
        <>
          <path d="M4 6h4L4 11h4" stroke={stroke} />
          <path d="M4 19V14h4v5M4 17h4" stroke={stroke} />
          <path d="M19 8v8M19 16l-3-3M19 16l3-3" stroke={stroke} />
        </>
      )}
    </svg>
  );
}

function toFeedWord(w: WordRecord, activeLanguage: FeedWordRecord["language"]): FeedWordRecord {
  return {
    id: w.id,
    language: w.language ?? activeLanguage,
    generatedDate: "",
    thai: w.label,
    bookmarked: true,
    createdAt: w.createdAt,
    partOfSpeech: w.partOfSpeech,
    word: w.english || w.label,
  };
}

interface WordRowProps {
  word: WordRecord;
  onSpeak: (text: string) => void;
  onSelect: (word: WordRecord) => void;
  isLast: boolean;
}

function WordRow({ word, onSpeak, onSelect, isLast }: WordRowProps) {
  const wordText = word.english || word.label;
  return (
    <button
      type="button"
      onClick={() => onSelect(word)}
      className={`relative flex w-full items-center gap-4 px-[18px] py-[17px] text-left transition-colors hover:bg-primary-bg/40 active:bg-primary-bg/75 ${
        isLast ? "" : "border-b border-border-color"
      }`}
    >
      <span
        onClick={(e) => {
          e.stopPropagation();
          onSpeak(wordText);
        }}
        className="flex h-11 w-11 flex-none items-center justify-center rounded-xl transition-all hover:bg-primary-bg active:scale-90 cursor-pointer hover:scale-105"
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id={`blue-grad-${word.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4f8df7" />
              <stop offset="100%" stopColor="#1b62d1" />
            </linearGradient>
          </defs>
          <path d="M11 5L6.5 9H3v6h3.5L11 19V5z" fill={`url(#blue-grad-${word.id})`} />
          <path d="M15.5 8.5a4.5 4.5 0 0 1 0 7" stroke={`url(#blue-grad-${word.id})`} strokeWidth="1.9" strokeLinecap="round" />
          <path d="M18.5 6a8 8 0 0 1 0 12" stroke={`url(#blue-grad-${word.id})`} strokeWidth="1.9" strokeLinecap="round" />
        </svg>
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-lg font-bold text-foreground">
          {wordText}
        </span>
        {word.label && word.label !== wordText && (
          <span className="truncate text-[15px] font-medium text-foreground/60">
            {word.label}
          </span>
        )}
      </span>
      <svg className="flex-none" width="20" height="20" viewBox="0 0 24 24" fill="none" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <defs>
          <linearGradient id={`chevron-grad-${word.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4f8df7" />
            <stop offset="100%" stopColor="#1b62d1" />
          </linearGradient>
        </defs>
        <polyline points="9 6 15 12 9 18" stroke={`url(#chevron-grad-${word.id})`} />
      </svg>
    </button>
  );
}

export default function WordsPage() {
  const t = useStrings();

  const { speak } = useTTS("en-US");
  const { listByLanguage } = useWordStorage();
  const { activeLanguage } = useActiveLanguage();

  const [words, setWords] = useState<WordRecord[] | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>(0);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<FeedWordRecord | null>(null);

  const handleWordUpdate = useCallback((updated: { id: string; thai: string; partOfSpeech?: string }) => {
    if (!words) return;

    const next = words.map((w) =>
      w.id === updated.id
        ? { ...w, label: updated.thai, thai: updated.thai, partOfSpeech: updated.partOfSpeech ?? w.partOfSpeech }
        : w
    );
    setWords(next);

    const cacheKey = wordsCacheKey(activeLanguage);
    if (typeof window !== "undefined") {
      localStorage.setItem(cacheKey, JSON.stringify(next));
    }

    setSelected((prev) => {
      if (!prev || prev.id !== updated.id) return prev;
      return {
        ...prev,
        thai: updated.thai,
        partOfSpeech: updated.partOfSpeech ?? prev.partOfSpeech,
      };
    });
  }, [words, activeLanguage]);

  // Load saved words on mount with Stale-While-Revalidate caching
  useEffect(() => {
    let cancelled = false;
    const cacheKey = wordsCacheKey(activeLanguage);

    const cachedDataStr = typeof window !== "undefined" ? localStorage.getItem(cacheKey) : null;
    if (cachedDataStr) {
      try {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setWords(JSON.parse(cachedDataStr));
      } catch (e) {
        console.error("Failed to parse cached words:", e);
      }
    }

    const loadData = async () => {
      try {
        const list = await listByLanguage();
        if (!cancelled) {
          const newStringified = JSON.stringify(list);
          if (cachedDataStr !== newStringified) {
            if (typeof window !== "undefined") {
              localStorage.setItem(cacheKey, newStringified);
            }
            setWords(list);
          } else {
            setWords((current) => (current === null ? list : current));
          }
        }
      } catch {
        if (!cancelled && !cachedDataStr) {
          setWords([]);
        }
      }
    };
    void loadData();

    return () => {
      cancelled = true;
    };
  }, [listByLanguage, activeLanguage]);

  const sorted = useMemo(() => {
    if (!words) return [];
    const q = query.trim().toLowerCase();
    const filtered = q
      ? words.filter(
          (w) =>
            (w.english || w.label).toLowerCase().includes(q) ||
            w.label.toLowerCase().includes(q)
        )
      : words;
    return sortWords(filtered, sortMode);
  }, [words, sortMode, query]);

  const sortButton = words && words.length > 0 ? (
    <button
      type="button"
      onClick={() => setSortMode((m) => (((m + 1) % 4) as SortMode))}
      aria-label={t.words.sortAria(t.words.sortLabels[sortMode])}
      title={t.words.sortAria(t.words.sortLabels[sortMode])}
      className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-card-bg active:scale-95 cursor-pointer"
    >
      <SortIcon mode={sortMode} />
    </button>
  ) : undefined;

  return (
    <>
      <AppShell title={t.words.title} rightElement={sortButton}>
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
          {/* Search */}
          {words !== null && words.length > 0 && (
            <div className="px-4 pt-3 pb-3">
              <div className="flex items-center gap-2.5 rounded-full border border-border-color bg-card-bg/50 px-4 h-12 shadow-soft-sm">
                <Search className="text-foreground/40 shrink-0" size={17} />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t.words.searchPlaceholder}
                  className="flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-foreground/45"
                />
              </div>
            </div>
          )}

          {/* Count bar */}
          {words !== null && words.length > 0 && (
            <div className="flex items-center justify-between px-5 py-2">
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold leading-none text-foreground">
                  {words.length}
                </span>
                <span className="text-sm font-bold text-foreground/75">{t.words.countUnit}</span>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-[18px] pb-24 pt-2">
            <div className="mx-auto w-full max-w-2xl">
              {words === null ? null : words.length === 0 ? (
                <div className="mt-12 flex flex-col items-center gap-4 text-center">
                  <p className="text-sm font-semibold text-foreground/50">{t.learn.noWords}</p>
                </div>
              ) : sorted.length === 0 ? (
                <div className="mt-12 flex flex-col items-center gap-4 text-center">
                  <p className="text-sm font-semibold text-foreground/50">{t.words.notFound}</p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-border-color bg-card-bg shadow-soft-sm">
                  {sorted.map((word, i) => (
                    <WordRow
                      key={word.id}
                      word={word}
                      onSpeak={speak}
                      onSelect={(w) => setSelected(toFeedWord(w, activeLanguage))}
                      isLast={i === sorted.length - 1}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </AppShell>

      <WordDetailPopup word={selected} onClose={() => setSelected(null)} onUpdate={handleWordUpdate} />
    </>
  );
}
