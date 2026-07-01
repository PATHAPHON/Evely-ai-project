'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type ElephantMascotState = 'idle' | 'thinking' | 'happy';

interface ElephantMascotProps {
  /** Drives the looping/one-shot body animation. */
  state?: ElephantMascotState;
  /** Rendered width/height in pixels. */
  size?: number;
}

// Single flat blue for the whole body — no outline, no shading.
const BLUE = 'var(--primary)';
const EYE = '#0b3d66';

/**
 * A pixel-art blue elephant mascot, built from crisp-edged SVG rects so it
 * reads as blocky pixel art at any size. The body is a single flat color (no
 * outline or gradient); the eyes are small vertical rectangles that drift
 * side to side and blink.
 *
 * Idle: gentle breathing + periodic blink. `thinking`: a swaying bob while the
 * AI generates. `happy`: a one-shot hop when a fresh reply lands. Tapping it
 * always triggers a quick bounce reaction.
 */
export default function ElephantMascot({ state = 'idle', size = 40 }: ElephantMascotProps) {
  const [blinking, setBlinking] = useState(false);
  const [reacting, setReacting] = useState(false);
  const reactTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Blink once per left-right eye sweep: the look animation loops every 4s, so
  // blinking on the same cadence makes the squint land just after each sweep.
  useEffect(() => {
    let blinkTimer: ReturnType<typeof setTimeout>;
    let openTimer: ReturnType<typeof setTimeout>;
    const scheduleBlink = () => {
      blinkTimer = setTimeout(() => {
        setBlinking(true); // eyes close into a >< squint
        openTimer = setTimeout(() => {
          setBlinking(false);
          scheduleBlink();
        }, 2500);
      }, 4000);
    };
    scheduleBlink();
    return () => {
      clearTimeout(blinkTimer);
      clearTimeout(openTimer);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (reactTimer.current) clearTimeout(reactTimer.current);
    };
  }, []);

  const handleTap = useCallback(() => {
    setReacting(true);
    if (reactTimer.current) clearTimeout(reactTimer.current);
    reactTimer.current = setTimeout(() => setReacting(false), 500);
  }, []);

  // A tap reaction takes priority, then the state-driven animation.
  const bodyClass = reacting
    ? 'mascot-bounce'
    : state === 'thinking'
      ? 'mascot-think'
      : state === 'happy'
        ? 'mascot-bounce'
        : 'mascot-breathe';

  return (
    <button
      type="button"
      onClick={handleTap}
      aria-label="มาสคอตช้างจีจีจบล่ะ"
      className="shrink-0 cursor-pointer border-0 bg-transparent p-0 leading-none outline-none focus-visible:opacity-80"
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 18 18"
        width={size}
        height={size}
        shapeRendering="crispEdges"
        className={bodyClass}
        style={{ transformOrigin: 'center bottom', display: 'block' }}
        role="img"
        aria-hidden="true"
      >
        {/* Antennae (echoes the reference character) */}
        <rect x="6" y="1" width="1" height="2" fill={BLUE} />
        <rect x="11" y="1" width="1" height="2" fill={BLUE} />

        {/* Ears */}
        <rect x="1" y="6" width="3" height="6" fill={BLUE} />
        <rect x="14" y="6" width="3" height="6" fill={BLUE} />

        {/* Head / body */}
        <rect x="4" y="3" width="10" height="10" fill={BLUE} />

        {/* Trunk hanging from center-bottom */}
        <rect x="8" y="13" width="2" height="4" fill={BLUE} />

        {/* Feet */}
        <rect x="5" y="13" width="2" height="2" fill={BLUE} />
        <rect x="11" y="13" width="2" height="2" fill={BLUE} />

        {/* Eyes drift side to side; on blink they close into a >< squint. */}
        <g className="mascot-eyes-look">
          {blinking ? (
            <>
              {/* Left eye ">" */}
              <rect x="6" y="6" width="1" height="1" fill={EYE} />
              <rect x="7" y="7" width="1" height="1" fill={EYE} />
              <rect x="6" y="8" width="1" height="1" fill={EYE} />
              {/* Right eye "<" */}
              <rect x="11" y="6" width="1" height="1" fill={EYE} />
              <rect x="10" y="7" width="1" height="1" fill={EYE} />
              <rect x="11" y="8" width="1" height="1" fill={EYE} />
            </>
          ) : (
            <>
              {/* Open eyes: small vertical rects */}
              <rect x="7" y="7" width="1" height="2" fill={EYE} />
              <rect x="10" y="7" width="1" height="2" fill={EYE} />
            </>
          )}
        </g>
      </svg>
    </button>
  );
}
