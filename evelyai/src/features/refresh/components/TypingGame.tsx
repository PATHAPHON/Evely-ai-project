'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Volume2, VolumeX, Sparkles, Volume1, Loader2 } from 'lucide-react';
import { useTTS } from '@/shared/hooks/useTTS';
import { gameAudio } from '../utils/gameAudio';
import type { WordBank } from '../gameTypes';

export interface TypingItem {
  id: string;
  wordId: string;
  word: string;
  thai: string;
}

export interface TypingResult {
  wordId: string;
  quality: number;
  mistakes: number;
}

export interface TypingGameProps {
  // Batch mode
  items?: TypingItem[];
  roundNumber?: number;
  totalRounds?: number;
  onRoundComplete?: (results: TypingResult[]) => void;

  // Single-word mode (Backwards compatibility)
  word?: string;
  thai?: string;
  wordBank?: WordBank;
  onDone?: (quality: number) => void;
  excludeWords?: Set<string>;
}

interface LetterNote {
  id: string;
  char: string;
  charIndex: number;
  lane: number; // 0, 1, 2, 3
  y: number; // percentage down the lane
  status: 'active' | 'hit' | 'missed';
}

const HIT_LINE_Y = 84; // Hit Bar position at 84%
const HIT_WINDOW_MIN = 68; // Earliest acceptable hit position
const HIT_WINDOW_MAX = 95; // Miss threshold
const NOTE_SPACING = 18; // Spacing between consecutive notes in %
const NOTE_SPEED = 24; // Falling speed in % per second

const QWERTY_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
];

export default function TypingGame(props: TypingGameProps) {
  const items = useMemo<TypingItem[]>(() => {
    if (props.items && props.items.length > 0) {
      return props.items;
    }
    return [
      {
        id: 'single-word-item',
        wordId: 'single-word-item',
        word: props.word || 'play',
        thai: props.thai || 'เล่น',
      },
    ];
  }, [props.items, props.word, props.thai]);

  const [currentWordIdx, setCurrentWordIdx] = useState(0);
  const [notes, setNotes] = useState<LetterNote[]>([]);
  const [activeNoteIdx, setActiveNoteIdx] = useState(0);
  const [spelledChars, setSpelledChars] = useState<string[]>([]);
  const [hitFeedback, setHitFeedback] = useState<{ text: string; lane: number } | null>(null);
  const [completedPopup, setCompletedPopup] = useState<{ word: string; thai: string } | null>(null);
  const [pressedKey, setPressedKey] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(gameAudio.getMuted());
  const [isFinishing, setIsFinishing] = useState(false);

  // Mutable refs for physics & inputs
  const currentItem = items[currentWordIdx] || items[0];
  const notesRef = useRef<LetterNote[]>([]);
  const activeNoteIdxRef = useRef<number>(0);
  const spelledCharsRef = useRef<string[]>([]);
  const mistakesPerWordRef = useRef<Record<string, number>>({});
  const missCountPerWordRef = useRef<Record<string, number>>({});
  const animFrameIdRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const isWordTransitioningRef = useRef<boolean>(false);

  const { speak, isSpeaking, isSynthesizing } = useTTS('en-US');

  // Extract clean alphabetic characters from the word
  const cleanWordLetters = useMemo(() => {
    return currentItem.word.toUpperCase().replace(/[^A-Z]/g, '').split('');
  }, [currentItem.word]);

  // Generate Zig-Zag 4-lane pattern for current word
  const setupWordPattern = useCallback((wordLetters: string[]) => {
    const generated: LetterNote[] = [];
    let prevLane = -1;

    wordLetters.forEach((char, idx) => {
      // Pick a lane 0..3 different from prevLane to create a zig-zag rhythm path
      const availableLanes = [0, 1, 2, 3].filter((l) => l !== prevLane);
      const chosenLane = availableLanes[Math.floor(Math.random() * availableLanes.length)];
      prevLane = chosenLane;

      // Note 0 starts near top, subsequent notes are spaced backwards
      const initialY = 12 - idx * NOTE_SPACING;

      generated.push({
        id: `note-${idx}-${char}-${Date.now()}`,
        char,
        charIndex: idx,
        lane: chosenLane,
        y: initialY,
        status: 'active',
      });
    });

    notesRef.current = generated;
    setNotes(generated);
    activeNoteIdxRef.current = 0;
    setActiveNoteIdx(0);
    spelledCharsRef.current = [];
    setSpelledChars([]);
    isWordTransitioningRef.current = false;
  }, []);

  // Initialize first word on mount or word change
  useEffect(() => {
    setupWordPattern(cleanWordLetters);
  }, [cleanWordLetters, setupWordPattern]);

  // Audio BGM Mount
  useEffect(() => {
    gameAudio.startBgm();
    return () => {
      gameAudio.stopBgm();
    };
  }, []);

  const handleToggleMute = useCallback(() => {
    const nextMuted = gameAudio.toggleMute();
    setIsMuted(nextMuted);
  }, []);

  // Finish Round
  const finishRound = useCallback(() => {
    if (isFinishing) return;
    setIsFinishing(true);
    gameAudio.stopBgm();

    const results: TypingResult[] = items.map((it) => {
      const mistakes = mistakesPerWordRef.current[it.wordId] || 0;
      const misses = missCountPerWordRef.current[it.wordId] || 0;

      let quality = 5;
      if (misses > 1) {
        quality = 2;
      } else if (misses === 1) {
        quality = 3;
      } else if (mistakes === 1) {
        quality = 4;
      } else if (mistakes >= 2) {
        quality = 3;
      }

      return {
        wordId: it.wordId,
        quality,
        mistakes: mistakes + misses,
      };
    });

    if (props.onRoundComplete) {
      props.onRoundComplete(results);
    } else if (props.onDone && results[0]) {
      props.onDone(results[0].quality);
    }
  }, [isFinishing, items, props]);

  // Advance to next word
  const advanceToNextWord = useCallback(() => {
    if (currentWordIdx + 1 >= items.length) {
      finishRound();
    } else {
      setCurrentWordIdx((prev) => prev + 1);
    }
  }, [currentWordIdx, items.length, finishRound]);

  // Reset current word on miss
  const resetCurrentWord = useCallback(() => {
    missCountPerWordRef.current[currentItem.wordId] =
      (missCountPerWordRef.current[currentItem.wordId] || 0) + 1;
    gameAudio.playWordMiss();
    setupWordPattern(cleanWordLetters);
  }, [cleanWordLetters, currentItem.wordId, setupWordPattern]);

  // Main Game Loop (Physics & Falling)
  useEffect(() => {
    lastTimeRef.current = performance.now();

    const loop = (now: number) => {
      const dt = (now - (lastTimeRef.current ?? now)) / 1000;
      lastTimeRef.current = now;

      if (!isWordTransitioningRef.current && notesRef.current.length > 0) {
        const currentActiveIdx = activeNoteIdxRef.current;
        const activeNote = notesRef.current[currentActiveIdx];

        // Move all notes down
        const updated = notesRef.current.map((n) => ({
          ...n,
          y: n.status === 'hit' ? n.y : n.y + NOTE_SPEED * dt,
        }));

        // Check if active note missed (passed HIT_WINDOW_MAX)
        if (activeNote && activeNote.status === 'active' && activeNote.y > HIT_WINDOW_MAX) {
          isWordTransitioningRef.current = true;
          resetCurrentWord();
          animFrameIdRef.current = requestAnimationFrame(loop);
          return;
        }

        notesRef.current = updated;
        setNotes(updated);
      }

      animFrameIdRef.current = requestAnimationFrame(loop);
    };

    animFrameIdRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [resetCurrentWord]);

  // Handle Key Press (via physical keyboard or on-screen QWERTY keyboard)
  const handleKeyPress = useCallback((rawKey: string) => {
    const key = rawKey.toUpperCase();
    if (!/^[A-Z]$/.test(key)) return;

    // Trigger visual button press feedback
    setPressedKey(key);
    setTimeout(() => setPressedKey(null), 180);

    if (isWordTransitioningRef.current) return;

    const currentIdx = activeNoteIdxRef.current;
    const activeNote = notesRef.current[currentIdx];

    if (!activeNote || activeNote.status !== 'active') return;

    // Check if key matches the expected character
    if (key === activeNote.char) {
      // Check timing window
      const isPerfect = activeNote.y >= HIT_LINE_Y - 8 && activeNote.y <= HIT_LINE_Y + 8;
      const isGood = activeNote.y >= HIT_WINDOW_MIN && activeNote.y <= HIT_WINDOW_MAX;

      if (isGood || isPerfect) {
        // HIT SUCCESS!
        gameAudio.playKeyClick();
        setHitFeedback({
          text: isPerfect ? 'PERFECT!' : 'GREAT!',
          lane: activeNote.lane,
        });
        setTimeout(() => setHitFeedback(null), 450);

        // Mark note as hit
        notesRef.current = notesRef.current.map((n, i) =>
          i === currentIdx ? { ...n, status: 'hit' } : n
        );
        setNotes(notesRef.current);

        // Add to spelled characters
        const nextSpelled = [...spelledCharsRef.current, activeNote.char];
        spelledCharsRef.current = nextSpelled;
        setSpelledChars(nextSpelled);

        // Check if word is complete
        if (nextSpelled.length === cleanWordLetters.length) {
          isWordTransitioningRef.current = true;
          gameAudio.playWordSuccess();

          setCompletedPopup({
            word: currentItem.word,
            thai: currentItem.thai,
          });

          let hasAdvanced = false;
          let safetyTimer: NodeJS.Timeout | null = null;

          const proceedToNext = () => {
            if (hasAdvanced) return;
            hasAdvanced = true;
            if (safetyTimer) {
              clearTimeout(safetyTimer);
              safetyTimer = null;
            }
            setTimeout(() => {
              setCompletedPopup(null);
              advanceToNextWord();
            }, 400);
          };

          // 8s fallback safety timeout in case network drops or TTS hangs
          safetyTimer = setTimeout(() => {
            proceedToNext();
          }, 8000);

          speak(currentItem.word, {
            onEnd: () => proceedToNext(),
            onError: () => proceedToNext(),
          });
        } else {
          // Advance active target to next letter
          activeNoteIdxRef.current = currentIdx + 1;
          setActiveNoteIdx(currentIdx + 1);
        }
      }
    } else {
      // Wrong Key pressed
      mistakesPerWordRef.current[currentItem.wordId] =
        (mistakesPerWordRef.current[currentItem.wordId] || 0) + 1;
    }
  }, [advanceToNextWord, cleanWordLetters.length, currentItem, speak]);

  // Physical Keyboard Listener
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key.length === 1) {
        handleKeyPress(e.key);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [handleKeyPress]);

  // Next expected letter for on-screen keyboard guide
  const nextExpectedChar = cleanWordLetters[activeNoteIdx] || null;

  // Active unhit notes for rendering connector lines
  const activeUnhitNotes = notes.filter((n) => n.status === 'active');

  return (
    <div className="flex-1 flex flex-col relative select-none outline-none max-w-lg mx-auto w-full">
      {/* Subheader Bar: Progress & Audio Toggle */}
      <div className="flex items-center justify-between px-2 pb-2 text-xs font-semibold text-foreground/60">
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-card-bg border border-border-color shadow-soft-xs">
            คำที่ {currentWordIdx + 1} / {items.length}
          </span>
          <span className="hidden sm:inline text-foreground/40 font-normal">
            (กดตามเส้นจังหวะ 4 ช่อง)
          </span>
        </div>

        <button
          type="button"
          onClick={handleToggleMute}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-card-bg border border-border-color hover:border-primary/50 text-foreground/70 active:scale-95 transition-all cursor-pointer shadow-soft-xs"
        >
          {isMuted ? (
            <>
              <VolumeX size={14} className="text-foreground/40" />
              <span>ปิดเสียง</span>
            </>
          ) : (
            <>
              <Volume2 size={14} className="text-primary" />
              <span>เปิดเสียง BGM</span>
            </>
          )}
        </button>
      </div>

      {/* Target Word Translation & Letter Slots (Header) */}
      <div className="px-3 py-2.5 rounded-2xl bg-card-bg/70 border border-border-color/80 mb-2.5 text-center shadow-soft-xs flex flex-col items-center">
        <p className="text-xs font-medium text-foreground/55">แปลคำว่า</p>
        <div className="flex items-center justify-center gap-2 mt-0.5">
          <p className="text-xl font-bold text-foreground">{currentItem.thai}</p>
          <button
            type="button"
            onClick={() => speak(currentItem.word)}
            disabled={isSynthesizing}
            aria-label={`ฟังเสียงคำว่า ${currentItem.word}`}
            title="ฟังเสียงอ่าน"
            className="p-1.5 rounded-full hover:bg-primary/10 text-primary transition-colors cursor-pointer active:scale-95"
          >
            {isSynthesizing ? (
              <Loader2 size={18} className="animate-spin text-primary" />
            ) : (
              <Volume2 size={18} className={isSpeaking ? 'animate-bounce' : ''} />
            )}
          </button>
        </div>

        {/* Spelling Progress Slots */}
        <div className="flex items-center justify-center gap-1.5 mt-2 flex-wrap">
          {cleanWordLetters.map((char, i) => {
            const isFilled = i < spelledChars.length;
            const isCurrent = i === activeNoteIdx;

            return (
              <div
                key={i}
                className={`w-8 h-9 rounded-xl border flex items-center justify-center font-bold text-base transition-all duration-200 ${
                  isFilled
                    ? 'bg-correct/15 border-correct text-correct shadow-soft-xs scale-100'
                    : isCurrent
                      ? 'bg-primary/10 border-primary text-primary ring-2 ring-primary/20 scale-105'
                      : 'bg-card-bg border-border-color text-foreground/30'
                }`}
              >
                {isFilled ? char : isCurrent ? '?' : '_'}
              </div>
            );
          })}
        </div>
      </div>

      {/* 4-Lane osu!mania Rhythm Stage */}
      <div className="relative w-full h-[320px] rounded-3xl bg-card-bg/40 border border-border-color/80 overflow-hidden shadow-soft-sm flex">
        {/* Soft Ambient Radial Background */}
        <div className="absolute inset-0 pointer-events-none opacity-30 bg-[radial-gradient(circle_at_50%_0%,rgba(10,88,202,0.08),transparent_70%)]" />

        {/* SVG Connector Lines (Glowing Rhythm Trace) */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
          <defs>
            <linearGradient id="trace-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#4f8df7" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#0a58ca" stopOpacity="0.9" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Draw connecting lines between consecutive active unhit notes */}
          {activeUnhitNotes.map((note, i) => {
            if (i === activeUnhitNotes.length - 1) return null;
            const nextNote = activeUnhitNotes[i + 1];

            // Calculate center % coordinates
            const x1 = (note.lane + 0.5) * 25;
            const y1 = note.y;
            const x2 = (nextNote.lane + 0.5) * 25;
            const y2 = nextNote.y;

            return (
              <line
                key={`line-${note.id}-${nextNote.id}`}
                x1={`${x1}%`}
                y1={`${y1}%`}
                x2={`${x2}%`}
                y2={`${y2}%`}
                stroke="url(#trace-grad)"
                strokeWidth="3.5"
                strokeDasharray="6 4"
                filter="url(#glow)"
                className="opacity-80"
              />
            );
          })}
        </svg>

        {/* 4 Vertical Lanes */}
        {[0, 1, 2, 3].map((laneIndex) => (
          <div
            key={laneIndex}
            className={`flex-1 h-full relative border-r border-border-color/30 last:border-r-0 ${
              hitFeedback?.lane === laneIndex ? 'bg-primary/5' : ''
            }`}
          >
            {/* Lane Index indicator at the top */}
            <span className="absolute top-2 left-1/2 -translate-x-1/2 text-[10px] font-bold text-foreground/20">
              {laneIndex + 1}
            </span>
          </div>
        ))}

        {/* Bottom Hit Bar (Judgement Line) */}
        <div
          className="absolute inset-x-0 z-20 pointer-events-none border-t-2 border-primary/70 flex items-center justify-center shadow-[0_0_12px_rgba(10,88,202,0.3)]"
          style={{ top: `${HIT_LINE_Y}%` }}
        >
          <div className="w-full h-1 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        </div>

        {/* Hit Judgement Feedback (PERFECT / GREAT) */}
        {hitFeedback && (
          <div
            className="absolute z-30 pointer-events-none -translate-x-1/2 font-extrabold text-xs tracking-wider animate-word-reveal"
            style={{
              left: `${(hitFeedback.lane + 0.5) * 25}%`,
              top: `${HIT_LINE_Y - 10}%`,
              color: hitFeedback.text === 'PERFECT!' ? '#15803d' : '#0a58ca',
            }}
          >
            {hitFeedback.text}
          </div>
        )}

        {/* Falling Letter Notes */}
        {notes.map((note, idx) => {
          if (note.status === 'hit') return null;

          const isNextTarget = idx === activeNoteIdx;

          return (
            <div
              key={note.id}
              className="absolute z-20 -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-transform duration-75"
              style={{
                left: `${(note.lane + 0.5) * 25}%`,
                top: `${note.y}%`,
              }}
            >
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center font-extrabold text-base transition-all ${
                  isNextTarget
                    ? 'bg-primary text-white shadow-[0_0_16px_rgba(10,88,202,0.45)] ring-2 ring-primary-hover scale-110'
                    : 'bg-card-bg/95 border border-border-color/90 text-foreground shadow-soft-sm scale-95 opacity-85'
                }`}
              >
                {note.char}
              </div>
            </div>
          );
        })}

        {/* Word Completion Popup Modal */}
        {completedPopup && (
          <div className="absolute inset-0 z-40 bg-card-bg/90 backdrop-blur-sm flex flex-col items-center justify-center p-4 animate-card-fade-in">
            <div className="w-12 h-12 rounded-2xl bg-correct/15 text-correct flex items-center justify-center mb-2 animate-bounce">
              <Sparkles size={24} />
            </div>
            <div className="flex items-center gap-2">
              <h3 className="text-2xl font-black text-foreground tracking-wide">
                {completedPopup.word}
              </h3>
              <button
                type="button"
                onClick={() => speak(completedPopup.word)}
                disabled={isSynthesizing}
                aria-label={`ฟังเสียงคำว่า ${completedPopup.word}`}
                className="p-1.5 rounded-full hover:bg-primary/10 transition-colors cursor-pointer text-primary"
              >
                {isSynthesizing ? (
                  <Loader2 size={18} className="animate-spin text-primary" />
                ) : (
                  <Volume1
                    size={18}
                    className={`text-primary ${isSpeaking ? 'animate-bounce' : 'animate-pulse'}`}
                  />
                )}
              </button>
            </div>
            <p className="text-sm font-semibold text-foreground/75 mt-1">
              {completedPopup.thai}
            </p>
            <span className="text-xs font-bold text-correct mt-2 px-3 py-1 rounded-full bg-correct/10 border border-correct/20">
              ✓ ถูกต้องยอดเยี่ยม!
            </span>
          </div>
        )}
      </div>

      {/* On-Screen QWERTY Virtual Keyboard */}
      <div className="mt-3 p-2 rounded-2xl bg-card-bg/60 border border-border-color/80 shadow-soft-xs flex flex-col gap-1.5">
        {QWERTY_ROWS.map((row, rowIdx) => (
          <div key={rowIdx} className="flex justify-center gap-1 sm:gap-1.5">
            {row.map((char) => {
              const isNext = char === nextExpectedChar;
              const isDown = char === pressedKey;

              return (
                <button
                  key={char}
                  type="button"
                  onClick={() => handleKeyPress(char)}
                  className={`flex-1 max-w-[38px] sm:max-w-[44px] h-10 sm:h-11 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center transition-all duration-100 cursor-pointer select-none active:scale-95 ${
                    isDown
                      ? 'bg-primary text-white scale-90 shadow-none'
                      : isNext
                        ? 'border-2 border-primary bg-primary/20 text-primary font-black ring-2 ring-primary/30 shadow-soft-sm animate-pulse'
                        : 'bg-card-bg border border-border-color/90 text-foreground/80 hover:bg-card-bg/90 hover:border-primary/40 shadow-soft-xs'
                  }`}
                >
                  {char}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Bottom Hint */}
      <div className="text-center pt-2 text-[11px] text-foreground/40">
        แตะแป้นพิมพ์บนหน้าจอ หรือกดปุ่มบนคีย์บอร์ดจริงตามเส้นจังหวะ
      </div>
    </div>
  );
}
