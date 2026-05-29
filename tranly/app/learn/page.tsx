"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ConfigProvider, message } from "antd";
import useIllustrationTheme from "@/app/theme/illustrationTheme";
import ScanButton from "@/app/scan/_components/ScanButton";
import {
  useWordStorage,
  type WordRecord,
} from "./_lib/useWordStorage";
import { useLanguagePreference } from "@/app/_lib/useLanguagePreference";
import { useStrings } from "@/app/_lib/strings";
import { useTTS } from "@/app/chat/_lib/useTTS";
import PageHeader from "@/app/_components/PageHeader";
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
  const t = useStrings();
  const { speak } = useTTS("ko-KR");

  const korean = word.korean || '';
  const thai = word.label && word.label !== korean ? word.label : '';
  const reading = word.reading || '';
  const romanization = word.romanization || reading || korean || thai;
  const canSpeak = Boolean(korean);
  const translation = language === 'thai' ? thai : (word.english || '');

  return (
    <div className="rounded-2xl border-3 border-border-color bg-card-bg p-3 shadow-nb-md flex gap-3 items-center">
      <img
        src={url}
        alt={korean || thai}
        className="w-32 h-32 object-cover rounded-xl border-3 border-border-color"
      />
      <div className="flex-1 min-w-0">
        {/* Primary: the headword the learner reads first. */}
        <p className="text-xl font-extrabold text-text-primary truncate">
          {romanization}
        </p>
        {/* Secondary: the Korean script — important but not the headword. */}
        {korean && (
          <p className="text-base font-bold text-text-primary truncate mt-0.5">
            {korean}
          </p>
        )}
        {language === 'thai' ? (
          <>
            {reading && (
              <p className="text-sm font-semibold text-text-secondary truncate">{reading}</p>
            )}
            {translation && (
              <p className="text-sm font-semibold text-text-secondary truncate">{translation}</p>
            )}
          </>
        ) : (
          translation && (
            <p className="text-sm font-semibold text-text-secondary truncate">{translation}</p>
          )
        )}
        {/* Meta: de-emphasized, AA-legible. */}
        <p className="text-[11px] font-medium text-text-meta mt-1">
          {formatDate(word.createdAt)}
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => canSpeak && speak(korean)}
          disabled={!canSpeak}
          className="w-9 h-9 rounded-xl border-3 border-border-color bg-accent-blue text-white font-extrabold shadow-nb-sm active:translate-y-[2px] active:shadow-[1px_1px_0_var(--shadow-color)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
          aria-label={t.learn.listenAria}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => onDelete(word.id)}
          className="w-9 h-9 rounded-xl border-3 border-black dark:border-[#4a4a6a] bg-[#FFF0F6] dark:bg-[#3d2d44] text-black dark:text-white font-extrabold shadow-nb-sm active:translate-y-[2px] active:shadow-[1px_1px_0_var(--shadow-color)]"
          aria-label={t.learn.deleteAria}
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
  const t = useStrings();
  const [messageApi, contextHolder] = message.useMessage();
  const { list, remove, save } = useWordStorage();
  const [words, setWords] = useState<WordRecord[] | null>(null);
  const [mode, setMode] = useState<ViewMode>("words");
  const [flashcardStudying, setFlashcardStudying] = useState(false);
  // Deletes are soft: the card disappears immediately and the real removal is
  // committed only after the Undo window closes. Pending timers are tracked so
  // Undo can cancel them — and so unmounting commits anything still pending.
  const pendingDeletes = useRef(new Map<string, () => void>());

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

  // Commit any deletes still inside their Undo window when leaving the screen,
  // so a soft-deleted word doesn't silently reappear on the next visit.
  useEffect(() => {
    const pending = pendingDeletes.current;
    return () => {
      pending.forEach((commit) => commit());
      pending.clear();
    };
  }, []);

  const handleDelete = (id: string) => {
    const target = words?.find((w) => w.id === id);
    if (!target) return;
    const index = words!.indexOf(target);
    const korean = target.korean || target.label || "";
    const key = `delete-${id}`;

    // Optimistically remove from view.
    setWords((prev) => prev?.filter((w) => w.id !== id) ?? null);

    const commit = () => {
      if (!pendingDeletes.current.has(id)) return;
      pendingDeletes.current.delete(id);
      clearTimeout(timer);
      messageApi.destroy(key);
      remove(id).catch(() => {});
    };

    const undo = () => {
      if (!pendingDeletes.current.has(id)) return;
      pendingDeletes.current.delete(id);
      clearTimeout(timer);
      messageApi.destroy(key);
      setWords((prev) => {
        if (!prev) return prev;
        const next = [...prev];
        next.splice(Math.min(index, next.length), 0, target);
        return next;
      });
    };

    const timer = setTimeout(commit, 5000);
    pendingDeletes.current.set(id, commit);

    messageApi.open({
      key,
      type: "success",
      duration: 0, // managed manually so Undo stays for the full window
      content: (
        <span className="inline-flex items-center gap-3">
          {t.learn.deleted(korean)}
          <button
            type="button"
            onClick={undo}
            className="font-extrabold underline underline-offset-2"
          >
            {t.learn.undo}
          </button>
        </span>
      ),
    });
  };

  return (
    <ConfigProvider {...configProps}>
      {contextHolder}
      <div className="w-full h-dvh bg-white dark:bg-[#1a1a2e] text-[#2C2C2C] dark:text-white flex flex-col relative overflow-hidden font-sans select-none">
        <div
          className="flex-1 overflow-y-auto"
          style={{ paddingBottom: "calc(120px + env(safe-area-inset-bottom, 0px))" }}
        >
          <PageHeader
            title={t.learn.title}
            subtitle={t.learn.subtitle}
          >
            {/* Mode toggle switch: All words ↔ Flashcard.
                Hidden while studying so the user must finish or cancel first. */}
            {!flashcardStudying && (
            <div className="mt-4 inline-flex rounded-xl border-3 border-black dark:border-[#4a4a6a] bg-white dark:bg-[#2d2d44] p-1 shadow-nb-sm">
              <button
                type="button"
                onClick={() => setMode("words")}
                className={`rounded-lg px-4 py-1.5 text-sm font-extrabold transition-colors ${
                  mode === "words"
                    ? "bg-accent-pink-bg text-black dark:text-white border-3 border-black dark:border-[#4a4a6a]"
                    : "text-text-secondary"
                }`}
              >
                {t.learn.allWords}
              </button>
              <button
                type="button"
                onClick={() => setMode("flashcard")}
                className={`rounded-lg px-4 py-1.5 text-sm font-extrabold transition-colors ${
                  mode === "flashcard"
                    ? "bg-accent-pink-bg text-black dark:text-white border-3 border-black dark:border-[#4a4a6a]"
                    : "text-text-secondary"
                }`}
              >
                {t.learn.flashcard}
              </button>
            </div>
            )}
          </PageHeader>

          <div className="px-4 mt-6 flex flex-col gap-3">
            {words === null && (
              <p className="text-center text-sm font-bold text-text-meta mt-12">
                {t.common.loading}
              </p>
            )}
            {words !== null && words.length === 0 && (
              <div className="mt-12 flex flex-col items-center gap-4 text-center">
                <p className="text-base font-bold text-black/60 dark:text-white/60">
                  {t.learn.noWords}
                </p>
                <button
                  type="button"
                  onClick={() => router.push("/scan")}
                  className="rounded-xl border-3 border-black dark:border-[#4a4a6a] bg-accent-green px-5 py-3 font-extrabold text-white shadow-nb-md active:translate-y-[2px] active:shadow-nb-sm"
                >
                  {t.learn.scanNow}
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
          className="absolute left-4 right-4 h-[80px] bg-card-bg border-3 border-border-color p-[8px_8px_14px] grid grid-cols-5 z-40 rounded-2xl shadow-nb-md"
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
            <span className="text-[11px] font-bold tracking-wider">{t.common.tabHome}</span>
          </a>

          <a className="flex flex-col items-center gap-1 cursor-pointer text-text-primary">
            <span className="w-10 h-10 flex items-center justify-center rounded-xl bg-accent-pink-bg border-3 border-border-color shadow-nb-sm">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="4 7 4 4 20 4 20 7" />
                <line x1="9" y1="20" x2="15" y2="20" />
                <line x1="12" y1="4" x2="12" y2="20" />
              </svg>
            </span>
            <span className="text-[11px] font-bold tracking-wider">{t.common.tabWord}</span>
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
            <span className="text-[11px] font-bold tracking-wider">{t.common.tabAI}</span>
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
            <span className="text-[11px] font-bold tracking-wider">{t.common.tabProfile}</span>
          </a>
        </div>
        )}
      </div>
    </ConfigProvider>
  );
}
