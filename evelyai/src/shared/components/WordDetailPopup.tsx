"use client";

import { useCallback, useEffect, useState, useContext } from "react";
import { createPortal } from "react-dom";
import { Calendar } from "lucide-react";
import { supabase } from "@/shared/supabase/supabaseClient";
import { useTTS } from "@/shared/hooks/useTTS";
import { markBudgetExhausted } from "@/shared/hooks/useBudgetExhausted";
import { WordStatusContext } from "@/shared/components/WordStatusProvider";
import type { FeedWordRecord } from "@/shared/types/wordTypes";
import type { WordDetailResponse } from "@/app/api/word-detail/route";

interface WordDetailPopupProps {
  word: FeedWordRecord | null; // null = closed
  onClose: () => void;
  onUpdate?: (updated: { id: string; thai: string; partOfSpeech?: string }) => void;
}

const THAI_MONTHS = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
];

function formatThaiDate(d: Date): string {
  return `${d.getDate()} ${THAI_MONTHS[d.getMonth()]}`;
}

export interface ReviewScheduleInfo {
  days: number;
  label: string;
  isDue: boolean;
  interval?: number | null;
}

export function computeReviewSchedule(
  nextReviewDate: Date | string | null | undefined,
  interval?: number | null,
): ReviewScheduleInfo | null {
  if (!nextReviewDate) return null;
  const target = new Date(nextReviewDate);
  if (isNaN(target.getTime())) return null;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const reviewDay = new Date(target.getFullYear(), target.getMonth(), target.getDate());

  const diffMs = reviewDay.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    return {
      days: 0,
      label: "ครบกำหนดทบทวนแล้ว (ทบทวนได้เลย)",
      isDue: true,
      interval,
    };
  } else if (diffDays === 1) {
    return {
      days: 1,
      label: `ทบทวนอีกครั้งใน 1 วัน (พรุ่งนี้ · ${formatThaiDate(target)})`,
      isDue: false,
      interval,
    };
  } else {
    return {
      days: diffDays,
      label: `ทบทวนอีกครั้งในอีก ${diffDays} วัน (${formatThaiDate(target)})`,
      isDue: false,
      interval,
    };
  }
}

function Skeleton({ lines }: { lines: number }) {
  return (
    <div className="flex flex-col gap-2 animate-pulse">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-3.5 rounded bg-border-color/60"
          style={{ width: i === lines - 1 ? "70%" : "100%" }}
        />
      ))}
    </div>
  );
}

export default function WordDetailPopup({ word, onClose, onUpdate }: WordDetailPopupProps) {
  const { speak } = useTTS("en-US");
  const wordStatusContext = useContext(WordStatusContext);
  const [detail, setDetail] = useState<WordDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dbProgress, setDbProgress] = useState<{
    wordId: string;
    nextReviewAt: string | null;
    interval: number | null;
  } | null>(null);

  const currentDbProgress = dbProgress?.wordId === word?.id ? dbProgress : null;

  const contextEntry = word?.word ? wordStatusContext?.getEntry(word.word) : null;
  const effectiveNextReviewAt =
    word?.nextReviewAt ?? contextEntry?.nextReviewAt ?? currentDbProgress?.nextReviewAt;
  const effectiveInterval =
    word?.interval ?? contextEntry?.interval ?? currentDbProgress?.interval;

  useEffect(() => {
    if (!word || word.nextReviewAt || contextEntry?.nextReviewAt) return;
    if (!word.id || word.id === word.word) return;

    let mounted = true;
    const fetchProgress = async () => {
      try {
        const { data } = await supabase
          .from("word_progress")
          .select("next_review_at, interval")
          .eq("word_id", word.id)
          .maybeSingle();

        if (mounted && data) {
          setDbProgress({
            wordId: word.id,
            nextReviewAt: data.next_review_at,
            interval: data.interval,
          });
        }
      } catch {
        // Ignore progress fetch error
      }
    };

    fetchProgress();

    return () => {
      mounted = false;
    };
  }, [word, contextEntry]);

  const reviewSchedule = computeReviewSchedule(effectiveNextReviewAt, effectiveInterval);

  const fetchDetail = useCallback(async (w: FeedWordRecord) => {
    setIsLoading(true);
    setError(null);
    setDetail(null);
    try {
      const res = await fetch("/api/word-detail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word: w.word,
          language: w.language,
          partOfSpeech: w.partOfSpeech,
        }),
      });
      if (!res.ok) {
        if (res.status === 429) {
          markBudgetExhausted();
          throw new Error("งบ AI วันนี้หมดแล้ว กรุณาลองใหม่พรุ่งนี้");
        }
        const err = await res.json().catch(() => ({}));
        let errMsg = "เกิดข้อผิดพลาด กรุณาลองใหม่";
        if (typeof err === "object" && err !== null) {
          if (typeof (err as { error?: unknown }).error === "string") {
            errMsg = (err as { error: string }).error;
          } else if (typeof (err as { error?: { message?: string } }).error?.message === "string") {
            errMsg = (err as { error: { message: string } }).error.message;
          }
        }
        throw new Error(errMsg);
      }
      const detailData = (await res.json()) as WordDetailResponse;
      setDetail(detailData);

      // If the word exists in DB but doesn't have a Thai translation yet, save it now
      if (w.id && w.id !== w.word && detailData.thai && (!w.thai || w.thai === w.word)) {
        try {
          const userRes = await supabase.auth.getUser();
          const userId = userRes.data.user?.id;
          if (userId) {
            const partOfSpeech = detailData.partOfSpeech || w.partOfSpeech || null;
            await supabase
              .from("words")
              .update({
                thai: detailData.thai,
                label: detailData.thai, // update label to Thai translation
                ...(partOfSpeech ? { part_of_speech: partOfSpeech } : {}),
              })
              .eq("id", w.id)
              .eq("user_id", userId);

            if (onUpdate) {
              onUpdate({
                id: w.id,
                thai: detailData.thai,
                partOfSpeech: partOfSpeech || undefined,
              });
            }
          }
        } catch (dbErr) {
          console.error("Failed to auto-update word translation in DB:", dbErr);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setIsLoading(false);
    }
  }, [onUpdate]);

  // Fetch when the selected word changes.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (word) fetchDetail(word);
  }, [word, fetchDetail]);

  // ESC to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!word || typeof document === "undefined") return null;

  const definition = detail?.definition;
  const usage = detail?.usage;
  const tense = detail?.tense || word.partOfSpeech;
  // Prefer the model's Thai translation; fall back to the handed-off thai
  // (but never show the English word itself as the "Thai" subtitle).
  const thai = detail?.thai || (word.thai !== word.word ? word.thai : "");

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[60] flex items-center justify-center p-5 backdrop-blur-sm bg-black/60"
      style={{ animation: "wdpBackdropIn 0.18s ease both" }}
    >
      <style>{`
        @keyframes wdpBackdropIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes wdpSheetIn {
          from { opacity: 0; transform: translateY(28px) scale(.96) }
          to { opacity: 1; transform: translateY(0) scale(1) }
        }
      `}</style>

      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        className="w-full max-w-[340px] rounded-[28px] border border-border-color bg-background p-6 shadow-soft-xl"
        style={{ animation: "wdpSheetIn 0.26s cubic-bezier(.2,.8,.25,1) both" }}
      >
        {/* Headline */}
        <div className="flex items-start justify-between gap-2">
          <div className="text-[30px] font-bold leading-tight tracking-tight text-foreground">
            {word.word}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิด"
            className="mt-1 shrink-0 rounded-full p-1.5 text-foreground/40 hover:bg-foreground/10 hover:text-foreground transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        {thai && (
          <div className="mt-1 text-base font-semibold text-foreground/60">
            {thai}
          </div>
        )}

        {/* Review Schedule / Spaced Repetition Info */}
        {reviewSchedule && (
          <div
            className={`mt-4 flex items-center justify-between px-3.5 py-2.5 rounded-2xl border text-xs font-medium ${
              reviewSchedule.isDue
                ? "bg-correct/10 border-correct/25 text-correct"
                : "bg-primary-bg/70 border-primary/25 text-foreground"
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Calendar
                size={15}
                className={reviewSchedule.isDue ? "text-correct shrink-0" : "text-primary shrink-0"}
              />
              <span className="truncate">{reviewSchedule.label}</span>
            </div>
            {typeof reviewSchedule.interval === "number" && reviewSchedule.interval > 0 && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-foreground/10 text-foreground/70 shrink-0 ml-1">
                รอบ {reviewSchedule.interval} วัน
              </span>
            )}
          </div>
        )}

        {/* Definition */}
        <div className="mt-4 rounded-2xl border border-primary/20 bg-primary-bg p-4">
          <div className="mb-1.5 text-sm font-bold text-primary">
            Definition
          </div>
          {isLoading ? (
            <Skeleton lines={2} />
          ) : error ? (
            <button
              type="button"
              onClick={() => fetchDetail(word)}
              className="text-sm font-semibold text-primary underline hover:text-primary-hover cursor-pointer"
            >
              {error} — ลองใหม่
            </button>
          ) : (
            <div className="text-[15px] leading-relaxed text-foreground/80">
              {definition || "ไม่มีข้อมูล"}
            </div>
          )}
        </div>

        {/* Usage */}
        {!error && (
          <>
            <div className="mt-5 flex items-center gap-2.5">
              <span className="text-sm font-bold text-primary">
                Usage
              </span>
              {tense && (
                <span className="rounded-full border border-primary/30 bg-primary-bg px-2.5 py-0.5 text-xs font-bold text-primary">
                  {tense}
                </span>
              )}
            </div>
            <div className="mt-2 text-[15px] italic leading-relaxed text-foreground/70">
              {isLoading ? <Skeleton lines={1} /> : usage}
            </div>
          </>
        )}

        {/* Listen */}
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => word.word && speak(word.word)}
            className="inline-flex h-[52px] items-center justify-center gap-2.5 rounded-2xl bg-primary px-7 text-sm font-bold tracking-wide text-white dark:text-gray-900 transition-all hover:bg-primary-hover active:scale-95 cursor-pointer shadow-soft-sm"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="2" width="6" height="12" rx="3" fill="currentColor" stroke="none" />
              <path d="M5 11a7 7 0 0 0 14 0" />
              <line x1="12" y1="18" x2="12" y2="22" />
              <line x1="8" y1="22" x2="16" y2="22" />
            </svg>
            กดเพื่อฟังเสียง
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

