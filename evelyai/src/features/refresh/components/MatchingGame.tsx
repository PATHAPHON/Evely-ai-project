'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Volume2, VolumeX, Sparkles, Flame, Timer, Zap } from 'lucide-react';
import { gameAudio } from '../utils/gameAudio';
import { matchingQuality } from '../quality';

export interface MatchingItem {
  id: string;
  wordId: string;
  word: string;
  thai: string;
}

export interface MatchingResult {
  wordId: string;
  quality: number;
  mistakes: number;
}

interface MatchingGameProps {
  items: MatchingItem[];
  roundNumber: number;
  totalRounds: number;
  onRoundComplete: (results: MatchingResult[]) => void;
}

interface BubbleData {
  id: string;
  wordId: string;
  rawWord: string;
  text: string;
  type: 'english' | 'thai';
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  state: 'idle' | 'selected' | 'merging' | 'popped' | 'wrong';
  targetX?: number;
  targetY?: number;
}

interface PopParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number; // 1 to 0
}

interface FloatingScore {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  opacity: number;
}

const TOTAL_TIME = 25; // 25 seconds per round
const TIME_BONUS = 2.5; // +2.5s per correct match
const BUBBLE_RADIUS = 46; // Bubble radius in pixels (92px diameter)

export default function MatchingGame({
  items,
  roundNumber,
  totalRounds,
  onRoundComplete,
}: MatchingGameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 360, height: 460 });
  const dimensionsRef = useRef(dimensions);
  dimensionsRef.current = dimensions;

  const [isMuted, setIsMuted] = useState(gameAudio.getMuted());
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [combo, setCombo] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [particles, setParticles] = useState<PopParticle[]>([]);
  const [floatingScores, setFloatingScores] = useState<FloatingScore[]>([]);
  const [isRoundClear, setIsRoundClear] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);

  // Mutable refs for physics and state loop
  const bubblesRef = useRef<BubbleData[]>([]);
  const [renderTrigger, setRenderTrigger] = useState(0);
  const mistakesPerWordRef = useRef<Record<string, number>>({});
  const poppedCountRef = useRef(0);
  const isFinishingRef = useRef(false);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const comboTimerRef = useRef<NodeJS.Timeout | null>(null);
  const nextParticleIdRef = useRef(0);

  // Stable key identifying the current set of words
  const itemsKey = useMemo(() => items.map((it) => it.wordId).join(','), [items]);
  const initializedKeyRef = useRef<string>('');

  // Measure container dimensions
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setDimensions({ width: rect.width, height: rect.height });
          // Clamp existing bubbles within new boundaries without respawning
          const padding = BUBBLE_RADIUS + 8;
          bubblesRef.current.forEach((b) => {
            b.x = Math.max(padding, Math.min(rect.width - padding, b.x));
            b.y = Math.max(padding, Math.min(rect.height - padding, b.y));
          });
        }
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Initialize bubbles only when itemsKey or roundNumber changes
  useEffect(() => {
    if (initializedKeyRef.current === itemsKey && bubblesRef.current.length > 0) {
      return;
    }
    initializedKeyRef.current = itemsKey;

    isFinishingRef.current = false;
    poppedCountRef.current = 0;
    mistakesPerWordRef.current = {};
    setTimeLeft(TOTAL_TIME);
    setCombo(0);
    setSelectedId(null);
    setIsRoundClear(false);
    setIsGameOver(false);

    const w = dimensionsRef.current.width || 360;
    const h = dimensionsRef.current.height || 460;
    const padding = BUBBLE_RADIUS + 12;

    const newBubbles: BubbleData[] = [];
    const positions: { x: number; y: number }[] = [];

    // Pre-calculate spaced spawn slots
    const totalBubbles = items.length * 2;
    const cols = totalBubbles <= 6 ? 2 : 3;
    const rows = Math.ceil(totalBubbles / cols);
    const colStep = (w - padding * 2) / Math.max(1, cols - 1);
    const rowStep = (h - padding * 2) / Math.max(1, rows - 1);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (positions.length < totalBubbles) {
          const offsetX = (Math.random() - 0.5) * 20;
          const offsetY = (Math.random() - 0.5) * 20;
          positions.push({
            x: padding + c * colStep + offsetX,
            y: padding + r * rowStep + offsetY,
          });
        }
      }
    }

    // Shuffle positions
    positions.sort(() => Math.random() - 0.5);

    let idx = 0;
    items.forEach((item) => {
      // English bubble
      const posEng = positions[idx++] || { x: w / 2, y: h / 2 };
      newBubbles.push({
        id: `eng-${item.wordId}`,
        wordId: item.wordId,
        rawWord: item.word,
        text: item.word,
        type: 'english',
        x: posEng.x,
        y: posEng.y,
        vx: (Math.random() - 0.5) * 24, // px per second
        vy: (Math.random() - 0.5) * 24,
        radius: BUBBLE_RADIUS,
        state: 'idle',
      });

      // Thai bubble
      const posThai = positions[idx++] || { x: w / 2, y: h / 2 };
      newBubbles.push({
        id: `thai-${item.wordId}`,
        wordId: item.wordId,
        rawWord: item.word,
        text: item.thai,
        type: 'thai',
        x: posThai.x,
        y: posThai.y,
        vx: (Math.random() - 0.5) * 24,
        vy: (Math.random() - 0.5) * 24,
        radius: BUBBLE_RADIUS,
        state: 'idle',
      });
    });

    bubblesRef.current = newBubbles;
    setRenderTrigger((v) => v + 1);
  }, [itemsKey, items]);

  // Round completion handler
  const handleFinish = useCallback(
    (reason: 'clear' | 'timeout') => {
      if (isFinishingRef.current) return;
      isFinishingRef.current = true;

      if (reason === 'clear') {
        setIsRoundClear(true);
        gameAudio.playWordSuccess();
      } else {
        setIsGameOver(true);
        gameAudio.playWordMiss();
      }

      setTimeout(() => {
        const results: MatchingResult[] = items.map((item) => {
          const key = item.word.toLowerCase().trim();
          let mistakes = mistakesPerWordRef.current[key] || 0;
          // If timed out and this word wasn't popped yet, penalize
          const engBubble = bubblesRef.current.find((b) => b.id === `eng-${item.wordId}`);
          if (reason === 'timeout' && engBubble && engBubble.state !== 'popped') {
            mistakes += 3;
          }
          return {
            wordId: item.wordId,
            quality: matchingQuality(mistakes),
            mistakes,
          };
        });

        onRoundComplete(results);
      }, 900);
    },
    [items, onRoundComplete]
  );

  // Timer countdown loop
  useEffect(() => {
    if (isRoundClear || isGameOver || isFinishingRef.current) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        const next = Math.max(0, prev - 0.2);
        if (next <= 0) {
          clearInterval(timer);
          handleFinish('timeout');
          return 0;
        }
        return next;
      });
    }, 200);

    return () => clearInterval(timer);
  }, [isRoundClear, isGameOver, handleFinish]);

  // Physics animation loop
  useEffect(() => {
    let isRunning = true;

    const tick = (now: number) => {
      if (!isRunning) return;
      if (lastTimeRef.current === null) {
        lastTimeRef.current = now;
      }
      const dt = Math.min((now - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = now;

      const w = dimensions.width || 360;
      const h = dimensions.height || 460;
      const padding = BUBBLE_RADIUS + 8;
      const bubbles = bubblesRef.current;

      // Update bubbles
      let hasMovingBubbles = false;
      for (let i = 0; i < bubbles.length; i++) {
        const b = bubbles[i];
        if (b.state === 'popped') continue;

        hasMovingBubbles = true;

        if (b.state === 'merging' && b.targetX !== undefined && b.targetY !== undefined) {
          // Glide rapidly towards target midpoint
          const dx = b.targetX - b.x;
          const dy = b.targetY - b.y;
          b.x += dx * 16 * dt;
          b.y += dy * 16 * dt;
        } else {
          // Gentle drift
          b.x += b.vx * dt;
          b.y += b.vy * dt;

          // Wall bounce
          if (b.x < padding) {
            b.x = padding;
            b.vx = Math.abs(b.vx);
          } else if (b.x > w - padding) {
            b.x = w - padding;
            b.vx = -Math.abs(b.vx);
          }

          if (b.y < padding) {
            b.y = padding;
            b.vy = Math.abs(b.vy);
          } else if (b.y > h - padding) {
            b.y = h - padding;
            b.vy = -Math.abs(b.vy);
          }

          // Gentle soft collision repulsion between bubbles
          for (let j = i + 1; j < bubbles.length; j++) {
            const b2 = bubbles[j];
            if (b2.state === 'popped' || b2.state === 'merging') continue;

            const dx = b2.x - b.x;
            const dy = b2.y - b.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const minDist = b.radius + b2.radius + 10;

            if (dist < minDist && dist > 0.001) {
              const overlap = (minDist - dist) / dist;
              const force = 18 * overlap * dt;
              b.vx -= dx * force;
              b.vy -= dy * force;
              b2.vx += dx * force;
              b2.vy += dy * force;
            }
          }
        }
      }

      // Update particles
      setParticles((prev) => {
        if (prev.length === 0) return prev;
        return prev
          .map((p) => ({
            ...p,
            x: p.x + p.vx * dt * 60,
            y: p.y + p.vy * dt * 60,
            life: p.life - dt * 2.2,
          }))
          .filter((p) => p.life > 0);
      });

      // Update floating scores
      setFloatingScores((prev) => {
        if (prev.length === 0) return prev;
        return prev
          .map((s) => ({
            ...s,
            y: s.y - 40 * dt,
            opacity: s.opacity - dt * 1.8,
          }))
          .filter((s) => s.opacity > 0);
      });

      if (hasMovingBubbles) {
        setRenderTrigger((v) => (v + 1) % 100000);
      }

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      isRunning = false;
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [dimensions.width, dimensions.height]);

  // Create burst particles
  const spawnPopParticles = (x: number, y: number, isFever: boolean) => {
    const count = isFever ? 18 : 12;
    const colors = isFever
      ? ['#f59e0b', '#ec4899', '#38bdf8', '#a855f7']
      : ['#38bdf8', '#818cf8', '#c084fc', '#ffffff'];

    const newParticles: PopParticle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = (Math.random() * 2.5 + 1.8) * (isFever ? 1.4 : 1.0);
      newParticles.push({
        id: nextParticleIdRef.current++,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: colors[i % colors.length],
        size: Math.random() * 4 + 3,
        life: 1.0,
      });
    }

    setParticles((prev) => [...prev, ...newParticles]);
  };

  // Add floating score popup
  const addFloatingScore = (x: number, y: number, text: string, color: string) => {
    setFloatingScores((prev) => [
      ...prev,
      {
        id: nextParticleIdRef.current++,
        x,
        y,
        text,
        color,
        opacity: 1,
      },
    ]);
  };

  // Bubble click handler
  const handleBubbleClick = (clickedId: string) => {
    if (isRoundClear || isGameOver || isFinishingRef.current) return;

    const bubbles = bubblesRef.current;
    const clickedBubble = bubbles.find((b) => b.id === clickedId);
    if (!clickedBubble || clickedBubble.state === 'popped' || clickedBubble.state === 'merging') {
      return;
    }

    // First bubble selected
    if (!selectedId) {
      clickedBubble.state = 'selected';
      setSelectedId(clickedId);
      gameAudio.playBubbleSelect();
      return;
    }

    // Same bubble clicked -> Deselect
    if (selectedId === clickedId) {
      clickedBubble.state = 'idle';
      setSelectedId(null);
      return;
    }

    const firstBubble = bubbles.find((b) => b.id === selectedId);
    if (!firstBubble) {
      setSelectedId(null);
      return;
    }

    // Same type clicked (e.g. English then English) -> Switch selection
    if (firstBubble.type === clickedBubble.type) {
      firstBubble.state = 'idle';
      clickedBubble.state = 'selected';
      setSelectedId(clickedId);
      gameAudio.playBubbleSelect();
      return;
    }

    // Opposite types clicked -> Check match!
    const isMatch = firstBubble.wordId === clickedBubble.wordId;

    if (isMatch) {
      // Calculate midpoint for merge animation
      const midX = (firstBubble.x + clickedBubble.x) / 2;
      const midY = (firstBubble.y + clickedBubble.y) / 2;

      firstBubble.state = 'merging';
      clickedBubble.state = 'merging';
      firstBubble.targetX = midX;
      firstBubble.targetY = midY;
      clickedBubble.targetX = midX;
      clickedBubble.targetY = midY;
      setSelectedId(null);

      // Increment combo and timer bonus
      const newCombo = combo + 1;
      setCombo(newCombo);
      setTimeLeft((t) => Math.min(TOTAL_TIME, t + TIME_BONUS));

      if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
      comboTimerRef.current = setTimeout(() => {
        setCombo(0);
      }, 4000);

      // Sound & Particles
      gameAudio.playBubblePop(newCombo);
      const isFever = newCombo >= 3;
      spawnPopParticles(midX, midY, isFever);

      const scoreText = newCombo > 1 ? `+${TIME_BONUS}s Combo x${newCombo}!` : `+${TIME_BONUS}s!`;
      addFloatingScore(midX, midY - 20, scoreText, isFever ? '#f59e0b' : '#38bdf8');

      // Finalize pop after merge
      setTimeout(() => {
        firstBubble.state = 'popped';
        clickedBubble.state = 'popped';
        poppedCountRef.current += 1;

        if (poppedCountRef.current >= items.length) {
          handleFinish('clear');
        }
      }, 260);
    } else {
      // Mismatch
      gameAudio.playBubbleMismatch();
      firstBubble.state = 'wrong';
      clickedBubble.state = 'wrong';
      setSelectedId(null);
      setCombo(0);

      // Record mistakes
      const k1 = firstBubble.rawWord.toLowerCase().trim();
      const k2 = clickedBubble.rawWord.toLowerCase().trim();
      mistakesPerWordRef.current[k1] = (mistakesPerWordRef.current[k1] || 0) + 1;
      mistakesPerWordRef.current[k2] = (mistakesPerWordRef.current[k2] || 0) + 1;

      // Soft bounce away from each other
      const dx = clickedBubble.x - firstBubble.x;
      const dy = clickedBubble.y - firstBubble.y;
      const angle = Math.atan2(dy, dx);
      firstBubble.vx -= Math.cos(angle) * 40;
      firstBubble.vy -= Math.sin(angle) * 40;
      clickedBubble.vx += Math.cos(angle) * 40;
      clickedBubble.vy += Math.sin(angle) * 40;

      // Reset wrong state after shake
      setTimeout(() => {
        if (firstBubble.state === 'wrong') firstBubble.state = 'idle';
        if (clickedBubble.state === 'wrong') clickedBubble.state = 'idle';
      }, 450);
    }
  };

  const timerRatio = Math.max(0, Math.min(1, timeLeft / TOTAL_TIME));

  return (
    <div className="flex-1 flex flex-col w-full max-w-md mx-auto h-[calc(100vh-140px)] min-h-[480px] p-2 relative select-none">
      {/* Top HUD: Round Info, Timer Bar, Combo Badge, Audio Mute */}
      <div className="flex flex-col gap-2 mb-2 px-2">
        <div className="flex items-center justify-between text-xs font-semibold text-foreground/70">
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-bold">
              รอบที่ {roundNumber}/{totalRounds}
            </span>
            {combo > 1 && (
              <span
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-xs animate-bounce ${
                  combo >= 3
                    ? 'bg-amber-500/20 text-amber-500 border border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                    : 'bg-primary/20 text-primary border border-primary/30'
                }`}
              >
                {combo >= 3 ? <Flame size={12} className="text-amber-500" /> : <Zap size={12} />}
                COMBO x{combo}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 font-mono text-xs font-bold text-foreground/80">
              <Timer size={14} className={timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-primary'} />
              <span>{timeLeft.toFixed(1)}s</span>
            </div>

            <button
              type="button"
              onClick={() => setIsMuted(gameAudio.toggleMute())}
              aria-label={isMuted ? 'เปิดเสียง' : 'ปิดเสียง'}
              className="p-1.5 rounded-full bg-card-bg border border-border-color/80 text-foreground/60 hover:text-foreground active:scale-90 transition-all shadow-soft-xs"
            >
              {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
            </button>
          </div>
        </div>

        {/* Dynamic Countdown Timer Bar */}
        <div className="w-full h-2 rounded-full bg-foreground/10 overflow-hidden relative shadow-inner">
          <div
            className={`h-full transition-all duration-200 rounded-full ${
              timerRatio > 0.4
                ? 'bg-gradient-to-r from-primary to-cyan-400'
                : timerRatio > 0.2
                ? 'bg-gradient-to-r from-amber-400 to-orange-500'
                : 'bg-gradient-to-r from-red-500 to-rose-600 animate-pulse'
            }`}
            style={{ width: `${timerRatio * 100}%` }}
          />
        </div>
      </div>

      {/* Floating Arena Canvas Area */}
      <div
        ref={containerRef}
        className="flex-1 relative w-full rounded-3xl border border-border-color/70 bg-gradient-to-b from-card-bg/60 via-card-bg/40 to-background overflow-hidden backdrop-blur-md shadow-soft-sm touch-none"
      >
        {/* Subtle Background Glow Rings */}
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <div className="absolute top-1/4 left-1/4 w-40 h-40 rounded-full bg-cyan-500/30 blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-40 h-40 rounded-full bg-purple-500/30 blur-3xl" />
        </div>

        {/* Legend Hint on Arena Header */}
        <div className="absolute top-3 inset-x-0 flex items-center justify-center gap-4 text-[11px] font-medium text-foreground/45 pointer-events-none z-0">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.7)]" />
            คำศัพท์อังกฤษ
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.7)]" />
            คำแปลไทย
          </span>
        </div>

        {/* Render Bubbles */}
        {bubblesRef.current.map((bubble) => {
          if (bubble.state === 'popped') return null;

          const isEng = bubble.type === 'english';
          const isSelected = bubble.state === 'selected';
          const isWrong = bubble.state === 'wrong';
          const isMerging = bubble.state === 'merging';

          // Neon Glassmorphism Styling
          let colorClasses = '';
          if (isEng) {
            colorClasses = isSelected
              ? 'border-cyan-300 bg-cyan-500/30 text-cyan-50 shadow-[0_0_24px_rgba(34,211,238,0.7)] ring-4 ring-cyan-400/50 scale-105'
              : 'border-cyan-400/50 bg-gradient-to-br from-cyan-500/15 to-blue-600/20 text-cyan-950 dark:text-cyan-100 hover:border-cyan-400 shadow-[0_4px_16px_rgba(34,211,238,0.25)]';
          } else {
            colorClasses = isSelected
              ? 'border-purple-300 bg-purple-500/30 text-purple-50 shadow-[0_0_24px_rgba(168,85,247,0.7)] ring-4 ring-purple-400/50 scale-105'
              : 'border-purple-400/50 bg-gradient-to-br from-purple-500/15 to-indigo-600/20 text-purple-950 dark:text-purple-100 hover:border-purple-400 shadow-[0_4px_16px_rgba(168,85,247,0.25)]';
          }

          if (isWrong) {
            colorClasses = 'border-red-500 bg-red-500/25 text-red-500 animate-shake shadow-[0_0_20px_rgba(239,68,68,0.6)]';
          }

          if (isMerging) {
            colorClasses += ' scale-90 opacity-80';
          }

          return (
            <button
              key={bubble.id}
              type="button"
              onClick={() => handleBubbleClick(bubble.id)}
              disabled={isMerging || isRoundClear || isGameOver}
              style={{
                width: `${bubble.radius * 2}px`,
                height: `${bubble.radius * 2}px`,
                transform: `translate3d(${bubble.x - bubble.radius}px, ${bubble.y - bubble.radius}px, 0)`,
                willChange: 'transform',
              }}
              className={`absolute top-0 left-0 rounded-full border-2 backdrop-blur-md flex flex-col items-center justify-center p-2 text-center transition-transform active:scale-95 cursor-pointer z-10 ${colorClasses}`}
            >
              {/* Inner Specular Highlight */}
              <div className="absolute top-1.5 left-2.5 w-5 h-2.5 rounded-full bg-white/40 blur-[1px] pointer-events-none -rotate-45" />

              <span
                className={`font-bold leading-tight select-none line-clamp-2 ${
                  isEng ? 'text-xs tracking-tight font-semibold' : 'text-xs font-medium'
                }`}
              >
                {bubble.text}
              </span>
            </button>
          );
        })}

        {/* Burst Particles */}
        {particles.map((p) => (
          <div
            key={p.id}
            style={{
              position: 'absolute',
              left: `${p.x}px`,
              top: `${p.y}px`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              backgroundColor: p.color,
              opacity: p.life,
              borderRadius: '9999px',
              transform: `scale(${p.life})`,
              boxShadow: `0 0 10px ${p.color}`,
              pointerEvents: 'none',
              zIndex: 30,
            }}
          />
        ))}

        {/* Floating Scores */}
        {floatingScores.map((s) => (
          <div
            key={s.id}
            style={{
              position: 'absolute',
              left: `${s.x}px`,
              top: `${s.y}px`,
              transform: 'translate(-50%, -50%)',
              opacity: s.opacity,
              color: s.color,
              pointerEvents: 'none',
              zIndex: 40,
            }}
            className="font-extrabold text-sm drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)] animate-pulse"
          >
            {s.text}
          </div>
        ))}

        {/* Victory Round Clear Overlay */}
        {isRoundClear && (
          <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex flex-col items-center justify-center z-50 animate-card-in">
            <div className="w-16 h-16 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center text-primary mb-3 shadow-[0_0_24px_rgba(79,141,247,0.5)] animate-bounce">
              <Sparkles size={32} />
            </div>
            <p className="text-xl font-black text-foreground">ยอดเยี่ยม!</p>
            <p className="text-xs text-foreground/60 mt-1 font-medium">จับคู่คำศัพท์สำเร็จครบทุกฟอง</p>
          </div>
        )}

        {/* Time-Out Overlay */}
        {isGameOver && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center z-50 animate-card-in">
            <div className="w-16 h-16 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center text-red-500 mb-3 shadow-[0_0_24px_rgba(239,68,68,0.5)]">
              <Timer size={32} />
            </div>
            <p className="text-xl font-black text-foreground">หมดเวลา!</p>
            <p className="text-xs text-foreground/60 mt-1 font-medium">กำลังรวบรวมคะแนนทบทวน...</p>
          </div>
        )}
      </div>

      {/* Footer Instructions */}
      <div className="mt-2 text-center text-xs text-foreground/50">
        แตะฟองคำศัพท์และฟองคำแปลเพื่อจับคู่ให้ระเบิดก่อนหมดเวลา
      </div>
    </div>
  );
}
