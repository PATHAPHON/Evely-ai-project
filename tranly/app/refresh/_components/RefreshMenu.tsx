'use client';

import GeminiLayout from '@/app/_components/GeminiLayout';
import { Headphones, BookOpen, Mic } from 'lucide-react';

interface Props {
  onStart: () => void;
  disabled?: boolean;
}

const MODES = [
  { icon: <Headphones size={20} stroke="url(#refresh-grad)" />, label: 'ฟัง', desc: 'ฟังบทสนทนาโต้ตอบแบบธรรมชาติในรูปแบบ Podcast โดย AI' },
  { icon: <BookOpen size={20} stroke="url(#refresh-grad)" />,   label: 'อ่าน', desc: 'พัฒนาทักษะการอ่านผ่านเรื่องสั้นและนิยายฝึกภาษาโดย AI' },
  { icon: <Mic size={20} stroke="url(#refresh-grad)" />,        label: 'พูด', desc: 'ฝึกออกเสียงประโยคตามธรรมชาติที่แนะนำและตรวจผลโดย AI' },
];

export default function RefreshMenu({ onStart, disabled = false }: Props) {
  return (
    <GeminiLayout title="ทบทวน">
      {/* Hidden SVG Gradient Definition for Refresh Icons */}
      <svg width="0" height="0" className="absolute pointer-events-none" style={{ position: 'absolute', width: 0, height: 0 }}>
        <defs>
          <linearGradient id="refresh-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4f8df7" />
            <stop offset="100%" stopColor="#1b62d1" />
          </linearGradient>
        </defs>
      </svg>

      <div className="flex flex-col gap-6 p-4 pb-24">

        {/* Featured card */}
        <div className="rounded-3xl bg-gradient-to-br from-primary to-primary-hover p-6 shadow-soft-md">
          <p className="text-white/80 dark:text-gray-900/80 text-sm mb-1">คำที่ต้องทบทวนวันนี้</p>
          <p className="text-white dark:text-gray-900 font-bold text-xl mb-4">ฝึกคำศัพท์ที่ยังไม่แม่น</p>
          <button
            onClick={onStart}
            disabled={disabled}
            className="w-full py-4 rounded-2xl bg-white dark:bg-gray-900 text-primary dark:text-primary font-bold text-base active:scale-95 transition-transform disabled:opacity-50 cursor-pointer shadow-soft-sm"
          >
            {disabled ? 'กำลังโหลด…' : 'เริ่มเลย'}
          </button>
        </div>

        {/* Mode list */}
        <div>
          <p className="text-foreground/50 text-sm font-medium mb-3 px-1">โหมดการฝึกฝนเพิ่มเติม</p>
          <div className="flex flex-col gap-2">
            {MODES.map((m, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-4 py-4 rounded-2xl bg-card-bg/60 border border-border-color/60 opacity-65 select-none pointer-events-none"
              >
                <div className="flex-1 min-w-0 pr-3">
                  <p className="font-bold text-foreground flex items-center gap-2">
                    {m.label}
                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-foreground/5 text-foreground/45 border border-foreground/10 uppercase tracking-wider">
                      Coming Soon
                    </span>
                  </p>
                  <p className="text-foreground/50 text-xs font-medium mt-1">{m.desc}</p>
                </div>
                <div className="w-10 h-10 shrink-0 rounded-full bg-background border border-border-color/60 flex items-center justify-center">
                  {m.icon}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </GeminiLayout>
  );
}
