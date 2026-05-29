"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ConfigProvider } from "antd";
import useIllustrationTheme from "@/app/theme/illustrationTheme";
import ScanButton from "@/app/scan/_components/ScanButton";
import {
  useWordStorage,
  type WordRecord,
} from "./_lib/useWordStorage";
import { useLanguagePreference } from "@/app/_lib/useLanguagePreference";
import { useTTS } from "@/app/chat/_lib/useTTS";
import { FlashcardMode } from "./_components/FlashcardMode";

type ViewMode = "words" | "flashcard";

function formatDate(ts: number) {
  const d = new Date(ts);
  return d.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function WordCard({
  word,
  onDelete,
}: {
  word: WordRecord;
  onDelete: (id: string) => void;
}) {
  const url = useMemo(() => URL.createObjectURL(word.imageBlob), [word.imageBlob]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  const { language } = useLanguagePreference();
  const { speak } = useTTS("ko-KR");

  const korean = word.korean || '';
  const thai = word.label && word.label !== korean ? word.label : '';
  const reading = word.reading || '';
  const romanization = word.romanization || reading || korean || thai;
  const canSpeak = Boolean(korean);
  const translation = language === 'thai' ? thai : (word.english || '');

  return (
    <div className="rounded-2xl border-3 border-black dark:border-[#4a4a6a] bg-white dark:bg-[#2d2d44] p-3 shadow-[4px_4px_0_#000000] dark:shadow-[4px_4px_0_rgba(0,0,0,0.4)] flex gap-3 items-center">
      <img
        src={url}
        alt={korean || thai}
        className="w-32 h-32 object-cover rounded-xl border-3 border-black dark:border-[#4a4a6a]"
      />
      <div className="flex-1 min-w-0">
        <p className="text-xl font-extrabold text-black dark:text-white truncate">
          {romanization}
        </p>
        {korean && (
          <p className="text-base font-extrabold text-black dark:text-white truncate mt-0.5">
            {korean}
          </p>
        )}
        {language === 'thai' ? (
          <>
            {reading && (
              <p className="text-sm font-bold text-black/50 dark:text-white/50 truncate">{reading}</p>
            )}
            {translation && (
              <p className="text-sm font-bold text-black/70 dark:text-white/70 truncate">{translation}</p>
            )}
          </>
        ) : (
          translation && (
            <p className="text-sm font-bold text-black/70 dark:text-white/70 truncate">{translation}</p>
          )
        )}
        <p className="text-[10px] font-bold text-black/40 dark:text-white/40 mt-1">
          {formatDate(word.createdAt)}
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => canSpeak && speak(korean)}
          disabled={!canSpeak}
          className="w-9 h-9 rounded-xl border-3 border-black dark:border-[#4a4a6a] bg-[#4DABF7] text-white font-extrabold shadow-[2px_2px_0_#000000] dark:shadow-[2px_2px_0_rgba(0,0,0,0.4)] active:translate-y-[2px] active:shadow-[1px_1px_0_#000000] dark:active:shadow-[1px_1px_0_rgba(0,0,0,0.4)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
          aria-label="ฟังเสียง"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => {
            if (confirm(`ลบคำว่า "${korean}"?`)) onDelete(word.id);
          }}
          className="w-9 h-9 rounded-xl border-3 border-black dark:border-[#4a4a6a] bg-[#FFF0F6] dark:bg-[#3d2d44] text-black dark:text-white font-extrabold shadow-[2px_2px_0_#000000] dark:shadow-[2px_2px_0_rgba(0,0,0,0.4)] active:translate-y-[2px] active:shadow-[1px_1px_0_#000000] dark:active:shadow-[1px_1px_0_rgba(0,0,0,0.4)]"
          aria-label="ลบ"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

const SAMPLE_SEED_FLAG = 'tarnly:sample-seeded:v4';

/**
 * Draw the apple emoji onto a canvas and return a JPEG Blob.
 * Used to seed a realistic-looking sample word card without shipping an
 * extra image asset.
 */
async function generateAppleSampleBlob(): Promise<Blob | null> {
  if (typeof document === "undefined") return null;
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Soft cream background matching the app theme.
  ctx.fillStyle = "#FFF0F6";
  ctx.fillRect(0, 0, size, size);

  // Big centered apple emoji.
  ctx.font = "180px 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("🍎", size / 2, size / 2 + 8);

  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.9);
  });
}

export default function LearnPage() {
  const configProps = useIllustrationTheme();
  const router = useRouter();
  const { list, remove, save } = useWordStorage();
  const [words, setWords] = useState<WordRecord[] | null>(null);
  const [mode, setMode] = useState<ViewMode>("words");
  const [flashcardStudying, setFlashcardStudying] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      let records = await list();

      // Remove any older sample records (label "แอปเปิ้ล" with missing Korean
      // fields) leftover from earlier seed versions, then seed the latest
      // sample if this seed version hasn't run yet.
      if (!localStorage.getItem(SAMPLE_SEED_FLAG)) {
        try {
          const stale = records.filter(
            (r) => r.label === 'แอปเปิ้ล' && !r.korean
          );
          for (const s of stale) {
            await remove(s.id);
          }

          const blob = await generateAppleSampleBlob();
          if (blob) {
            await save(blob, {
              label: 'แอปเปิ้ล',
              korean: '사과',
              reading: 'ซากวา',
              romanization: 'sagwa',
              english: 'apple',
            });
            localStorage.setItem(SAMPLE_SEED_FLAG, '1');
            records = await list();
          }
        } catch {
          // ignore seed failure
        }
      }
      if (!cancelled) setWords(records);
    };

    load().catch(() => {
      if (!cancelled) setWords([]);
    });

    return () => {
      cancelled = true;
    };
  }, [list, save, remove]);

  const handleDelete = async (id: string) => {
    await remove(id);
    setWords((prev) => prev?.filter((w) => w.id !== id) ?? null);
  };

  return (
    <ConfigProvider {...configProps}>
      <div className="w-full h-dvh bg-white dark:bg-[#1a1a2e] text-[#2C2C2C] dark:text-white flex flex-col relative overflow-hidden font-sans select-none">
        <div
          className="flex-1 overflow-y-auto"
          style={{ paddingBottom: "calc(120px + env(safe-area-inset-bottom, 0px))" }}
        >
          <div className="p-[20px_16px_0]">
            <div className="pt-[10px]">
              <div
                className="font-extrabold text-[28px] tracking-tight leading-[1.1] text-black dark:text-white"
                style={{ fontFamily: "var(--font-outfit), sans-serif" }}
              >
                My Words
              </div>
              <div className="text-black dark:text-white/80 text-sm mt-1 font-bold">
                Saved vocabulary for your Flashcards
              </div>
            </div>

            {/* Mode toggle switch: All words ↔ Flashcard.
                Hidden while studying so the user must finish or cancel first. */}
            {!flashcardStudying && (
            <div className="mt-4 inline-flex rounded-xl border-3 border-black dark:border-[#4a4a6a] bg-white dark:bg-[#2d2d44] p-1 shadow-[3px_3px_0_#000000] dark:shadow-[3px_3px_0_rgba(0,0,0,0.4)]">
              <button
                type="button"
                onClick={() => setMode("words")}
                className={`rounded-lg px-4 py-1.5 text-sm font-extrabold transition-colors ${
                  mode === "words"
                    ? "bg-accent-pink-bg text-black dark:text-white border-3 border-black dark:border-[#4a4a6a]"
                    : "text-black/50 dark:text-white/50"
                }`}
              >
                คำทั้งหมด
              </button>
              <button
                type="button"
                onClick={() => setMode("flashcard")}
                className={`rounded-lg px-4 py-1.5 text-sm font-extrabold transition-colors ${
                  mode === "flashcard"
                    ? "bg-accent-pink-bg text-black dark:text-white border-3 border-black dark:border-[#4a4a6a]"
                    : "text-black/50 dark:text-white/50"
                }`}
              >
                Flashcard
              </button>
            </div>
            )}
          </div>

          <div className="px-4 mt-6 flex flex-col gap-3">
            {words === null && (
              <p className="text-center text-sm font-bold text-black/40 dark:text-white/40 mt-12">
                Loading...
              </p>
            )}
            {words !== null && words.length === 0 && (
              <div className="mt-12 flex flex-col items-center gap-4 text-center">
                <p className="text-base font-bold text-black/60 dark:text-white/60">
                  No saved words yet
                </p>
                <button
                  type="button"
                  onClick={() => router.push("/scan")}
                  className="rounded-xl border-3 border-black dark:border-[#4a4a6a] bg-[#52C41A] px-5 py-3 font-extrabold text-white shadow-[4px_4px_0_#000000] dark:shadow-[4px_4px_0_rgba(0,0,0,0.4)] active:translate-y-[2px] active:shadow-[2px_2px_0_#000000] dark:active:shadow-[2px_2px_0_rgba(0,0,0,0.4)]"
                >
                  Scan Now
                </button>
              </div>
            )}
            {words !== null && words.length > 0 && mode === "words" &&
              words.map((w) => (
                <WordCard key={w.id} word={w} onDelete={handleDelete} />
              ))}
            {words !== null && words.length > 0 && mode === "flashcard" && (
              <FlashcardMode
                words={words}
                onStudyingChange={setFlashcardStudying}
              />
            )}
          </div>
        </div>

        {/* Bottom tab bar (Learn active). Hidden while studying a flashcard set
            so navigation is locked until the user finishes or cancels. */}
        {!flashcardStudying && (
        <div
          className="absolute left-4 right-4 h-[80px] bg-card-bg border-3 border-border-color p-[8px_8px_14px] grid grid-cols-5 z-40 rounded-2xl shadow-[4px_4px_0_#000000] dark:shadow-[4px_4px_0_rgba(0,0,0,0.4)]"
          style={{ bottom: "calc(16px + env(safe-area-inset-bottom, 0px))" }}
        >
          <a
            className="flex flex-col items-center gap-1 cursor-pointer text-text-secondary"
            onClick={() => router.push("/home")}
          >
            <span className="w-10 h-10 flex items-center justify-center rounded-xl">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
              </svg>
            </span>
            <span className="text-[11px] font-bold tracking-wider">Home</span>
          </a>

          <a className="flex flex-col items-center gap-1 cursor-pointer text-text-primary">
            <span className="w-10 h-10 flex items-center justify-center rounded-xl bg-accent-pink-bg border-3 border-border-color shadow-[2px_2px_0_#000000] dark:shadow-[2px_2px_0_rgba(0,0,0,0.4)]">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="4 7 4 4 20 4 20 7" />
                <line x1="9" y1="20" x2="15" y2="20" />
                <line x1="12" y1="4" x2="12" y2="20" />
              </svg>
            </span>
            <span className="text-[11px] font-bold tracking-wider">Word</span>
          </a>

          <ScanButton />

          <a
            className="flex flex-col items-center gap-1 cursor-pointer text-text-secondary"
            onClick={() => router.push("/chat")}
          >
            <span className="w-10 h-10 flex items-center justify-center rounded-xl">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v2" />
                <path d="M12 19v2" />
                <path d="M5 12H3" />
                <path d="M21 12h-2" />
                <path d="M6.3 6.3 4.9 4.9" />
                <path d="M19.1 19.1 17.7 17.7" />
                <path d="M6.3 17.7 4.9 19.1" />
                <path d="M19.1 4.9 17.7 6.3" />
                <circle cx="12" cy="12" r="4" />
              </svg>
            </span>
            <span className="text-[11px] font-bold tracking-wider">AI</span>
          </a>

          <a
            className="flex flex-col items-center gap-1 cursor-pointer text-text-secondary"
            onClick={() => router.push("/profile")}
          >
            <span className="w-10 h-10 flex items-center justify-center rounded-xl">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="8" r="4" />
                <path d="M20 21a8 8 0 0 0-16 0" />
              </svg>
            </span>
            <span className="text-[11px] font-bold tracking-wider">Profile</span>
          </a>
        </div>
        )}
      </div>
    </ConfigProvider>
  );
}
