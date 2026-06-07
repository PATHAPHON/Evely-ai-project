"use client";

import { useEffect, useState, useCallback } from "react";
import { useTTS } from "@/app/chat/_lib/useTTS";
import { getCustomAIHeaders } from "@/app/_lib/getCustomAIHeaders";
import type { WordRecord } from "@/app/learn/_lib/useWordStorage";
import type { WordDetailResponse } from "@/app/api/word-detail/route";

// ─── Constants ────────────────────────────────────────────────────────────────

const STICKER_SIZE = 140; // final sticker size in popup header (px)
const STICKER_OVERFLOW = 72; // how much sticker overflows above modal border (px)

// STICKER_FILTER has been replaced by a smooth SVG filter (#clean-sticker-sheet) in the JSX return

// ─── Tabs ────────────────────────────────────────────────────────────────────

const TABS = [
  { id: "context", short: "Re", label: "อธิบายให้เข้าใจ" },
  { id: "examples", short: "Ca", label: "ตัวอย่าง เช่น" },
  { id: "grammar", short: "Gl", label: "ไวยากรณ์" },
] as const;

type TabId = (typeof TABS)[number]["id"];

// ─── Props ────────────────────────────────────────────────────────────────────

interface WordDetailSheetProps {
  word: WordRecord | null;
  originRect?: DOMRect | null; // Unused now, kept for backward compatibility with caller
  onClose: () => void;
}

// ─── Highlight helper ─────────────────────────────────────────────────────────

function HighlightedSentence({ sentence, highlight }: { sentence: string; highlight?: string }) {
  if (!highlight) return <span>{sentence}</span>;
  const escaped = highlight.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = sentence.split(regex);
  return (
    <span>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <span
            key={i}
            className="font-extrabold px-0.5 rounded"
            style={{ background: "rgba(82,196,26,0.2)", color: "var(--accent-green)" }}
          >
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function ContentSkeleton() {
  return (
    <div className="flex flex-col gap-3 animate-pulse py-2">
      <div className="h-3.5 rounded-lg bg-gray-200 dark:bg-[#3d3d5c] w-full" />
      <div className="h-3.5 rounded-lg bg-gray-200 dark:bg-[#3d3d5c] w-5/6" />
      <div className="h-3.5 rounded-lg bg-gray-200 dark:bg-[#3d3d5c] w-4/6" />
      <div className="h-3.5 rounded-lg bg-gray-200 dark:bg-[#3d3d5c] w-full mt-1" />
      <div className="h-3.5 rounded-lg bg-gray-200 dark:bg-[#3d3d5c] w-3/4" />
    </div>
  );
}

// ─── Tab content ─────────────────────────────────────────────────────────────

function TabContent({
  activeTab,
  detail,
  isLoading,
  error,
  onRetry,
}: {
  activeTab: TabId;
  detail: WordDetailResponse | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  if (isLoading) return <ContentSkeleton />;

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <span className="text-3xl">⚠️</span>
        <p className="text-sm text-text-secondary">{error}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-1 px-4 py-2 rounded-xl border-2 border-border-color text-xs font-extrabold shadow-nb-sm active:translate-y-[2px] active:shadow-none cursor-pointer transition-transform"
          style={{ background: "var(--accent-green)", color: "#fff" }}
        >
          ลองใหม่
        </button>
      </div>
    );
  }

  if (!detail) return null;

  if (activeTab === "context") {
    return (
      <p className="text-sm leading-relaxed text-text-primary whitespace-pre-line py-1">
        {detail.context || "ไม่มีข้อมูล context"}
      </p>
    );
  }

  if (activeTab === "examples") {
    if (!detail.examples.length)
      return <p className="text-sm text-text-secondary py-2">ไม่มีตัวอย่างประโยค</p>;
    return (
      <div className="flex flex-col gap-2.5 py-1">
        {detail.examples.map((ex, i) => (
          <div
            key={i}
            className="rounded-2xl border-2 border-border-color bg-background p-3 shadow-nb-sm flex flex-col gap-1"
          >
            <p className="text-sm font-semibold leading-snug">
              <HighlightedSentence sentence={ex.sentence} highlight={ex.highlight} />
            </p>
            <p className="text-xs text-text-secondary leading-snug">{ex.translation}</p>
          </div>
        ))}
      </div>
    );
  }

  if (activeTab === "grammar") {
    return (
      <p className="text-sm leading-relaxed text-text-primary whitespace-pre-line py-1">
        {detail.grammar || "ไม่มีข้อมูลไวยากรณ์"}
      </p>
    );
  }

  return null;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function WordDetailSheet({ word, onClose }: WordDetailSheetProps) {
  const [activeTab, setActiveTab] = useState<TabId>("context");
  const [detail, setDetail] = useState<WordDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imgUrl, setImgUrl] = useState<string>("");

  // Modal visibility
  const [isVisible, setIsVisible] = useState(false);

  const { speak } = useTTS(
    word?.language === "japanese"
      ? "ja-JP"
      : word?.language === "chinese"
      ? "zh-CN"
      : word?.language === "english"
      ? "en-US"
      : "ko-KR"
  );

  // Image URL
  useEffect(() => {
    if (!word) return;
    if (word.imageUrl) {
      setImgUrl(word.imageUrl);
    } else if (word.imageBlob) {
      const url = URL.createObjectURL(word.imageBlob);
      setImgUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setImgUrl("");
    }
  }, [word]);

  // Modal enter animation when word selected
  useEffect(() => {
    if (word) {
      // Animate modal in after one frame
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          setIsVisible(true);
        })
      );
    } else {
      setIsVisible(false);
    }
  }, [word]);

  // Fetch word detail
  const fetchDetail = useCallback(async (w: WordRecord) => {
    setIsLoading(true);
    setError(null);
    setDetail(null);
    setActiveTab("context");
    try {
      const headers = getCustomAIHeaders();
      const res = await fetch("/api/word-detail", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          word: w.korean || w.label,
          language: w.language || "korean",
          reading: w.reading,
          romanization: w.romanization,
          english: w.english,
          partOfSpeech: w.partOfSpeech,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "เกิดข้อผิดพลาด" }));
        throw new Error((err as { error?: string }).error || "เกิดข้อผิดพลาด");
      }
      const data: WordDetailResponse = await res.json();
      setDetail(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (word) fetchDetail(word);
  }, [word, fetchDetail]);

  // Close with animation
  const handleClose = useCallback(() => {
    setIsVisible(false);
    setTimeout(onClose, 280);
  }, [onClose]);

  // ESC key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleClose]);

  if (!word) return null;

  const wordText = word.korean || word.label;
  const partLabel = word.partOfSpeech ? `(${word.partOfSpeech})` : null;

  return (
    <>
      {/* Smooth, anti-aliased sticker outline SVG filter */}
      <svg width="0" height="0" style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }} aria-hidden="true">
        <defs>
          <filter id="clean-sticker-sheet" x="-30%" y="-30%" width="160%" height="160%">
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

      {/* ── Backdrop ──────────────────────────────────────────────────── */}
      <div
        className="fixed inset-0 z-40"
        style={{
          background: "rgba(0,0,0,0.52)",
          opacity: isVisible ? 1 : 0,
          transition: "opacity 0.26s ease",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
        }}
        onClick={handleClose}
      />

      {/* ── Modal ─────────────────────────────────────────────────────── */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center px-4"
        style={{ pointerEvents: "none" }}
      >
        <div
          className="w-full flex flex-col"
          style={{
            maxWidth: 400,
            maxHeight: "80dvh",
            background: "var(--card-bg)",
            borderRadius: 24,
            border: "2.5px solid var(--border-color)",
            boxShadow: "6px 6px 0 var(--shadow-color)",
            pointerEvents: "auto",
            // Entrance animation
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? "scale(1) translateY(0)" : "scale(0.88) translateY(20px)",
            transition:
              "opacity 0.28s cubic-bezier(0.34, 1.56, 0.64, 1), transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)",
            // Allow sticker to overflow above top border
            overflow: "visible",
            position: "relative",
          }}
        >
          {/* ── Sticker overflowing above modal border — centered ──────── */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: -STICKER_OVERFLOW,
              left: "50%",
              transform: "translateX(-50%)",
              width: STICKER_SIZE,
              height: STICKER_SIZE,
              zIndex: 10,
              pointerEvents: "none",
              transition: "opacity 0.12s ease",
            }}
          >
            {imgUrl && (
              <img
                src={imgUrl}
                alt={wordText}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  filter: "url(#clean-sticker-sheet)",
                }}
              />
            )}
          </div>

          {/* ── Close button ──────────────────────────────────────────── */}
          <button
            type="button"
            onClick={handleClose}
            aria-label="ปิด"
            className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full border-2 border-border-color flex items-center justify-center cursor-pointer transition-transform active:scale-90"
            style={{ background: "var(--background)", color: "var(--text-secondary)" }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>

          {/* ── Header: centered word info + TTS ─────────────────────── */}
          <div
            style={{
              paddingTop: STICKER_SIZE - STICKER_OVERFLOW + 10,
              paddingLeft: 16,
              paddingRight: 16,
              paddingBottom: 12,
            }}
          >
            {/* Word text — centered */}
            <p
              className="text-2xl font-extrabold leading-tight text-center"
              style={{ color: "var(--accent-green)" }}
            >
              {wordText}
            </p>
            {(partLabel || word.reading) && (
              <p className="text-xs text-text-secondary font-medium leading-snug mt-0.5 text-center">
                {partLabel && <em>{partLabel} </em>}
                {word.reading}
              </p>
            )}
            {word.english && (
              <p className="text-xs text-text-secondary leading-snug text-center">{word.english}</p>
            )}

            {/* TTS button — centered below word info */}
            <div className="flex justify-center mt-2.5">
              <button
                type="button"
                onClick={() => speak(wordText)}
                className="w-11 h-11 rounded-xl border-2 border-border-color flex items-center justify-center shadow-nb-sm active:translate-y-[2px] active:shadow-none transition-transform cursor-pointer"
                style={{ background: "var(--accent-blue)", color: "#fff" }}
                aria-label="เล่นเสียง"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
                </svg>
              </button>
            </div>
          </div>

          {/* ── Inner container (overflow hidden for scroll) ───────────── */}
          <div
            className="flex flex-col flex-1"
            style={{
              borderTop: "2px solid var(--border-color)",
              borderRadius: "0 0 22px 22px",
              overflow: "hidden",
            }}
          >
            {/* Tab bar */}
            <div className="flex px-4 pt-2.5 pb-1 gap-2">
              {TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className="relative flex-1 rounded-xl px-2 py-2 font-extrabold transition-all cursor-pointer border-2 active:scale-95"
                    style={{
                      borderColor: isActive ? "var(--border-color)" : "transparent",
                      background: isActive ? "var(--accent-green)" : "transparent",
                      color: isActive ? "#fff" : "var(--text-secondary)",
                      boxShadow: isActive ? "var(--shadow-nb-sm)" : "none",
                    }}
                    aria-selected={isActive}
                  >
                    <span className="block text-base leading-none">{tab.short}</span>
                    <span className="block text-[9px] leading-tight mt-0.5 opacity-80">
                      {tab.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Tab content */}
            <div
              className="flex-1 overflow-y-auto px-4 pb-5"
              style={{ overscrollBehavior: "contain", minHeight: 120 }}
            >
              <TabContent
                activeTab={activeTab}
                detail={detail}
                isLoading={isLoading}
                error={error}
                onRetry={() => word && fetchDetail(word)}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
