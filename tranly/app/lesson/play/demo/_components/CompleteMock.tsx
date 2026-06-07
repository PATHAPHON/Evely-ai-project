'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ClockCircleFilled,
  ShareAltOutlined,
  ThunderboltFilled,
} from '@ant-design/icons';
import { useLanguagePreference } from '@/app/_lib/useLanguagePreference';
import Mascot from '@/app/chat/_components/Mascot';

/**
 * Static mockup of a Duolingo-style end-of-lesson summary, reproducing the
 * provided screenshot. Demo route only — all stats are hard-coded and it does
 * not touch the real lesson engine or `LessonComplete`.
 */

interface StatCard {
  /** Small pill label above the value. */
  label: string;
  /** Numeric target counted up to (e.g. 23, 94, or 301 seconds). */
  target: number;
  /** Formats the (animated) number into the displayed string. */
  format: (n: number) => string;
  icon: React.ReactNode;
  /** Card background + accent (Tailwind classes). */
  cardClass: string;
  /** Pill (label chip) background. */
  pillClass: string;
}

interface CompleteMockProps {
  onRestart: () => void;
}

/**
 * Renders a stat value that stays hidden until `start` flips true, then after
 * its stagger `delay` reveals (the box grows) and counts up 0 → target.
 */
function StatValue({
  target,
  format,
  start,
  delay,
  icon,
}: {
  target: number;
  format: (n: number) => string;
  start: boolean;
  delay: number;
  icon: React.ReactNode;
}) {
  const [shown, setShown] = useState(false);
  const [n, setN] = useState(0);

  // Arm the reveal only once the parent sequence reaches the score step.
  useEffect(() => {
    if (!start) return;
    const t = setTimeout(() => setShown(true), delay);
    return () => clearTimeout(t);
  }, [start, delay]);

  useEffect(() => {
    if (!shown) return;
    const DURATION = 900;
    const startedAt = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - startedAt) / DURATION);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      setN(Math.round(eased * target));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [shown, target]);

  return (
    // Fixed height + fade only (no height animation) so revealing the number
    // never reflows the card — keeps the glide perfectly smooth.
    <div
      className={`mt-2 flex h-8 w-full items-center justify-center gap-1.5 text-2xl font-extrabold transition-opacity duration-300 ${
        shown ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {icon}
      <span>{format(n)}</span>
    </div>
  );
}

/** Sequential reveal groups, played strictly one after another. */
type Step = 'mascot' | 'text' | 'score' | 'buttons' | 'done';
const STEP_ORDER: Step[] = ['mascot', 'text', 'score', 'buttons', 'done'];
// How long to let each group's animation finish before unlocking the next.
const STEP_DURATION: Record<Step, number> = {
  mascot: 1150, // fountain rises behind the big mascot, then it scales down
  text: 650,
  score: 1300, // cards stagger in + count-up
  buttons: 0,
  done: 0,
};

export default function CompleteMock({ onRestart }: CompleteMockProps) {
  const { language } = useLanguagePreference();
  const isThai = language === 'thai';

  // Drive the strict sequence: each group only starts after the previous
  // group's animation has finished.
  const [stepIndex, setStepIndex] = useState(0);
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    let acc = 0;
    // Schedule advancing past each group by its animation duration.
    for (let i = 0; i < STEP_ORDER.length - 1; i++) {
      acc += STEP_DURATION[STEP_ORDER[i]];
      timers.push(setTimeout(() => setStepIndex(i + 1), acc));
    }
    return () => timers.forEach(clearTimeout);
  }, []);
  // A group is revealed once the sequence has reached (or passed) it.
  const reached = (s: Step) => stepIndex >= STEP_ORDER.indexOf(s);

  // Glide: keep the whole column vertically centred on the *revealed* part by
  // translating it down by half the height of whatever is still hidden below.
  // Start → only mascot visible → pushed down so the mascot sits dead-centre,
  // then it glides up as each section appears. Pure GPU transform = smooth.
  // The mascot is absolutely positioned inside a fixed slot at the top, so it
  // can move/scale freely without disturbing the (fixed) sections below. We
  // measure how far its slot sits above the container centre, so phase 1 can
  // park the big mascot dead-centre, then phase 2 flies it up into the slot.
  const containerRef = useRef<HTMLDivElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const [delta, setDelta] = useState(0);
  const [glideOn, setGlideOn] = useState(false);

  useLayoutEffect(() => {
    const c = containerRef.current;
    const s = slotRef.current;
    if (c && s) {
      const cr = c.getBoundingClientRect();
      const sr = s.getBoundingClientRect();
      setDelta(cr.top + cr.height / 2 - (sr.top + sr.height / 2));
    }
  }, [isThai]);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setGlideOn(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // Phase 1 (mascot step): big + parked at the container centre.
  // Phase 2 (text step onward): normal size, settled into its top slot.
  const settled = reached('text');
  const mascotTransform = settled
    ? 'translateY(0) scale(1)'
    : `translateY(${delta}px) scale(1.85)`;

  const stats: StatCard[] = [
    {
      label: isThai ? 'XP ทั้งหมด' : 'Total XP',
      target: 23,
      format: (n) => `${n}`,
      icon: <ThunderboltFilled style={{ fontSize: 18 }} />,
      cardClass: 'bg-accent-yellow text-black',
      pillClass: 'bg-black/15',
    },
    {
      label: isThai ? 'แจ๋ว' : 'Great',
      target: 94,
      format: (n) => `${n}%`,
      icon: <span className="text-base leading-none">🎯</span>,
      cardClass: 'bg-accent-green text-white',
      pillClass: 'bg-black/20',
    },
    {
      label: isThai ? 'ตั้งใจสุดๆ' : 'Focused',
      target: 301, // seconds → 5:01
      format: (n) => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`,
      icon: <ClockCircleFilled style={{ fontSize: 18 }} />,
      cardClass: 'bg-accent-blue text-white',
      pillClass: 'bg-black/20',
    },
  ];

  // Sections sit in a fixed layout (reserve space from the start) and only fade
  // + pop in — they never move, so the absolutely-positioned mascot is the only
  // thing that travels.
  const popIn = (shown: boolean) =>
    `transition-all duration-500 ease-[cubic-bezier(0.34,1.3,0.64,1)] ${
      shown ? 'scale-100 opacity-100' : 'scale-90 opacity-0'
    }`;

  // Fountain jets that spray up behind the big mascot during phase 1. Each jet
  // varies in horizontal offset / height / timing so the spray reads organic.
  const JETS = [
    { x: -34, h: 70, w: 6, delay: 0, dur: 1.1 },
    { x: -20, h: 104, w: 7, delay: 0.08, dur: 1.0 },
    { x: -7, h: 128, w: 8, delay: 0.16, dur: 1.15 },
    { x: 7, h: 122, w: 8, delay: 0.12, dur: 1.05 },
    { x: 20, h: 100, w: 7, delay: 0.04, dur: 1.0 },
    { x: 34, h: 66, w: 6, delay: 0.18, dur: 1.1 },
  ];

  return (
    <div
      ref={containerRef}
      className="relative mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6 px-5 py-6"
    >
      <style>{`
        @keyframes fountainRise {
          0% { transform: scaleY(0); opacity: 0; }
          18% { opacity: 0.9; }
          60% { transform: scaleY(1); opacity: 0.85; }
          100% { transform: scaleY(0.92); opacity: 0.7; }
        }
      `}</style>

      {/* Mascot slot — reserves fixed space; the mascot inside is absolute so it
          can fly/scale freely without pushing anything. */}
      <div ref={slotRef} className="relative h-[150px] w-[150px]">
        <div
          className={`absolute inset-0 flex items-center justify-center ${
            glideOn
              ? 'transition-transform duration-[800ms] ease-[cubic-bezier(0.34,1.2,0.5,1)]'
              : ''
          }`}
          style={{ transform: mascotTransform, willChange: 'transform' }}
        >
          {/* Fountain jets behind the mascot — share the mascot's transform so
              they grow / glide / shrink together, and fade out as it settles. */}
          <div
            className={`pointer-events-none absolute bottom-1/2 left-1/2 z-0 -translate-x-1/2 transition-opacity duration-500 ${
              settled ? 'opacity-0' : 'opacity-100'
            }`}
            aria-hidden
          >
            {JETS.map((j, i) => (
              <span
                key={i}
                className="absolute bottom-0 rounded-full"
                style={{
                  left: `${j.x}px`,
                  width: `${j.w}px`,
                  height: `${j.h}px`,
                  marginLeft: `-${j.w / 2}px`,
                  transformOrigin: 'bottom center',
                  background:
                    'linear-gradient(to top, rgba(64,150,255,0.55), rgba(120,190,255,0.35) 55%, rgba(180,220,255,0) 100%)',
                  animation: settled
                    ? undefined
                    : `fountainRise ${j.dur}s cubic-bezier(0.22,1,0.36,1) ${j.delay}s both`,
                }}
              />
            ))}
          </div>

          <Mascot size={150} state="happy" />
        </div>
      </div>

      {/* Headline + subtext (fixed; fades in) */}
      <div className={`w-full text-center ${popIn(reached('text'))}`}>
        <h2
          className="text-[26px] font-extrabold leading-tight text-accent-yellow"
          style={{ fontFamily: 'var(--font-outfit), sans-serif' }}
        >
          {isThai ? 'เก่งศัพท์ระดับเทพ!' : "You're a word master!"}
        </h2>
        <p className="mt-3 text-base font-bold leading-relaxed text-text-secondary">
          {isThai ? 'เรียนศัพท์ใหม่ไปตั้ง 6 คำ?' : 'Learned 6 new words?'}
          <br />
          {isThai ? 'เก่งขึ้นอีกแล้วนะเนี่ย' : 'Getting better and better!'}
        </p>
      </div>

      {/* Stat cards (fixed; stagger in) */}
      <div className="flex w-full gap-3">
        {stats.map((s, i) => (
          <div
            key={s.label}
            className={`flex min-w-0 flex-1 basis-0 flex-col items-center rounded-2xl border-3 border-border-color px-2 py-3 shadow-nb-sm ${s.cardClass} ${popIn(reached('score'))}`}
            style={
              reached('score') ? { transitionDelay: `${i * 120}ms` } : undefined
            }
          >
            <span
              className={`w-full truncate rounded-full px-2 py-0.5 text-center text-xs font-bold ${s.pillClass}`}
            >
              {s.label}
            </span>
            <StatValue
              target={s.target}
              format={s.format}
              icon={s.icon}
              start={reached('score')}
              delay={300 + i * 200}
            />
          </div>
        ))}
      </div>

      {/* Actions (fixed; fades in) */}
      <div className={`flex w-full items-center gap-3 ${popIn(reached('buttons'))}`}>
        <button
          type="button"
          aria-label={isThai ? 'แชร์' : 'Share'}
          className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl border-3 border-border-color bg-card-bg text-text-primary shadow-nb-md transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-nb-sm cursor-pointer"
        >
          <ShareAltOutlined style={{ fontSize: 22 }} />
        </button>
        <button
          type="button"
          onClick={onRestart}
          className="flex-1 rounded-xl border-3 border-border-color bg-accent-blue py-4 text-base font-extrabold uppercase tracking-wider text-white shadow-nb-md transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-nb-sm cursor-pointer"
        >
          {isThai ? 'รับ XP' : 'Claim XP'}
        </button>
      </div>
    </div>
  );
}
