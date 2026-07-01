'use client';

import { X } from 'lucide-react';

interface GameShellProps {
  progress: number; // 0–1
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function GameShell({ progress, onClose, title, children }: GameShellProps) {
  return (
    <div className="min-h-dvh flex flex-col bg-background text-foreground">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 pt-[calc(16px+env(safe-area-inset-top))] pb-3">
        <button onClick={onClose} className="p-1 text-foreground/50 hover:text-foreground active:scale-90 transition-all cursor-pointer">
          <X size={18} />
        </button>
        <div className="flex-1 h-3 rounded-full bg-card-bg border border-border-color/60 overflow-hidden">
          <div
            className="h-full rounded-full bg-correct transition-all duration-500"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>

      {/* Title */}
      <h1 className="px-4 pt-2 pb-1 text-2xl font-bold">{title}</h1>

      {/* Game content */}
      <div className="flex-1 flex flex-col px-4 pb-8">
        {children}
      </div>
    </div>
  );
}

