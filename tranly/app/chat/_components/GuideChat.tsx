'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import ElephantMascot from './ElephantMascot';
import SlothMascot from '@/app/profile/_components/SlothMascot';

/**
 * Shared chat-style guide primitives used by both the tutor's AIGuide and the
 * flashcard setup guide. Extracted so the two conversational walkthroughs look
 * and feel identical (typewriter bubbles, mascots, animations, handoff overlay).
 */

/* ===================== Typewriter queue ===================== */

/**
 * Coordinates animated bubbles so they play one at a time. Each animated
 * AIBubble registers on mount and only starts once it reaches the head of the
 * queue; it unregisters when its text finishes, letting the next one begin.
 */
interface TypewriterQueueApi {
  active: string | null;
  register: (id: string) => void;
  unregister: (id: string) => void;
}
const TypewriterQueueCtx = createContext<TypewriterQueueApi | null>(null);

export function TypewriterQueueProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<string[]>([]);
  const register = useCallback(
    (id: string) => setQueue((q) => (q.includes(id) ? q : [...q, id])),
    [],
  );
  const unregister = useCallback(
    (id: string) => setQueue((q) => q.filter((x) => x !== id)),
    [],
  );
  const api = useMemo<TypewriterQueueApi>(
    () => ({ active: queue[0] ?? null, register, unregister }),
    [queue, register, unregister],
  );
  return (
    <TypewriterQueueCtx.Provider value={api}>{children}</TypewriterQueueCtx.Provider>
  );
}

/* ===================== Bubbles ===================== */

/** Three bouncing dots — the "AI is typing" indicator. */
export function TypingDots() {
  return (
    <span className="flex gap-1 py-1.5">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-secondary [animation-delay:-0.3s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-secondary [animation-delay:-0.15s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-secondary" />
    </span>
  );
}

/**
 * AI bubble shown on the left, with the elephant mascot beside it. When
 * `animate` is set and the content is plain text, it first shows a typing
 * indicator for a beat, then reveals the text character-by-character so the
 * guide reads like a live AI chat. Non-text children (or `animate` off) render
 * immediately.
 */
export function AIBubble({
  children,
  animate = false,
  onDone,
}: {
  children: React.ReactNode;
  animate?: boolean;
  /** Fired once when the text has fully revealed (or immediately if not animated). */
  onDone?: () => void;
}) {
  const text = typeof children === 'string' ? children : null;
  const chars = text ? Array.from(text) : [];
  const queue = useContext(TypewriterQueueCtx);
  const shouldAnimate = animate && text !== null && queue !== null;

  // Stable id + a ref to the latest queue api, so the register/unregister effect
  // can run once on mount without re-firing when `active` changes.
  const id = useId();
  const queueRef = useRef(queue);
  queueRef.current = queue;
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const doneFired = useRef(false);

  // 'dots' → typing indicator, 'typing' → revealing characters.
  const [phase, setPhase] = useState<'dots' | 'typing'>(
    shouldAnimate ? 'dots' : 'typing',
  );
  const [shown, setShown] = useState(shouldAnimate ? 0 : chars.length);

  // It's our turn once we reach the head of the shared queue.
  const myTurn = !shouldAnimate || queue?.active === id;

  // Once we've taken our turn we stay visible, even after we leave the queue
  // (which we do on completion to let the next bubble start).
  const [hasStarted, setHasStarted] = useState(!shouldAnimate);
  useEffect(() => {
    if (myTurn) setHasStarted(true);
  }, [myTurn]);

  // Join (and leave) the queue for the duration this bubble is mounted.
  useEffect(() => {
    if (!shouldAnimate) return;
    const q = queueRef.current;
    q?.register(id);
    return () => q?.unregister(id);
  }, [shouldAnimate, id]);

  // Pause on the dots for a beat before the text starts streaming in — but only
  // once it's our turn to speak.
  useEffect(() => {
    if (!shouldAnimate || !myTurn) return;
    const t = setTimeout(() => setPhase('typing'), 550);
    return () => clearTimeout(t);
  }, [shouldAnimate, myTurn]);

  // Reveal one character at a time; when finished, leave the queue so the next
  // bubble can start.
  useEffect(() => {
    if (phase !== 'typing') return;
    if (shown >= chars.length) {
      queueRef.current?.unregister(id);
      if (!doneFired.current) {
        doneFired.current = true;
        onDoneRef.current?.();
      }
      return;
    }
    const t = setTimeout(() => setShown((n) => n + 1), 22);
    return () => clearTimeout(t);
  }, [phase, shown, chars.length, id]);

  // If not animating, ensure onDone fires immediately
  useEffect(() => {
    if (!shouldAnimate) {
      if (!doneFired.current) {
        doneFired.current = true;
        onDoneRef.current?.();
      }
    }
  }, [shouldAnimate]);

  const skipTypewriter = () => {
    if (!shouldAnimate) return;
    if (phase === 'dots') {
      setPhase('typing');
    }
    setShown(chars.length);
  };

  // While waiting for an earlier bubble to finish (and before we've ever
  // started), stay hidden entirely.
  if (shouldAnimate && !hasStarted) return null;

  const showDots = shouldAnimate && phase === 'dots';

  return (
    <div
      onClick={skipTypewriter}
      className={`flex max-w-[85%] items-start gap-2 self-start ${
        shouldAnimate && shown < chars.length ? 'cursor-pointer select-none active:opacity-90' : ''
      }`}
    >
      <div className="animate-mascot-pop-in shrink-0">
        <ElephantMascot size={40} state={showDots ? 'thinking' : 'idle'} />
      </div>
      <div className="animate-bubble-pop-in rounded-2xl rounded-tl-md border-3 border-border-color bg-card-bg px-4 py-3 text-base font-semibold text-text-primary shadow-nb-sm">
        {showDots ? <TypingDots /> : shouldAnimate ? chars.slice(0, shown).join('') : children}
      </div>
    </div>
  );
}

/** User bubble shown on the right, with the user's sloth mascot beside it. */
export function UserBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex max-w-[85%] items-start gap-2 self-end">
      <div className="animate-user-bubble-pop-in rounded-2xl rounded-tr-md border-3 border-border-color bg-accent-green px-4 py-2 text-sm font-bold text-white shadow-nb-sm">
        {children}
      </div>
      <div className="animate-mascot-pop-in shrink-0">
        <SlothMascot size={40} />
      </div>
    </div>
  );
}

/* ===================== Shared animations ===================== */

/**
 * Local keyframes powering the guide's premium bouncy transitions. Render once
 * inside a guide so its children can use the `animate-*` classes below.
 */
export function GuideAnimations() {
  return (
    <style>{`
        @keyframes slideUpBounce {
          from {
            opacity: 0;
            transform: translateY(50px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-up-bounce {
          animation: slideUpBounce 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out forwards;
        }
        @keyframes buttonBounceIn {
          from {
            opacity: 0;
            transform: scale(0.9) translateY(15px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        .animate-button-in {
          animation: buttonBounceIn 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          opacity: 0;
        }
        @keyframes absorbToCenter {
          0% {
            opacity: 1;
            transform: scale(1) translateY(0) rotate(0deg);
            filter: blur(0px);
          }
          100% {
            opacity: 0;
            transform: scale(0.05) translateY(180px) rotate(720deg);
            filter: blur(8px);
          }
        }
        .animate-absorb {
          animation: absorbToCenter 0.85s cubic-bezier(0.6, -0.28, 0.735, 0.045) forwards;
        }
        @keyframes mascotPopGrow {
          0% {
            transform: scale(1) rotate(0deg);
          }
          70% {
            transform: scale(3.3) rotate(10deg);
          }
          100% {
            transform: scale(3) rotate(0deg);
          }
        }
        .animate-mascot-grow {
          animation: mascotPopGrow 0.65s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          animation-delay: 0.8s;
          animation-fill-mode: both;
          transform-origin: center bottom;
        }
        @keyframes auraPulse {
          0% {
            transform: scale(0.9);
            opacity: 0;
            box-shadow: 0 0 20px 10px rgba(64, 150, 255, 0);
          }
          1% {
            opacity: 0.15;
            box-shadow: 0 0 20px 10px rgba(64, 150, 255, 0.3);
          }
          50% {
            transform: scale(1.08);
            opacity: 0.4;
            box-shadow: 0 0 40px 20px rgba(64, 150, 255, 0.5);
          }
          100% {
            transform: scale(0.9);
            opacity: 0.15;
            box-shadow: 0 0 20px 10px rgba(64, 150, 255, 0.3);
          }
        }
        .animate-aura-pulse {
          animation: auraPulse 2s ease-in-out infinite;
          animation-delay: 0.8s;
          animation-fill-mode: both;
        }
        .animate-status-fade-in {
          animation: fadeIn 0.4s ease-out forwards;
          animation-delay: 0.8s;
          opacity: 0;
          animation-fill-mode: both;
        }
      `}</style>
  );
}

/* ===================== Handoff overlay ===================== */

/**
 * Full-bleed "the AI is preparing your session" overlay: a pulsing aura behind
 * the elephant mascot that grows into view, with a status line. Shown during
 * the brief beat between confirming the guide and launching the experience.
 */
export function ThinkingOverlay({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/[0.03] animate-fade-in">
      {/* Glowing Aura Ring behind the Mascot */}
      <div className="relative flex items-center justify-center mb-6">
        <div className="absolute w-[180px] h-[180px] rounded-full animate-aura-pulse" />
        <div className="relative animate-mascot-grow">
          <ElephantMascot size={40} state="thinking" />
        </div>
      </div>

      {/* Loading status text */}
      <div className="px-6 text-center animate-status-fade-in">
        <p className="text-xl font-black text-text-primary">{title}</p>
        <p className="text-sm font-bold text-text-secondary mt-2 flex items-center justify-center gap-1">
          {subtitle}
          <span className="flex gap-1">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-secondary [animation-delay:-0.3s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-secondary [animation-delay:-0.15s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-secondary" />
          </span>
        </p>
      </div>
    </div>
  );
}
