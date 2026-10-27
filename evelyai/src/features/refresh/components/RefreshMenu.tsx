'use client';

import { useRouter } from 'next/navigation';
import AppShell from '@/shared/components/AppShell';
import { Layers, Mic, Keyboard, ChevronRight, Sparkles } from 'lucide-react';

export type RefreshMode = 'matching' | 'speak' | 'typing';

interface Props {
  onStartMode: (mode: RefreshMode) => void;
  withThai?: number;
  totalPlayable?: number;
  yellowCount?: number;
  isLoading?: boolean;
  isBudgetExhausted?: boolean;
}

const MIN_WORDS_TO_PLAY = 6;

export default function RefreshMenu({
  onStartMode,
  withThai = 0,
  totalPlayable,
  yellowCount = 0,
  isLoading = false,
  isBudgetExhausted = false,
}: Props) {
  const router = useRouter();
  const total = totalPlayable ?? withThai;
  const hasEnoughWords = total >= MIN_WORDS_TO_PLAY;
  const remainingToPlay = Math.max(0, MIN_WORDS_TO_PLAY - total);

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
      label: 'จับคู่ฟองศัพท์ (Bubble Pop)',
      desc: 'แตะฟองคำศัพท์และคำแปลที่ลอยให้ชนกันระเบิดก่อนหมดเวลา',
      icon: <Layers size={20} stroke="url(#refresh-grad)" />,
      isLocked: !hasEnoughWords,
      lockReason: !hasEnoughWords ? `ต้องการอีก ${remainingToPlay} คำ` : undefined,
      badge: 'รอบละ 3 คำ (สูงสุด 2 รอบ)',
    },
    {
      id: 'speak',
      label: 'ยิงพลังเสียง (Sonic Blaster)',
      desc: 'ชาร์จพลังงานเสียงและเปล่งเสียงคำศัพท์เพื่อยิงเป้าหมาย',
      icon: <Mic size={20} stroke="url(#refresh-grad)" />,
      isLocked: !hasEnoughWords,
      lockReason: !hasEnoughWords ? `ต้องการอีก ${remainingToPlay} คำ` : undefined,
      badge: '5 คำ / รอบ',
    },
    {
      id: 'typing',
      label: 'พิมพ์ศัพท์จับจังหวะ',
      desc: 'พิมพ์คำศัพท์ที่ไหลลงมาให้ทัน พร้อมฟังเสียงและเรียนรู้คำแปล',
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
            <p className="text-foreground/60 text-xs font-medium">คำศัพท์พร้อมฝึกฝน</p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <p className="text-2xl font-bold text-foreground">
                {isLoading ? '...' : `${total} คำ`}
              </p>
              {yellowCount > 0 && !isLoading && (
                <span className="text-[11px] font-semibold text-amber-500 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  ทบทวนด่วน {yellowCount} คำ (เล่นก่อน)
                </span>
              )}
            </div>
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
