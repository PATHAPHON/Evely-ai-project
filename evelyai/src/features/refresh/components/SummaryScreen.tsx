'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  AlertCircle,
  Volume2,
  RotateCcw,
  ChevronRight,
  Sparkles,
  Calendar,
} from 'lucide-react';
import AdSlot from '@/shared/components/AdSlot';
import WordDetailPopup from '@/shared/components/WordDetailPopup';
import { useTTS } from '@/shared/hooks/useTTS';
import type { FeedWordRecord } from '@/shared/types/wordTypes';
import type { WordReviewSummaryItem } from '../gameTypes';

interface Props {
  total: number;
  improved: number;
  isPractice: boolean;
  isPremium?: boolean;
  summaryItems?: WordReviewSummaryItem[];
  onPlayAgain?: () => void;
  onBackToMenu?: () => void;
  onRetryMissed?: () => void;
}

export default function SummaryScreen({
  total,
  improved,
  isPractice,
  isPremium = false,
  summaryItems = [],
  onPlayAgain,
  onBackToMenu,
  onRetryMissed,
}: Props) {
  const router = useRouter();
  const { speak } = useTTS('en-US');
  const [selectedWord, setSelectedWord] = useState<FeedWordRecord | null>(null);

  const isEmpty = total === 0 && summaryItems.length === 0;

  // Compute counts from summaryItems if available, otherwise fall back to improved/total
  const passedCount = summaryItems.length > 0
    ? summaryItems.filter((it) => it.isPassed).length
    : improved;
  const missedCount = summaryItems.length > 0
    ? summaryItems.filter((it) => !it.isPassed).length
    : Math.max(0, total - improved);

  function handleOpenWordDetail(item: WordReviewSummaryItem) {
    const feedWord: FeedWordRecord = {
      id: item.wordId,
      language: 'english',
      generatedDate: '',
      thai: item.thai,
      bookmarked: false,
      createdAt: 0,
      partOfSpeech: item.partOfSpeech ?? undefined,
      word: item.word,
      nextReviewAt: item.nextReviewAt,
      interval: item.newInterval,
    };
    setSelectedWord(feedWord);
  }

  if (isEmpty) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-background text-foreground px-6">
        <div className="text-6xl mb-6">📚</div>
        <h2 className="text-2xl font-bold mb-2">ยังไม่มีคำครบกำหนด</h2>
        <p className="text-foreground/60 mb-8 text-center max-w-sm">
          สะสมคำให้ครบ 40 คำ (มีคำแปลแล้ว) แล้วคำที่ถึงกำหนดทบทวนจะมาอยู่ที่นี่
        </p>

        {!isPremium && (
          <div className="mb-8 w-full max-w-xs">
            <AdSlot isPremium={isPremium} />
          </div>
        )}

        <div className="w-full max-w-xs flex flex-col gap-3">
          <button
            onClick={() => router.push('/new')}
            className="w-full py-4 rounded-2xl bg-primary hover:bg-primary-hover text-white dark:text-gray-900 font-bold text-lg active:scale-95 transition-all shadow-soft-sm cursor-pointer"
          >
            ไปสะสมคำที่แชต →
          </button>
          <button
            onClick={() => router.push('/')}
            className="w-full py-3.5 rounded-2xl text-foreground/70 hover:text-foreground font-medium text-sm transition-all cursor-pointer"
          >
            กลับหน้าหลัก
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col">
      {/* Scrollable Content */}
      <div className="flex-1 w-full max-w-md mx-auto px-4 pt-8 pb-44">
        {/* Header Section */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="text-5xl mb-3 animate-bounce">
            {missedCount === 0 ? '🎉' : '💡'}
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            {isPractice ? 'ฝึกซ้อมเสร็จแล้ว!' : 'รอบนี้เสร็จแล้ว!'}
          </h1>
          <p className="text-foreground/60 text-sm mt-1">
            {isPractice
              ? `ฝึกฝนทั้งหมด ${total} คำ`
              : `ทบทวนแล้ว ${total} คำ · ผ่านการทดสอบ ${passedCount} คำ`}
          </p>

          {isPractice && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 mt-2.5">
              <Sparkles size={13} />
              <span>โหมดฝึกซ้อม (ไม่กระทบตารางทบทวนหลัก)</span>
            </div>
          )}
        </div>

        {/* Overview Stats Cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="rounded-2xl bg-card-bg border border-border-color/80 p-3.5 flex items-center justify-between shadow-soft-xs">
            <div>
              <p className="text-[11px] font-medium text-foreground/60">จำแม่นแล้ว</p>
              <p className="text-xl font-bold text-correct mt-0.5">{passedCount} คำ</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-correct/10 flex items-center justify-center">
              <CheckCircle2 size={20} className="text-correct" />
            </div>
          </div>

          <div className="rounded-2xl bg-card-bg border border-border-color/80 p-3.5 flex items-center justify-between shadow-soft-xs">
            <div>
              <p className="text-[11px] font-medium text-foreground/60">ต้องทบทวนเพิ่ม</p>
              <p className="text-xl font-bold text-incorrect mt-0.5">{missedCount} คำ</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-incorrect/10 flex items-center justify-center">
              <AlertCircle size={20} className="text-incorrect" />
            </div>
          </div>
        </div>

        {/* Word Breakdown List (Spaced Repetition Evaluation) */}
        {summaryItems.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2.5 px-1">
              <h2 className="text-sm font-bold text-foreground">ผลประเมินรายคำ (Spaced Repetition)</h2>
              <span className="text-[11px] text-foreground/50 font-medium">
                แตะเพื่อดูรายละเอียด
              </span>
            </div>

            <div className="flex flex-col gap-2.5">
              {summaryItems.map((item) => {
                const isPassed = item.isPassed;
                const mistakesText =
                  item.mistakes === 0
                    ? 'ไม่ผิดเลย'
                    : `ผิด ${item.mistakes} ครั้ง`;

                // Calculate user-friendly interval text
                let nextReviewLabel = 'ทบทวนอีกครั้ง: พรุ่งนี้ (+1 วัน)';
                if (isPassed && item.newInterval > 1) {
                  nextReviewLabel = `ทบทวนอีกครั้ง: อีก ${item.newInterval} วัน (+${item.newInterval} วัน)`;
                }

                return (
                  <div
                    key={item.wordId}
                    onClick={() => handleOpenWordDetail(item)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && handleOpenWordDetail(item)}
                    className="group w-full text-left rounded-2xl bg-card-bg border border-border-color/80 hover:border-primary/50 p-3.5 transition-all active:scale-[0.99] cursor-pointer shadow-soft-xs flex flex-col gap-2"
                  >
                    {/* Top Row: Word, TTS Audio, Part of Speech, Status Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-base font-bold text-foreground">
                            {item.word}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              speak(item.word);
                            }}
                            className="p-1 rounded-lg text-primary hover:bg-primary-bg/50 transition-colors cursor-pointer"
                            title="ฟังเสียงอ่าน"
                            aria-label={`ฟังเสียงอ่านคำว่า ${item.word}`}
                          >
                            <Volume2 size={16} />
                          </button>
                          {item.partOfSpeech && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-foreground/10 text-foreground/65 border border-border-color">
                              {item.partOfSpeech}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-foreground/75 font-medium mt-0.5 truncate">
                          {item.thai}
                        </p>
                      </div>

                      <div className="shrink-0 flex items-center gap-1.5">
                        {isPassed ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-correct/10 text-correct border border-correct/20">
                            <span>จำแม่นแล้ว 🌟</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-incorrect/10 text-incorrect border border-incorrect/20">
                            <span>ต้องทบทวนเพิ่ม ⚠️</span>
                          </span>
                        )}
                        <ChevronRight
                          size={15}
                          className="text-foreground/30 group-hover:text-primary transition-colors"
                        />
                      </div>
                    </div>

                    {/* Bottom Row: Mistakes & SuperMemo Next Review Interval */}
                    <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-border-color/50 text-foreground/65">
                      <span className="font-medium">
                        ความแม่นยำ: <strong className={item.mistakes === 0 ? 'text-correct font-semibold' : 'text-incorrect font-semibold'}>{mistakesText}</strong>
                      </span>
                      <span className="inline-flex items-center gap-1 text-foreground/60 font-medium">
                        <Calendar size={12} className="shrink-0 text-primary" />
                        <span>{nextReviewLabel}</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Ad Slot for Free Users */}
        {!isPremium && (
          <div className="my-6 w-full">
            <AdSlot isPremium={isPremium} />
          </div>
        )}
      </div>

      {/* Sticky Bottom Action Bar */}
      <div className="fixed bottom-0 inset-x-0 bg-background/95 backdrop-blur-md border-t border-border-color p-4 pb-6 z-20 shadow-soft-lg">
        <div className="w-full max-w-md mx-auto flex flex-col gap-2.5">
          {/* If there are missed words, prioritize Instant Retry for Missed Words */}
          {missedCount > 0 && onRetryMissed ? (
            <>
              <button
                type="button"
                onClick={onRetryMissed}
                className="w-full py-3.5 rounded-2xl bg-primary hover:bg-primary-hover text-white dark:text-gray-900 font-bold text-base active:scale-98 transition-all shadow-soft-sm cursor-pointer flex items-center justify-center gap-2"
              >
                <RotateCcw size={18} />
                <span>ทบทวนเฉพาะคำที่ผิดทันที ({missedCount} คำ)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onPlayAgain) onPlayAgain();
                  else router.push('/refresh');
                }}
                className="w-full py-2.5 rounded-2xl bg-card-bg border border-border-color hover:bg-primary-bg/20 text-foreground font-semibold text-sm active:scale-98 transition-all cursor-pointer"
              >
                เล่นอีกรอบ (คำชุดใหม่)
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (onPlayAgain) onPlayAgain();
                else router.push('/refresh');
              }}
              className="w-full py-3.5 rounded-2xl bg-primary hover:bg-primary-hover text-white dark:text-gray-900 font-bold text-base active:scale-98 transition-all shadow-soft-sm cursor-pointer"
            >
              เล่นอีกรอบ
            </button>
          )}

          {/* Sub Navigation Links */}
          <div className="flex items-center justify-center gap-6 pt-1">
            <button
              type="button"
              onClick={() => {
                if (onBackToMenu) onBackToMenu();
                else router.push('/refresh');
              }}
              className="text-xs text-foreground/70 hover:text-foreground font-medium transition-colors cursor-pointer"
            >
              กลับเมนูทบทวน
            </button>
            <span className="text-foreground/30 text-xs">|</span>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="text-xs text-foreground/70 hover:text-foreground font-medium transition-colors cursor-pointer"
            >
              กลับหน้าหลัก
            </button>
          </div>
        </div>
      </div>

      {/* Word Detail Popup */}
      <WordDetailPopup
        word={selectedWord}
        onClose={() => setSelectedWord(null)}
      />
    </div>
  );
}

