'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Mic,
  RotateCcw,
  Volume2,
  VolumeX,
  Zap,
  Crosshair,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { useTTS } from '@/shared/hooks/useTTS';
import { useSTT } from '@/shared/hooks/useSTT';
import type { GameProps } from '../gameTypes';
import { SpeakRound, EXIT_ANIM_MS } from '../gameTypes';
import { useToast } from '@/shared/components/Toast';
import { useGameExit } from '../useGameExit';
import VoicePermissionModal, { PermissionModalStatus } from './VoicePermissionModal';
import { gameAudio } from '../utils/gameAudio';

type SpeakState = 'idle' | 'listening' | 'firing' | 'correct' | 'wrong1' | 'wrong2' | 'skipped';

export interface SpeakGameProps extends GameProps {
  onFallbackToTyping?: () => void;
  onSkip?: () => void;
}

/** Loosely compares recognized speech to the target word, ignoring case/punctuation. */
function normalizeSpokenText(s: string): string {
  return s.toLowerCase().trim().replace(/[.,!?]/g, '');
}

interface BlastParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
}

export default function SpeakGame(props: SpeakGameProps) {
  const { speak } = useTTS('en-US');
  const { startListening, stopListening, isListening, level, isTranscribing, isSupported } = useSTT();
  const { showToast } = useToast();
  const { word, thai, onFallbackToTyping, onSkip } = props;

  const [state, setState] = useState<SpeakState>('idle');
  const [attempts, setAttempts] = useState(0);
  const [isSkipExiting, setIsSkipExiting] = useState(false);
  const [isMuted, setIsMuted] = useState(gameAudio.getMuted());
  const [particles, setParticles] = useState<BlastParticle[]>([]);
  const nextParticleIdRef = useRef(0);

  const { isExiting, round } = useGameExit(
    (roundProps, onExitStart) => new SpeakRound(roundProps, onExitStart),
    props,
  );

  const [permissionModalOpen, setPermissionModalOpen] = useState(false);
  const [permissionModalStatus, setPermissionModalStatus] = useState<PermissionModalStatus>('unrequested');

  // Spawn explosion particles
  const spawnExplosionParticles = () => {
    const count = 18;
    const colors = ['#38bdf8', '#818cf8', '#c084fc', '#f59e0b', '#ffffff'];
    const newParticles: BlastParticle[] = [];

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const speed = Math.random() * 3.5 + 2.0;
      newParticles.push({
        id: nextParticleIdRef.current++,
        x: 0,
        y: 0,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: colors[i % colors.length],
        size: Math.random() * 5 + 3,
        life: 1.0,
      });
    }

    setParticles(newParticles);
  };

  // Particles animation frame loop
  useEffect(() => {
    if (particles.length === 0) return;
    const anim = requestAnimationFrame(() => {
      setParticles((prev) =>
        prev
          .map((p) => ({
            ...p,
            x: p.x + p.vx * 3.5,
            y: p.y + p.vy * 3.5,
            life: p.life - 0.045,
          }))
          .filter((p) => p.life > 0)
      );
    });
    return () => cancelAnimationFrame(anim);
  }, [particles]);

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

        const isMatch = normalizeSpokenText(t) === normalizeSpokenText(word);

        if (isMatch) {
          // Fire sonic laser beam!
          setState('firing');
          gameAudio.playLaserBlast();

          setTimeout(() => {
            gameAudio.playTargetExplosion();
            spawnExplosionParticles();
            setState('correct');
          }, 240);
        } else {
          // Misfire / Shield deflection
          gameAudio.playShieldDeflect();
          setState(nextAttempt >= 2 ? 'wrong2' : 'wrong1');
        }
      },
    });
  }

  async function handleMic() {
    if (isTranscribing || isExiting || isSkipExiting || state === 'firing') return;

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

  const finishedRef = useRef(false);

  // Auto-advance & auto-TTS on correct
  useEffect(() => {
    if (state !== 'correct') return;
    finishedRef.current = false;

    let timeoutId: NodeJS.Timeout | null = null;
    const finishRound = () => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      if (timeoutId) clearTimeout(timeoutId);
      setTimeout(() => {
        round.finish(round.score(attempts, true));
      }, 400);
    };

    timeoutId = setTimeout(() => {
      finishRound();
    }, 10000);

    speak(word, {
      onEnd: () => finishRound(),
      onError: () => finishRound(),
    });

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [state, word, attempts, round, speak]);

  // Auto-advance & auto-TTS on wrong2 (missed 2 attempts)
  useEffect(() => {
    if (state !== 'wrong2') return;
    finishedRef.current = false;

    let timeoutId: NodeJS.Timeout | null = null;
    const finishRound = () => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      if (timeoutId) clearTimeout(timeoutId);
      setTimeout(() => {
        round.finish(round.score(attempts, false));
      }, 500);
    };

    timeoutId = setTimeout(() => {
      finishRound();
    }, 10000);

    speak(word, {
      onEnd: () => finishRound(),
      onError: () => finishRound(),
    });

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [state, word, attempts, round, speak]);

  // Skip / Tactical Evade handler
  function handleSkipClick() {
    if (
      state === 'correct' ||
      state === 'firing' ||
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

    let isDone = false;
    let fallbackTimeout: NodeJS.Timeout | null = null;

    const proceedSkip = () => {
      if (isDone) return;
      isDone = true;
      if (fallbackTimeout) clearTimeout(fallbackTimeout);
      setTimeout(() => {
        setIsSkipExiting(true);
        setTimeout(() => {
          onSkip?.();
        }, EXIT_ANIM_MS);
      }, 400);
    };

    fallbackTimeout = setTimeout(() => {
      proceedSkip();
    }, 10000);

    speak(word, {
      onEnd: () => proceedSkip(),
      onError: () => proceedSkip(),
    });
  }

  const isDangerZone = state === 'wrong1';
  const isTargetDestroyed = state === 'correct';
  const cardAnim = isExiting || isSkipExiting ? 'animate-card-out' : 'animate-card-in';
  const canMic = (state === 'idle' || state === 'wrong1') && !isExiting && !isSkipExiting && !isTranscribing;
  const canSkip = (state === 'idle' || state === 'wrong1') && !isExiting && !isSkipExiting && !isListening && !isTranscribing;

  return (
    <div className="flex-1 flex flex-col items-center justify-between py-2 sm:py-4 relative w-full max-w-sm mx-auto select-none min-h-[500px]">
      {/* Top HUD Status Bar */}
      <div className="w-full flex items-center justify-between px-2 mb-2">
        <div className="flex items-center gap-1.5">
          <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
            <Crosshair size={12} />
            SONIC BLASTER
          </span>
          {isDangerZone && (
            <span className="flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse">
              <ShieldAlert size={12} />
              DANGER ZONE
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setIsMuted(gameAudio.toggleMute())}
          aria-label={isMuted ? 'เปิดเสียง' : 'ปิดเสียง'}
          className="p-1.5 rounded-full bg-card-bg border border-border-color/80 text-foreground/60 hover:text-foreground active:scale-90 transition-all shadow-soft-xs cursor-pointer"
        >
          {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
        </button>
      </div>

      {/* Target Arena (Top / Center) */}
      <div className="w-full flex-1 flex flex-col items-center justify-center relative min-h-[240px]">
        {/* Holographic Aiming Crosshair Grid */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
          <div className="w-64 h-64 rounded-full border border-dashed border-cyan-400 animate-spin-slow" />
          <div className="w-44 h-44 rounded-full border border-cyan-500/40" />
        </div>

        {/* Laser Beam Shooting Upwards */}
        {state === 'firing' && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-3.5 h-64 bg-gradient-to-t from-cyan-400 via-sky-200 to-white rounded-full shadow-[0_0_24px_rgba(34,211,238,1)] animate-pulse z-30 pointer-events-none" />
        )}

        {/* Approaching Target Drone / Core */}
        <div
          className={`relative w-full max-w-xs transition-all duration-300 ${
            isDangerZone ? 'translate-y-6 scale-105' : 'translate-y-0 scale-100'
          }`}
        >
          <div
            className={`relative w-full rounded-3xl border-2 p-6 flex flex-col items-center justify-center backdrop-blur-md shadow-xl transition-all duration-300 ${cardAnim} ${
              isTargetDestroyed
                ? 'border-emerald-400 bg-emerald-500/15 shadow-[0_0_30px_rgba(16,185,129,0.5)] scale-95 opacity-90'
                : isDangerZone
                ? 'border-rose-500 bg-rose-500/15 shadow-[0_0_25px_rgba(244,63,94,0.5)] animate-shake'
                : state === 'wrong2'
                ? 'border-rose-500 bg-rose-500/20 shadow-[0_0_25px_rgba(244,63,94,0.4)]'
                : isListening
                ? 'border-cyan-400 bg-cyan-500/10 shadow-[0_0_25px_rgba(34,211,238,0.35)]'
                : 'border-border-color/80 bg-card-bg shadow-soft-sm'
            }`}
          >
            {/* Target Reticle Badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-foreground/[0.05] border border-border-color/60 text-[10px] font-bold text-foreground/60 mb-2">
              <Crosshair size={12} className={isDangerZone ? 'text-rose-500' : 'text-cyan-400'} />
              <span>{isDangerZone ? 'ระยะประชิด: 30M' : 'เป้าหมายตรวจจับ: 100M'}</span>
            </div>

            {/* Prompt Thai Word */}
            <span className="text-3xl sm:text-4xl font-black text-foreground tracking-wide text-center">
              {thai}
            </span>

            {/* Target Feedback Overlay */}
            {isTargetDestroyed && (
              <div className="mt-3 flex flex-col items-center animate-card-fade-in text-center">
                <span className="flex items-center gap-1 text-[11px] font-black text-emerald-400 uppercase tracking-widest">
                  <Sparkles size={14} />
                  {attempts === 1 ? 'DIRECT HIT! PERFECT SHOT' : 'TARGET DESTROYED!'}
                </span>
                <span className="text-2xl sm:text-3xl font-black text-emerald-400 mt-0.5 inline-flex items-center justify-center gap-2">
                  <span>{word}</span>
                  <Volume2 size={22} className="text-emerald-400 animate-pulse" />
                </span>
              </div>
            )}

            {isDangerZone && (
              <div className="mt-2.5 flex items-center gap-1 text-rose-400 font-extrabold text-xs">
                <ShieldAlert size={14} />
                <span>เกราะสะท้อนการยิง! ลองปรับเสียงแล้วยิงอีกครั้ง</span>
              </div>
            )}

            {state === 'wrong2' && (
              <div className="mt-3 flex flex-col items-center animate-card-fade-in text-center">
                <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider">
                  คลื่นเสียงที่ถูกต้องคือ
                </span>
                <span className="text-2xl sm:text-3xl font-black text-rose-400 mt-0.5 inline-flex items-center justify-center gap-2">
                  <span>{word}</span>
                  <Volume2 size={22} className="text-rose-400 animate-pulse" />
                </span>
              </div>
            )}

            {state === 'skipped' && (
              <div className="mt-3 flex flex-col items-center animate-card-fade-in text-center">
                <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">
                  ข้ามเป้าหมาย — คำศัพท์คือ
                </span>
                <span className="text-2xl sm:text-3xl font-black text-cyan-400 mt-0.5 inline-flex items-center justify-center gap-2">
                  <span>{word}</span>
                  <Volume2 size={22} className="text-cyan-400 animate-pulse" />
                </span>
              </div>
            )}

            {/* Explosion Particle Emitter */}
            {particles.map((p) => (
              <div
                key={p.id}
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  transform: `translate(${p.x}px, ${p.y}px) scale(${p.life})`,
                  width: `${p.size}px`,
                  height: `${p.size}px`,
                  backgroundColor: p.color,
                  opacity: p.life,
                  borderRadius: '9999px',
                  boxShadow: `0 0 12px ${p.color}`,
                  pointerEvents: 'none',
                  zIndex: 40,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Sonic Cannon & Core Energy Reactor */}
      <div className="w-full max-w-xs flex flex-col items-center mt-auto">
        {/* Status Prompt Line */}
        <div className="text-center text-xs font-bold mb-3 h-5 flex items-center justify-center">
          {isListening ? (
            <span className="text-cyan-400 flex items-center gap-1.5 animate-pulse">
              <Zap size={14} />
              กำลังชาร์จพลังงานเสียง... พูดคำภาษาอังกฤษเลย!
            </span>
          ) : isTranscribing ? (
            <span className="text-amber-400 animate-pulse">กำลังล็อกพิกัดและประมวลผลเสียง...</span>
          ) : state === 'firing' ? (
            <span className="text-cyan-300 font-extrabold animate-bounce">FIRING SONIC BEAM!</span>
          ) : isDangerZone ? (
            <span className="text-rose-400 font-bold">เป้าหมายกำลังประชิด! แตะปืนใหญ่แล้วยิงอีกครั้ง</span>
          ) : (
            <span className="text-foreground/50">แตะปืนใหญ่แล้วออกเสียงภาษาอังกฤษเพื่อยิงเป้าหมาย</span>
          )}
        </div>

        {/* Sonic Cannon Trigger Controls */}
        <div className="flex items-center gap-3 w-full">
          {/* Main Core Energy Reactor / Mic Button */}
          <button
            type="button"
            onClick={handleMic}
            disabled={!canMic && !isListening}
            aria-label={isListening ? 'กำลังชาร์จพลังเสียง แตะเพื่อยิง' : 'แตะเพื่อชาร์จปืนใหญ่'}
            className={`flex-1 h-20 rounded-3xl flex flex-col items-center justify-center relative overflow-hidden transition-all duration-200 cursor-pointer select-none ${
              isListening
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 border-2 border-cyan-300 shadow-[0_0_30px_rgba(34,211,238,0.6)]'
                : canMic
                ? 'bg-gradient-to-br from-card-bg via-card-bg/90 to-primary/10 border-2 border-primary/50 hover:border-primary active:scale-95 shadow-soft-sm'
                : 'bg-card-bg/40 border border-border-color/40 opacity-50 cursor-not-allowed'
            }`}
          >
            {/* Real-time Voice Volume Halo Glow based on `level` */}
            {isListening && (
              <div
                className="absolute inset-0 bg-cyan-300/30 rounded-3xl pointer-events-none transition-transform duration-75"
                style={{ transform: `scale(${1 + Math.min(level, 1) * 0.45})` }}
              />
            )}

            {isListening ? (
              <div className="flex items-center gap-1.5 z-10" aria-label="คลื่นเสียงชาร์จ">
                {[0.4, 0.7, 1, 0.7, 0.4].map((scale, i) => (
                  <span
                    key={i}
                    className="w-1.5 rounded-full bg-white transition-[height] duration-75 shadow-[0_0_8px_white]"
                    style={{ height: `${20 + level * scale * 70}%`, minHeight: '12px' }}
                  />
                ))}
              </div>
            ) : isTranscribing ? (
              <span className="text-amber-400 font-extrabold text-xs z-10 animate-pulse">LOCKING...</span>
            ) : (
              <div className="flex items-center gap-2 z-10 text-primary">
                <Mic size={26} strokeWidth={2.5} />
                <span className="font-extrabold text-sm tracking-wide">
                  {isDangerZone ? 'ยิงอีกครั้ง' : 'ชาร์จพลังยิง'}
                </span>
              </div>
            )}
          </button>

          {/* Tactical Skip Button */}
          <button
            type="button"
            onClick={handleSkipClick}
            disabled={!canSkip}
            aria-label="หลบหลีกและข้ามคำนี้"
            title="หลบหลีกและข้ามคำนี้"
            className={`w-20 h-20 rounded-3xl flex flex-col items-center justify-center transition-all cursor-pointer select-none border ${
              canSkip
                ? 'bg-card-bg border-border-color/80 hover:border-cyan-400 active:scale-95 text-foreground/60 hover:text-cyan-400 shadow-soft-xs'
                : 'bg-card-bg/30 border-border-color/30 opacity-40 cursor-not-allowed text-foreground/30'
            }`}
          >
            <RotateCcw size={22} strokeWidth={2.4} />
            <span className="text-[10px] font-bold mt-1">หลบหลีก</span>
          </button>
        </div>
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
