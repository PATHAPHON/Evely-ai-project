"use client";

import { useCallback, useEffect, useState } from "react";
import { CloseOutlined } from "@ant-design/icons";
import { getCustomAIHeaders } from "@/app/_lib/utils/getCustomAIHeaders";
import type { FeedWordRecord } from "@/app/_lib/types/wordTypes";
import type { WordDetailResponse } from "@/app/api/word-detail/route";

interface WordDetailViewProps {
  word: FeedWordRecord | null; // null = closed
  onClose: () => void;
}

// ─── Highlight helper (copied from WordDetailSheet) ────────────────────────────
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

// ─── Skeleton (copied from WordDetailSheet) ────────────────────────────────────
function ContentSkeleton() {
  return (
    <div className="flex flex-col gap-3 animate-pulse py-1">
      <div className="h-3.5 rounded-lg bg-gray-200 dark:bg-[#3d3d5c] w-full" />
      <div className="h-3.5 rounded-lg bg-gray-200 dark:bg-[#3d3d5c] w-5/6" />
      <div className="h-3.5 rounded-lg bg-gray-200 dark:bg-[#3d3d5c] w-4/6" />
    </div>
  );
}

// ─── Section card wrapper ──────────────────────────────────────────────────────
function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border-3 border-black bg-[var(--card-bg)] p-4 shadow-nb-sm flex flex-col gap-2.5">
      <h3 className="text-xs font-black uppercase tracking-wider text-text-meta m-0">{title}</h3>
      {children}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function WordDetailView({ word, onClose }: WordDetailViewProps) {
  const [detail, setDetail] = useState<WordDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Enter / exit animation
  useEffect(() => {
    if (word) {
      requestAnimationFrame(() => requestAnimationFrame(() => setIsVisible(true)));
    } else {
      setIsVisible(false);
    }
  }, [word]);

  // Fetch word detail (copied from WordDetailSheet)
  const fetchDetail = useCallback(async (w: FeedWordRecord) => {
    setIsLoading(true);
    setError(null);
    setDetail(null);
    try {
      const headers = getCustomAIHeaders();
      const res = await fetch("/api/word-detail", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          word: w.word,
          language: w.language,
          reading: w.ipa,
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

  // Close with exit animation
  const handleClose = useCallback(() => {
    setIsVisible(false);
    setTimeout(onClose, 280);
  }, [onClose]);

  // ESC to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleClose]);

  if (!word) return null;

  // The handed-off snapshot may predate background enrichment (thai falls back
  // to the word itself) — prefer fields from the word-detail response then.
  const thaiMissing = !word.thai || word.thai.toLowerCase() === (word.word ?? "").toLowerCase();
  const displayThai = thaiMissing && detail?.thai ? detail.thai : word.thai;
  const displayIpa = word.ipa || detail?.ipa;
  const displayPartOfSpeech = word.partOfSpeech || detail?.partOfSpeech;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{
        background: "var(--card-bg)",
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : "translateY(24px)",
        transition: "opacity 0.28s ease, transform 0.28s cubic-bezier(0.34,1.56,0.64,1)",
      }}
    >
      {/* Floating close button */}
      <button
        type="button"
        onClick={handleClose}
        aria-label="ปิด"
        className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border-3 border-black bg-white text-black shadow-nb-sm transition-transform active:scale-90 cursor-pointer"
      >
        <CloseOutlined style={{ fontSize: 18 }} />
      </button>

      {/* ── Scrollable content ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto pb-8">
        {/* Body */}
        <div className="flex flex-col gap-4 px-4 pt-4">
          {/* Headline */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-4xl font-black text-text-primary leading-tight m-0">{word.word}</h1>
              {displayPartOfSpeech && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border-2 border-black bg-[#E6FFFB] text-[#08979C] shadow-nb-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#08979C] animate-pulse" />
                  {displayPartOfSpeech}
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-3 flex-wrap">
              <p className="text-xl font-extrabold text-text-primary m-0">{displayThai}</p>
              {displayIpa && (
                <p className="text-base text-text-secondary font-bold italic m-0">
                  {displayIpa.startsWith("/") ? displayIpa : `/${displayIpa}/`}
                </p>
              )}
            </div>
          </div>

          {/* About this word */}
          <SectionCard title="เกี่ยวกับคำนี้">
            {isLoading ? (
              <ContentSkeleton />
            ) : error ? (
              <div className="flex flex-col items-center gap-3 py-2 text-center">
                <span className="text-3xl">⚠️</span>
                <p className="text-sm text-text-secondary">{error}</p>
                <button
                  type="button"
                  onClick={() => fetchDetail(word)}
                  className="mt-1 px-4 py-2 rounded-xl border-2 border-black text-xs font-extrabold shadow-nb-sm active:translate-y-[2px] active:shadow-none cursor-pointer transition-transform"
                  style={{ background: "var(--accent-green)", color: "#fff" }}
                >
                  ลองใหม่
                </button>
              </div>
            ) : (
              <p className="text-sm leading-relaxed text-text-primary whitespace-pre-line m-0">
                {detail?.context || "ไม่มีข้อมูล"}
              </p>
            )}
          </SectionCard>

          {/* Examples */}
          {!error && (
            <SectionCard title="ตัวอย่างประโยค">
              {isLoading ? (
                <ContentSkeleton />
              ) : detail?.examples.length ? (
                <div className="flex flex-col gap-2.5">
                  {detail.examples.map((ex, i) => (
                    <div
                      key={i}
                      className="rounded-xl border-2 border-black bg-[var(--background)] p-3 shadow-nb-sm flex flex-col gap-1"
                    >
                      {ex.tense && (
                        <span
                          className="self-start rounded-full border-2 border-black px-2 py-0.5 text-[10px] font-bold"
                          style={{ background: "var(--accent-green)", color: "#fff" }}
                        >
                          {ex.tense}
                        </span>
                      )}
                      <p className="text-sm font-semibold leading-snug m-0">
                        <HighlightedSentence sentence={ex.sentence} highlight={ex.highlight} />
                      </p>
                      <p className="text-xs text-text-secondary leading-snug m-0">{ex.translation}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-text-secondary m-0">ไม่มีตัวอย่างประโยค</p>
              )}
            </SectionCard>
          )}

          {/* Grammar */}
          {!error && (
            <SectionCard title="ไวยากรณ์">
              {isLoading ? (
                <ContentSkeleton />
              ) : (
                <p className="text-sm leading-relaxed text-text-primary whitespace-pre-line m-0">
                  {detail?.grammar || "ไม่มีข้อมูลไวยากรณ์"}
                </p>
              )}
            </SectionCard>
          )}
        </div>
      </div>

    </div>
  );
}
