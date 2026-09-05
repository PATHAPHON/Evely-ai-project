'use client';

import { useState, useEffect } from 'react';
import { Mic, RotateCcw, Volume2 } from 'lucide-react';
import { useTTS } from '@/shared/hooks/useTTS';
import { useSTT } from '@/shared/hooks/useSTT';
import type { GameProps } from '../gameTypes';
import { SpeakRound, EXIT_ANIM_MS } from '../gameTypes';
import { useToast } from '@/shared/components/Toast';
import { useGameExit } from '../useGameExit';
import VoicePermissionModal, { PermissionModalStatus } from './VoicePermissionModal';

type SpeakState = 'idle' | 'listening' | 'correct' | 'wrong1' | 'wrong2' | 'skipped';

export interface SpeakGameProps extends GameProps {
  onFallbackToTyping?: () => void;
  onSkip?: () => void;
  imageUrl?: string | null;
}

/** Loosely compares recognized speech to the target word, ignoring case/punctuation. */
function normalizeSpokenText(s: string): string {
  return s.toLowerCase().trim().replace(/[.,!?]/g, '');
}

// Per-bar multipliers for the waveform
const BAR_SCALE = [0.4, 0.7, 1, 0.7, 0.4];

function Waveform({ level }: { level: number }) {
  return (
    <div className="flex items-center justify-center gap-1.5 h-8" aria-label="กำลังฟัง">
      {BAR_SCALE.map((scale, i) => (
        <span
          key={i}
          className="w-1.5 rounded-full bg-slate-900 transition-[height] duration-75"
          style={{ height: `${20 + level * scale * 80}%` }}
        />
      ))}
    </div>
  );
}

export default function SpeakGame(props: SpeakGameProps) {
  const { speak } = useTTS('en-US');
  const { startListening, stopListening, isListening, level, isTranscribing, isSupported } = useSTT();
  const { showToast } = useToast();
  const { word, thai, onFallbackToTyping, onSkip, imageUrl } = props;

  const [state, setState] = useState<SpeakState>('idle');
  const [attempts, setAttempts] = useState(0);
  const [isSkipExiting, setIsSkipExiting] = useState(false);
  const { isExiting, round } = useGameExit(
    (roundProps, onExitStart) => new SpeakRound(roundProps, onExitStart),
    props,
  );

  const [permissionModalOpen, setPermissionModalOpen] = useState(false);
  const [permissionModalStatus, setPermissionModalStatus] = useState<PermissionModalStatus>('unrequested');

  function runListening() {
    const nextAttempt = attempts + 1;
    setAttempts(nextAttempt);
    setState('listening');

    startListening({
      autoStopSilenceMs: 1500,
      maxDurationMs: 6000,
      onEnd: (t, err) => {
        if (err) {
          if (
            err.includes('อนุญาตการใช้ไมโครโฟน') ||
            err.includes('NotAllowedError') ||
            err.includes('Permission denied')
          ) {
            setPermissionModalStatus('denied');
            setPermissionModalOpen(true);
          } else if (err.includes('ไม่รองรับ')) {
            setPermissionModalStatus('unsupported');
            setPermissionModalOpen(true);
          } else if (err.includes('งบ AI') || err.includes('budget') || err.includes('429')) {
            showToast('งบ AI วันนี้เต็มแล้ว — สลับเป็นโหมดพิมพ์ให้อัตโนมัติ', 'info');
            onFallbackToTyping?.();
            return;
          } else {
            showToast(err, 'error');
          }
          setState('idle');
          setAttempts((prev) => Math.max(0, prev - 1));
          return;
        }

        if (normalizeSpokenText(t) === normalizeSpokenText(word)) {
          setState('correct');
        } else {
          setState(nextAttempt >= 2 ? 'wrong2' : 'wrong1');
        }
      },
    });
  }

  async function handleMic() {
    if (isTranscribing || isExiting || isSkipExiting) return;

    if (isListening) {
      stopListening();
      return;
    }

    if (!isSupported) {
      setPermissionModalStatus('unsupported');
      setPermissionModalOpen(true);
      return;
    }

    try {
      if (navigator.permissions && navigator.permissions.query) {
        const res = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        if (res.state === 'denied') {
          setPermissionModalStatus('denied');
          setPermissionModalOpen(true);
          return;
        } else if (res.state === 'prompt') {
          setPermissionModalStatus('unrequested');
          setPermissionModalOpen(true);
          return;
        }
      }
    } catch {
      // Fallback if permissions query is unsupported
    }

    runListening();
  }

  // Auto-advance & auto-TTS on correct
  useEffect(() => {
    if (state !== 'correct') return;
    speak(word);
    const t = setTimeout(() => {
      round.finish(round.score(attempts, true));
    }, 1200);
    return () => clearTimeout(t);
  }, [state, word, attempts, round, speak]);

  // Auto-advance & auto-TTS on wrong2 (missed 2 attempts)
  useEffect(() => {
    if (state !== 'wrong2') return;
    speak(word);
    const t = setTimeout(() => {
      round.finish(round.score(attempts, false));
    }, 1900);
    return () => clearTimeout(t);
  }, [state, word, attempts, round, speak]);

  // Skip / loop handler
  function handleSkipClick() {
    if (
      state === 'correct' ||
      state === 'wrong2' ||
      state === 'skipped' ||
      isExiting ||
      isSkipExiting ||
      isListening ||
      isTranscribing
    ) {
      return;
    }

    setState('skipped');
    speak(word);
    setTimeout(() => {
      setIsSkipExiting(true);
      setTimeout(() => {
        onSkip?.();
      }, EXIT_ANIM_MS);
    }, 1500);
  }

  const cardBorder =
    state === 'correct'
      ? 'border-emerald-500 shadow-[0_0_24px_rgba(16,185,129,0.35)] bg-emerald-500/10'
      : state === 'wrong1'
        ? 'border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.35)] bg-amber-500/10 animate-shake'
        : state === 'wrong2'
          ? 'border-rose-500 shadow-[0_0_24px_rgba(244,63,94,0.35)] bg-rose-500/10'
          : state === 'skipped'
            ? 'border-[#1cb0f6] shadow-[0_0_20px_rgba(28,176,246,0.35)] bg-[#1cb0f6]/10'
            : isListening
              ? 'border-[#1cb0f6] shadow-[0_0_24px_rgba(28,176,246,0.3)] bg-card-bg'
              : 'border-border-color bg-card-bg border-b-4 border-b-border-color/80';

  const cardAnim = (isExiting || isSkipExiting) ? 'animate-card-out' : 'animate-card-in';
  const canMic = (state === 'idle' || state === 'wrong1') && !isExiting && !isSkipExiting && !isTranscribing;
  const canSkip = (state === 'idle' || state === 'wrong1') && !isExiting && !isSkipExiting && !isListening && !isTranscribing;

  return (
    <div className="flex-1 flex flex-col items-center justify-between py-2 sm:py-4">
      {/* Center card area with layered deck effect */}
      <div className="w-full flex-1 flex items-center justify-center min-h-[300px] max-h-[380px] my-auto">
        <div className="relative w-full max-w-xs h-[280px] sm:h-[300px]">
          {/* Layered Card Deck Illusion (4 layers behind main card) */}
          <div className="absolute inset-x-8 -top-4 h-full rounded-[2.5rem] border border-border-color/30 bg-card-bg/25 pointer-events-none" />
          <div className="absolute inset-x-6 -top-3 h-full rounded-[2.5rem] border border-border-color/45 bg-card-bg/45 pointer-events-none" />
          <div className="absolute inset-x-4 -top-2 h-full rounded-[2.5rem] border border-border-color/60 bg-card-bg/65 pointer-events-none" />
          <div className="absolute inset-x-2 -top-1 h-full rounded-[2.5rem] border border-border-color/80 bg-card-bg/85 pointer-events-none" />

          {/* Front Main Card */}
          <div
            className={`relative w-full h-full rounded-[2.5rem] border-2 flex flex-col items-center justify-center p-6 transition-all duration-300 shadow-xl ${cardBorder} ${cardAnim}`}
          >
            {/* Illustration area (Hybrid: image if available, else subtle styled visual) */}
            {imageUrl ? (
              <div className="w-28 h-28 flex items-center justify-center mb-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt={word}
                  className="max-h-full max-w-full object-contain drop-shadow-sm"
                />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-3xl bg-foreground/[0.03] dark:bg-foreground/[0.06] border border-border-color/40 flex items-center justify-center mb-3 shadow-inner">
                <Volume2 size={32} className="text-foreground/35" />
              </div>
            )}

            {/* Thai word */}
            <span className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-wide text-center">
              {thai}
            </span>

            {/* Feedback & Word Reveal */}
            {state === 'wrong1' && (
              <p className="text-amber-500 dark:text-amber-400 font-bold text-sm mt-3 animate-shake">
                ลองอีกครั้ง!
              </p>
            )}

            {state === 'wrong2' && (
              <div className="mt-3 flex flex-col items-center animate-card-fade-in text-center">
                <span className="text-[11px] font-bold text-rose-500 uppercase tracking-wider">
                  คำตอบที่ถูกต้องคือ
                </span>
                <span className="text-2xl sm:text-3xl font-black text-rose-500 dark:text-rose-400 mt-0.5">
                  {word}
                </span>
              </div>
            )}

            {state === 'skipped' && (
              <div className="mt-3 flex flex-col items-center animate-card-fade-in text-center">
                <span className="text-[11px] font-bold text-[#1cb0f6] uppercase tracking-wider">
                  คำศัพท์คือ
                </span>
                <span className="text-2xl sm:text-3xl font-black text-[#1cb0f6] mt-0.5">
                  {word}
                </span>
              </div>
            )}

            {state === 'correct' && (
              <div className="mt-3 flex flex-col items-center animate-card-fade-in text-center">
                <span className="text-[11px] font-bold text-emerald-500 uppercase tracking-wider">
                  ถูกต้อง!
                </span>
                <span className="text-2xl sm:text-3xl font-black text-emerald-500 dark:text-emerald-400 mt-0.5">
                  {word}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Controls Area */}
      <div className="w-full max-w-xs flex flex-col items-center mt-auto">
        {/* Buttons Row: Large 3D Blue Mic + Tactile Skip Button */}
        <div className="flex items-center gap-3.5 w-full">
          <button
            onClick={handleMic}
            disabled={!canMic && !isListening}
            aria-label={isListening ? 'กำลังฟัง กดเพื่อหยุด' : 'กดเพื่อพูด'}
            className={`flex-1 h-18 sm:h-20 rounded-2xl sm:rounded-3xl flex items-center justify-center transition-all cursor-pointer select-none ${
              isListening
                ? 'bg-[#1cb0f6] border-b-2 border-[#1479ab] shadow-[0_0_24px_rgba(28,176,246,0.45)] scale-[0.98]'
                : canMic
                  ? 'bg-[#1cb0f6] hover:bg-[#1899d6] border-b-[5px] border-[#1479ab] active:border-b-0 active:translate-y-[5px] shadow-md'
                  : 'bg-[#1cb0f6]/50 border-b-2 border-[#1479ab]/50 opacity-50 cursor-not-allowed'
            }`}
          >
            {isListening ? (
              <Waveform level={level} />
            ) : isTranscribing ? (
              <span className="text-slate-900 font-bold text-sm animate-pulse">กำลังประมวลผล...</span>
            ) : (
              <Mic size={34} className="text-slate-900" strokeWidth={2.6} />
            )}
          </button>

          <button
            onClick={handleSkipClick}
            disabled={!canSkip}
            aria-label="ข้ามคำนี้เพื่อวนกลับมาใหม่"
            title="ข้ามคำนี้เพื่อวนกลับมาใหม่"
            className={`w-18 h-18 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl flex items-center justify-center transition-all cursor-pointer select-none ${
              canSkip
                ? 'bg-slate-800 dark:bg-[#18232c] hover:bg-slate-700 dark:hover:bg-[#22303c] border border-slate-700 dark:border-[#2a3744] border-b-[5px] border-b-slate-950 dark:border-b-[#10171d] active:border-b-0 active:translate-y-[5px] shadow-md'
                : 'bg-slate-800/40 dark:bg-[#18232c]/40 border border-border-color/30 border-b-2 border-b-border-color/30 opacity-40 cursor-not-allowed'
            }`}
          >
            <RotateCcw size={26} className="text-[#1cb0f6]" strokeWidth={2.6} />
          </button>
        </div>

        {/* Can't speak right now text link */}
        {onFallbackToTyping && (
          <button
            type="button"
            onClick={onFallbackToTyping}
            className="text-foreground/45 hover:text-foreground/80 text-xs sm:text-sm font-medium transition-colors cursor-pointer active:opacity-60 py-2 px-4 mt-4"
          >
            ตอนนี้ไม่สะดวกพูด
          </button>
        )}
      </div>

      <VoicePermissionModal
        isOpen={permissionModalOpen}
        onClose={() => setPermissionModalOpen(false)}
        onAllow={runListening}
        status={permissionModalStatus}
      />
    </div>
  );
}

