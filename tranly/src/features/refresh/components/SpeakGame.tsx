'use client';

import { useState, useEffect } from 'react';
import { Mic, Volume2 } from 'lucide-react';
import { useTTS } from '@/shared/hooks/useTTS';
import { useSTT } from '@/shared/hooks/useSTT';
import type { GameProps } from '../gameTypes';
import { SpeakRound } from '../gameTypes';
import { useToast } from '@/shared/components/Toast';
import { useGameExit } from '../useGameExit';
import VoicePermissionModal, { PermissionModalStatus } from './VoicePermissionModal';

type SpeakState = 'idle' | 'listening' | 'correct' | 'wrong1' | 'wrong2';

/** Loosely compares recognized speech to the target word, ignoring case/punctuation. */
function normalizeSpokenText(s: string): string {
  return s.toLowerCase().trim().replace(/[.,!?]/g, '');
}

// Per-bar multipliers so the bars don't all move in lockstep.
const BAR_SCALE = [0.5, 0.8, 1, 0.8, 0.5];

function Waveform({ level }: { level: number }) {
  return (
    <div className="flex items-center justify-center gap-1 h-7" aria-label="กำลังฟัง">
      {BAR_SCALE.map((scale, i) => (
        <span
          key={i}
          className="w-1 rounded-full bg-white dark:bg-gray-900 transition-[height] duration-75"
          style={{ height: `${20 + level * scale * 80}%` }}
        />
      ))}
    </div>
  );
}

export default function SpeakGame(props: GameProps) {
  const { speak } = useTTS('en-US');
  const { startListening, isListening, level, isTranscribing, isSupported } = useSTT();
  const { showToast } = useToast();
  const { word, thai } = props;

  const [state, setState] = useState<SpeakState>('idle');
  const [attempts, setAttempts] = useState(0);
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

    // Evaluate when the recognition session ends (event-driven, not an effect).
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
          } else {
            showToast(err, 'error');
          }
          setState('idle');
          setAttempts((prev) => Math.max(0, prev - 1));
          return;
        }
        if (normalizeSpokenText(t) === normalizeSpokenText(word)) setState('correct');
        else setState(nextAttempt >= 2 ? 'wrong2' : 'wrong1');
      },
    });
  }

  async function handleMic() {
    if (isListening || isTranscribing || isExiting) return;

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

  // Auto-advance after a correct answer.
  useEffect(() => {
    if (state !== 'correct') return;
    const t = setTimeout(() => round.finish(round.score(attempts, true)), 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const cardBorder =
    state === 'correct' ? 'border-correct shadow-[0_0_20px] shadow-correct/30 bg-correct/5' :
    state === 'wrong1' ? 'border-warning shadow-[0_0_16px] shadow-warning/30 bg-warning/5' :
    state === 'wrong2' ? 'border-incorrect shadow-[0_0_16px] shadow-incorrect/30 bg-incorrect/5' :
    'border-border-color bg-card-bg';

  const cardAnim = isExiting ? 'animate-card-out' : 'animate-card-in';
  const canMic = (state === 'idle' || state === 'wrong1') && !isExiting && !isListening && !isTranscribing;

  return (
    <div className="flex-1 flex flex-col items-center">
      <div className="relative mt-8 mb-10 w-full max-w-xs mx-auto" style={{ height: 200 }}>
        <div className="absolute inset-x-4 top-2 h-full rounded-3xl bg-card-bg/60 border border-border-color/40" />
        <div className="absolute inset-x-2 top-1 h-full rounded-3xl bg-card-bg/85 border border-border-color/60" />
        <div
          className={`absolute inset-0 rounded-3xl bg-card-bg border flex flex-col items-center justify-center gap-3 transition-colors duration-300 ${cardBorder} ${cardAnim}`}
        >
          <span className="text-3xl font-bold text-foreground">{thai}</span>
          <button
            onClick={() => speak(word)}
            className="flex items-center gap-2 text-primary text-sm font-medium active:opacity-60 cursor-pointer"
          >
            <Volume2 size={18} /> ฟังเสียง
          </button>
        </div>
      </div>

      {state === 'wrong1' && (
        <p className="text-warning font-semibold mb-3 text-sm">ลองอีกครั้ง!</p>
      )}
      {state === 'wrong2' && (
        <p className="text-incorrect font-semibold mb-3 text-sm">
          ❌ คำที่ถูก: <span className="font-bold">{word}</span>
        </p>
      )}

      {state !== 'wrong2' && !isExiting && (
        <div className="flex gap-3 w-full max-w-xs">
          <button
            onClick={handleMic}
            disabled={!canMic}
            className="flex-1 py-5 rounded-2xl bg-primary hover:bg-primary-hover flex items-center justify-center active:scale-95 transition-all disabled:opacity-40 cursor-pointer shadow-soft-sm"
          >
            {isListening ? (
              <Waveform level={level} />
            ) : isTranscribing ? (
              <span className="text-white dark:text-gray-900 text-sm font-semibold animate-pulse">กำลังประมวลผล...</span>
            ) : (
              <Mic size={28} className="text-white dark:text-gray-900" />
            )}
          </button>
        </div>
      )}

      {state === 'wrong2' && !isExiting && (
        <button
          onClick={() => round.finish(round.score(attempts, false))}
          className="w-full max-w-xs py-4 rounded-2xl bg-primary hover:bg-primary-hover text-white dark:text-gray-900 font-bold text-lg active:scale-95 transition-transform cursor-pointer shadow-soft-sm"
        >
          ถัดไป
        </button>
      )}

      {(state === 'idle') && !isListening && !isTranscribing && !isExiting && (
        <button onClick={() => round.finish(round.score(0, false))} className="mt-6 text-foreground/50 hover:text-foreground text-sm transition-colors cursor-pointer">
          ตอนนี้ไม่สะดวกพูด
        </button>
      )}

      <VoicePermissionModal
        isOpen={permissionModalOpen}
        onClose={() => setPermissionModalOpen(false)}
        onAllow={runListening}
        status={permissionModalStatus}
      />
    </div>
  );
}

