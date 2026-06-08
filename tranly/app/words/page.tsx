"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ConfigProvider, message } from "antd";
import useIllustrationTheme from "@/app/theme/illustrationTheme";
import { useStrings } from "@/app/_lib/strings";
import { useWordStorage, type WordRecord } from "@/app/learn/_lib/useWordStorage";
import { useTTS } from "@/app/chat/_lib/useTTS";
import BottomNav from "@/app/_components/BottomNav";
import WordDetailSheet from "@/app/_components/WordDetailSheet";
import ScanButton from "@/app/scan/_components/ScanButton";
import { useActiveLanguage } from "@/app/_lib/ActiveLanguageContext";

function formatDate(ts: number | string) {
  const d = new Date(ts);
  return d.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getLocalDateString(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDayHeader(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "2-digit",
  });
}

interface CompactWordCardProps {
  word: WordRecord;
  onSpeak: (text: string) => void;
  onSelect: (word: WordRecord, rect: DOMRect) => void;
  baseDelay: number;
}

function CompactWordCard({ word, onSpeak, onSelect, baseDelay }: CompactWordCardProps) {
  const [imgUrl, setImgUrl] = useState<string>("");
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (word.imageUrl) {
      setImgUrl(word.imageUrl);
    } else if (word.imageBlob) {
      const url = URL.createObjectURL(word.imageBlob);
      setImgUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [word.imageUrl, word.imageBlob]);

  const wordText = word.korean || word.label;

  const stickerFilterStyle = {
    filter: 'url(#clean-sticker-page)'
  };

  const handleSelect = () => {
    const rect = imgRef.current?.getBoundingClientRect();
    if (rect) onSelect(word, rect);
  };

  return (
    <div
      className="relative flex flex-col items-center w-full animate-card-fade-in py-2"
      style={{ animationDelay: `${baseDelay}ms` }}
    >
      {/* Sticker image wrapper — click to open popup */}
      <div
        ref={imgRef}
        onClick={handleSelect}
        className="w-full aspect-square max-w-[160px] flex items-center justify-center shrink-0 relative transition-transform active:translate-y-[2px] z-10 cursor-pointer"
        style={stickerFilterStyle}
      >
        {imgUrl ? (
          <img
            src={imgUrl}
            alt={wordText}
            className="w-full h-full object-contain rounded-3xl"
          />
        ) : (
          <div className="text-5xl bg-white border-4 border-white rounded-3xl w-full h-full flex items-center justify-center">🍎</div>
        )}
      </div>

      {/* Sticker text label + speaker button */}
      <div className="flex items-center gap-1 -mt-3.5 z-20 max-w-[95%] relative">
        <div
          onClick={handleSelect}
          className="bg-white border-2 border-border-color rounded-full px-3 py-1 text-xs font-extrabold text-[#171717] shadow-nb-sm text-center truncate max-w-[120px] cursor-pointer transition-transform active:translate-y-[2px] active:shadow-none"
        >
          {wordText}
        </div>
        {/* Speaker icon — TTS only */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onSpeak(wordText); }}
          className="shrink-0 w-6 h-6 rounded-full border-2 border-border-color bg-white flex items-center justify-center shadow-nb-sm active:translate-y-[2px] active:shadow-none transition-transform cursor-pointer"
          aria-label="เล่นเสียง"
          style={{ color: "var(--accent-green)" }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default function WordsPage() {
  const configProps = useIllustrationTheme();
  const router = useRouter();
  const t = useStrings();
  const [messageApi, contextHolder] = message.useMessage();

  const { speak } = useTTS("ko-KR");
  const { listByLanguage } = useWordStorage();
  const { activeLanguage } = useActiveLanguage();

  const [words, setWords] = useState<WordRecord[] | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<{ word: WordRecord; rect: DOMRect } | null>(null);

  // Load saved words on mount with Stale-While-Revalidate caching
  useEffect(() => {
    let cancelled = false;
    const cacheKey = `tarnly:words:cache:${activeLanguage}`;

    // 1. Read from localStorage cache first for instant UI loading
    const cachedDataStr = typeof window !== 'undefined' ? localStorage.getItem(cacheKey) : null;
    let cachedList: WordRecord[] = [];
    if (cachedDataStr) {
      try {
        cachedList = JSON.parse(cachedDataStr);
        setWords(cachedList);
      } catch (e) {
        console.error("Failed to parse cached words:", e);
      }
    }

    // 2. Fetch from DB in background to revalidate and update cache if needed
    const loadData = async () => {
      try {
        const list = await listByLanguage();
        if (!cancelled) {
          const newStringified = JSON.stringify(list);
          if (cachedDataStr !== newStringified) {
            if (typeof window !== 'undefined') {
              localStorage.setItem(cacheKey, newStringified);
            }
            setWords(list);
          } else {
            // If cache matches DB, ensure loading state is cleared when words state is null
            setWords((current) => (current === null ? list : current));
          }
        }
      } catch {
        if (!cancelled && !cachedDataStr) {
          setWords([]);
        }
      }
    };
    loadData();

    return () => {
      cancelled = true;
    };
  }, [listByLanguage, activeLanguage]);

  // Grouping by local date
  const groupsMap: { [dateStr: string]: WordRecord[] } = {};
  if (words) {
    words.forEach((word) => {
      const dateStr = getLocalDateString(word.createdAt);
      if (!groupsMap[dateStr]) {
        groupsMap[dateStr] = [];
      }
      groupsMap[dateStr].push(word);
    });
  }

  // Sort dates descending (Newest Days First)
  const sortedKeys = Object.keys(groupsMap).sort((a, b) => b.localeCompare(a));

  // Sort words inside each date ascending (Oldest/Saved First)
  sortedKeys.forEach((key) => {
    groupsMap[key].sort((a, b) => a.createdAt - b.createdAt);
  });

  return (
    <ConfigProvider {...configProps}>
      {contextHolder}
      {/* Smooth, anti-aliased sticker outline SVG filter */}
      <svg width="0" height="0" style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }} aria-hidden="true">
        <defs>
          <filter id="clean-sticker-page" x="-30%" y="-30%" width="160%" height="160%">
            {/* White border outline */}
            <feMorphology in="SourceAlpha" operator="dilate" radius="4.5" result="dilated-white" />
            <feGaussianBlur in="dilated-white" stdDeviation="0.7" result="blurred-white" />
            <feComponentTransfer in="blurred-white" result="sharp-white">
              <feFuncA type="linear" slope="15" intercept="-7" />
            </feComponentTransfer>
            <feFlood floodColor="white" result="white-color" />
            <feComposite in="white-color" in2="sharp-white" operator="in" result="white-border" />
            
            {/* Dark shadow offset */}
            <feOffset in="sharp-white" dx="3.5" dy="3.5" result="offset-shadow" />
            <feFlood floodColor="#171717" result="shadow-color" />
            <feComposite in="shadow-color" in2="offset-shadow" operator="in" result="shadow" />
            
            {/* Merge original image over white border over shadow */}
            <feMerge>
              <feMergeNode in="shadow" />
              <feMergeNode in="white-border" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>
      <div className="w-full h-dvh dot-grid-bg text-[#2C2C2C] dark:text-white flex flex-col relative overflow-hidden font-sans select-none">
        <style>{`
          @keyframes cardFadeInUp {
            from { opacity: 0; transform: translateY(12px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes elementFadeIn {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-card-fade-in {
            animation: cardFadeInUp 0.45s cubic-bezier(0.215, 0.61, 0.355, 1) both;
          }
          .animate-card-content {
            animation: elementFadeIn 0.35s cubic-bezier(0.215, 0.61, 0.355, 1) both;
          }
          .animate-card-actions {
            animation: elementFadeIn 0.35s cubic-bezier(0.215, 0.61, 0.355, 1) both;
          }
        `}</style>

        <div
          className="flex-1 overflow-y-auto flex flex-col"
          style={{ paddingBottom: "calc(120px + env(safe-area-inset-bottom, 0px))" }}
        >
          <div className="flex-1 flex flex-col animate-card-fade-in">
            <div className="px-4 mt-6 flex flex-col gap-5 flex-1">
              {words === null ? (
                null
              ) : words.length === 0 ? (
                <div className="mt-12 flex flex-col items-center gap-4 text-center animate-card-fade-in">
                  <p className="text-base font-bold text-text-secondary">
                    {t.learn.noWords}
                  </p>
                  <button
                    type="button"
                    onClick={() => router.push("/chat")}
                    className="rounded-xl border-3 border-border-color bg-accent-green px-5 py-3 font-extrabold text-white shadow-nb-md active:translate-y-[2px] active:shadow-nb-sm cursor-pointer"
                  >
                    {t.learn.scanNow}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-5">
                  {sortedKeys.map((dateStr) => {
                    const groupWords = groupsMap[dateStr];
                    const dateLabel = formatDayHeader(dateStr);

                    return (
                      <div key={dateStr} className="flex flex-col gap-3 animate-card-fade-in">
                        <h3 className="text-sm font-extrabold text-text-secondary px-1 flex items-center gap-2">
                          <span className="w-1.5 h-3.5 rounded bg-accent-green inline-block"></span>
                          {dateLabel}
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                          {groupWords.map((word, wordIndex) => (
                            <CompactWordCard
                              key={word.id}
                              word={word}
                              onSpeak={speak}
                              onSelect={(w, rect) => setSelectedEntry({ word: w, rect })}
                              baseDelay={wordIndex * 40}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Floating Scan button — bottom-right, above the nav bar */}
        <div
          className="absolute right-6 z-40"
          style={{ bottom: "calc(112px + env(safe-area-inset-bottom, 0px))" }}
        >
          <ScanButton variant="fab" />
        </div>

        <BottomNav active="word" />

        {/* Word detail popup */}
        <WordDetailSheet
          word={selectedEntry?.word ?? null}
          originRect={selectedEntry?.rect ?? null}
          onClose={() => setSelectedEntry(null)}
        />
      </div>
    </ConfigProvider>
  );
}
