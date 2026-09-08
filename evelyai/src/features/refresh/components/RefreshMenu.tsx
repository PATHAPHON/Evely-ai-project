'use client';

import { useRouter } from 'next/navigation';
import AppShell from '@/shared/components/AppShell';
import { Layers, Mic, Keyboard, ChevronRight, Sparkles } from 'lucide-react';

export type RefreshMode = 'matching' | 'speak' | 'typing';

interface Props {
  onStartMode: (mode: RefreshMode) => void;
  withThai?: number;
  isLoading?: boolean;
  isBudgetExhausted?: boolean;
}

const WORDS_PER_MODE = 5;
const WORDS_FOR_MATCHING = 3;

export default function RefreshMenu({
  onStartMode,
  withThai = 0,
  isLoading = false,
  isBudgetExhausted = false,
}: Props) {
  const router = useRouter();
  const hasEnoughWords = withThai >= WORDS_PER_MODE;
  const hasEnoughForMatching = withThai >= WORDS_FOR_MATCHING;
  const remainingToPlay = Math.max(0, WORDS_PER_MODE - withThai);
  const remainingForMatching = Math.max(0, WORDS_FOR_MATCHING - withThai);

  const modes: {
    id: RefreshMode;
    label: string;
    desc: string;
    icon: React.ReactNode;
    isLocked: boolean;
    lockReason?: string;
    badge: string;
  }[] = [
    {
      id: 'matching',
      label: 'จับคู่คำ',
      desc: 'จับคู่คำศัพท์และความหมายภาษาไทย (รอบละ 3 คำ)',
      icon: <Layers size={20} stroke="url(#refresh-grad)" />,
      isLocked: !hasEnoughForMatching,
      lockReason: !hasEnoughForMatching ? `ต้องการอีก ${remainingForMatching} คำ` : undefined,
      badge: 'รอบละ 3 คำ (สูงสุด 2 รอบ)',
    },
    {
      id: 'speak',
      label: 'พูดออกเสียง',
      desc: 'ฝึกออกเสียงคำศัพท์เป็นภาษาอังกฤษด้วย AI',
      icon: <Mic size={20} stroke="url(#refresh-grad)" />,
      isLocked: isBudgetExhausted || !hasEnoughWords,
      lockReason: isBudgetExhausted
        ? 'งบ AI วันนี้เต็มแล้ว'
        : !hasEnoughWords
          ? `ต้องการอีก ${remainingToPlay} คำ`
          : undefined,
      badge: '5 คำ / รอบ',
    },
    {
      id: 'typing',
      label: 'พิมพ์แปลคำ',
      desc: 'ฝึกสะกดและพิมพ์คำแปลภาษาไทยของคำศัพท์',
      icon: <Keyboard size={20} stroke="url(#refresh-grad)" />,
      isLocked: !hasEnoughWords,
      lockReason: !hasEnoughWords ? `ต้องการอีก ${remainingToPlay} คำ` : undefined,
      badge: '5 คำ / รอบ',
    },
  ];

  return (
    <AppShell title="ทบทวน">
      {/* Hidden SVG Gradient Definition for Refresh Icons */}
      <svg width="0" height="0" className="absolute pointer-events-none" style={{ position: 'absolute', width: 0, height: 0 }}>
        <defs>
          <linearGradient id="refresh-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4f8df7" />
            <stop offset="100%" stopColor="#1b62d1" />
          </linearGradient>
        </defs>
      </svg>

      <div className="flex flex-col gap-5 p-4 pb-24">
        {/* Status overview card */}
        <div className="rounded-2xl bg-card-bg border border-border-color/80 p-4 shadow-soft-sm flex items-center justify-between">
          <div>
            <p className="text-foreground/60 text-xs font-medium">คำที่ถึงกำหนดทบทวน</p>
            <p className="text-2xl font-bold text-foreground mt-0.5">
              {isLoading ? '...' : `${withThai} คำ`}
            </p>
          </div>
          {isLoading ? (
            <div className="text-xs text-foreground/50">กำลังโหลด...</div>
          ) : !hasEnoughWords ? (
            <button
              onClick={() => router.push('/new')}
              className="text-xs font-semibold text-primary hover:underline cursor-pointer px-2.5 py-1.5 rounded-lg bg-primary/10 transition-colors"
            >
              ไปสะสมคำที่แชต →
            </button>
          ) : (
            <div className="flex items-center gap-1 text-xs font-medium text-correct bg-correct/10 border border-correct/20 px-2.5 py-1 rounded-full">
              <span>พร้อมทบทวน</span>
            </div>
          )}
        </div>

        {isBudgetExhausted && (
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-foreground/5 border border-border-color text-foreground/70 text-xs font-medium">
            <Sparkles size={16} className="shrink-0 text-primary" />
            <span>งบ AI วันนี้เต็มแล้ว — โหมดพูดจะปิดชั่วคราวและเปิดใหม่พรุ่งนี้</span>
          </div>
        )}

        {/* Mode list */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <p className="text-foreground/70 text-sm font-semibold">เลือกฝึกฝนรายโหมด</p>
            <span className="text-xs text-foreground/45 font-medium">5 คำ / รอบ</span>
          </div>

          <div className="flex flex-col gap-3">
            {modes.map((m) => {
              const disabled = isLoading || m.isLocked;

              return (
                <button
                  key={m.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => onStartMode(m.id)}
                  className={`w-full text-left flex items-center justify-between p-4 rounded-2xl border transition-all ${
                    disabled
                      ? 'bg-card-bg/40 border-border-color/40 opacity-60 cursor-not-allowed'
                      : 'bg-card-bg border-border-color/80 hover:border-primary/50 hover:bg-card-bg/90 active:scale-[0.99] cursor-pointer shadow-soft-sm'
                  }`}
                >
                  <div className="flex items-center gap-3.5 flex-1 min-w-0 pr-3">
                    <div className="w-11 h-11 shrink-0 rounded-2xl bg-background border border-border-color/70 flex items-center justify-center shadow-soft-xs">
                      {m.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-base text-foreground">{m.label}</span>
                        {m.lockReason ? (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-foreground/10 text-foreground/60 border border-border-color">
                            {m.lockReason}
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                            {m.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-foreground/55 text-xs font-medium mt-1 truncate">{m.desc}</p>
                    </div>
                  </div>

                  <div className="shrink-0 text-foreground/40 pl-1">
                    <ChevronRight size={18} className={disabled ? 'opacity-40' : 'text-foreground/60'} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
