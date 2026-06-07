'use client';

import Mascot from '@/app/chat/_components/Mascot';

export type ScanPhase = 'idle' | 'suck' | 'think' | 'reveal';

interface ScanLoadingMascotProps {
  /** Current animation phase. When 'idle' the overlay renders nothing. */
  phase: ScanPhase;
  /** Object URL of the captured image, shown being "sucked" into the mascot. */
  imageUrl: string | null;
}

/**
 * Full-screen loading overlay for the scan preview flow. The captured photo is
 * sucked into the elephant mascot, the mascot thinks while the AI works, then
 * pops happy as the discovered words are revealed.
 */
export default function ScanLoadingMascot({ phase, imageUrl }: ScanLoadingMascotProps) {
  if (phase === 'idle') return null;

  const isReveal = phase === 'reveal';
  const statusText =
    phase === 'suck'
      ? 'กำลังดูดภาพ…'
      : phase === 'think'
        ? 'กำลังคิด…'
        : 'เจอคำแล้ว!';

  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-[#FFF9F0]/95 text-text-primary backdrop-blur-sm animate-scan-fade-in dark:bg-[#1a1a2e]/95">
      <style>{`
        @keyframes scan-suck {
          0% {
            transform: translateY(-140px) scale(1) rotate(0deg);
            opacity: 1;
          }
          70% {
            transform: translateY(-20px) scale(0.35) rotate(8deg);
            opacity: 0.9;
          }
          100% {
            transform: translateY(10px) scale(0.04) rotate(20deg);
            opacity: 0;
          }
        }
        .animate-scan-suck {
          animation: scan-suck 1s cubic-bezier(0.55, 0, 0.55, 1) forwards;
          will-change: transform, opacity;
        }
        @keyframes scan-aura {
          0% { transform: scale(0.9); opacity: 0.15; box-shadow: 0 0 20px 10px rgba(64,150,255,0.3); }
          50% { transform: scale(1.1); opacity: 0.45; box-shadow: 0 0 44px 22px rgba(64,150,255,0.55); }
          100% { transform: scale(0.9); opacity: 0.15; box-shadow: 0 0 20px 10px rgba(64,150,255,0.3); }
        }
        .animate-scan-aura {
          animation: scan-aura 2s ease-in-out infinite;
        }
        @keyframes scan-fade-in { from { opacity: 0; } to { opacity: 1; } }
        .animate-scan-fade-in { animation: scan-fade-in 0.25s ease-out forwards; }
        @media (prefers-reduced-motion: reduce) {
          .animate-scan-suck, .animate-scan-aura { animation: none !important; }
        }
      `}</style>

      <div className="relative flex items-center justify-center">
        {/* Glowing aura behind the mascot while thinking */}
        {!isReveal && (
          <div className="absolute h-[160px] w-[160px] rounded-full animate-scan-aura" />
        )}

        {/* The photo being sucked into the mascot */}
        {phase === 'suck' && imageUrl && (
          <img
            src={imageUrl}
            alt=""
            aria-hidden="true"
            className="absolute h-28 w-28 rounded-2xl border-3 border-border-color object-cover shadow-nb-md animate-scan-suck"
          />
        )}

        <div className="relative">
          <Mascot size={130} state={isReveal ? 'happy' : 'thinking'} />
        </div>
      </div>

      <div className="mt-8 flex flex-col items-center gap-3">
        <p className="text-base font-extrabold text-text-primary">{statusText}</p>
        {phase === 'think' && (
          <div className="flex gap-1.5">
            <span className="loading-dot h-2 w-2 rounded-full bg-accent-blue" />
            <span className="loading-dot h-2 w-2 rounded-full bg-accent-blue" style={{ animationDelay: '0.15s' }} />
            <span className="loading-dot h-2 w-2 rounded-full bg-accent-blue" style={{ animationDelay: '0.3s' }} />
          </div>
        )}
      </div>
    </div>
  );
}
