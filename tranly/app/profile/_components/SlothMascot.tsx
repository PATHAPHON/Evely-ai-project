'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type SlothState = 'idle' | 'happy';

interface SlothMascotProps {
  /** One-shot body animation cue; `happy` triggers a hop. */
  state?: SlothState;
  /** Rendered width/height in pixels. */
  size?: number;
  /**
   * When true, wraps the sloth in a tappable button (tap → bounce). Leave
   * false when the sloth sits inside another button (e.g. the profile header
   * row) to avoid nesting interactive elements.
   */
  interactive?: boolean;
}

// Flat pixel-art palette — a warm brown sloth with darker eye patches.
const FUR = '#a47551';
const FUR_DARK = '#8a5e3c';
const PATCH = '#6b4a30';
const EYE = '#3a2616';
const NOSE = '#3a2616';

/**
 * A pixel-art sloth mascot for the user's avatar, built from crisp-edged SVG
 * rects so it reads as blocky pixel art at any size — the same construction as
 * the chat elephant {@link "../../chat/_components/ElephantMascot"}. It reuses the
 * shared mascot animation classes from globals.css.
 *
 * Idle: gentle breathing + periodic slow blink (sloths are sleepy). `happy`
 * or a tap: a one-shot hop.
 */
export default function SlothMascot({
  state = 'idle',
  size = 44,
  interactive = false,
}: SlothMascotProps) {
  const [blinking, setBlinking] = useState(false);
  const [reacting, setReacting] = useState(false);
  const reactTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Blink once per left-right eye sweep, matching the 4s look loop.
  useEffect(() => {
    let blinkTimer: ReturnType<typeof setTimeout>;
    let openTimer: ReturnType<typeof setTimeout>;
    const scheduleBlink = () => {
      blinkTimer = setTimeout(() => {
        setBlinking(true);
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
  const bodyClass =
    reacting || state === 'happy' ? 'mascot-bounce' : 'mascot-breathe';

  const svg = (
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
      {/* Arms reaching up (sloth hanging from a branch) */}
      <rect x="1" y="4" width="2" height="3" fill={FUR_DARK} />
      <rect x="15" y="4" width="2" height="3" fill={FUR_DARK} />

      {/* Head / body */}
      <rect x="4" y="3" width="10" height="11" fill={FUR} />
      {/* Rounded-ish top corners */}
      <rect x="4" y="3" width="2" height="1" fill={FUR_DARK} />
      <rect x="12" y="3" width="2" height="1" fill={FUR_DARK} />

      {/* Feet */}
      <rect x="5" y="14" width="2" height="2" fill={FUR_DARK} />
      <rect x="11" y="14" width="2" height="2" fill={FUR_DARK} />

      {/* Dark eye patches — the signature sloth mask stripes */}
      <rect x="5" y="6" width="3" height="4" fill={PATCH} />
      <rect x="10" y="6" width="3" height="4" fill={PATCH} />

      {/* Nose / muzzle */}
      <rect x="8" y="10" width="2" height="2" fill={NOSE} />
      {/* Sleepy smile */}
      <rect x="7" y="12" width="4" height="1" fill={FUR_DARK} />

      {/* Eyes drift side to side; on blink they close into a >< squint. */}
      <g className="mascot-eyes-look">
        {blinking ? (
          <>
            {/* Left eye ">" */}
            <rect x="6" y="7" width="1" height="1" fill={EYE} />
            <rect x="7" y="8" width="1" height="1" fill={EYE} />
            {/* Right eye "<" */}
            <rect x="11" y="7" width="1" height="1" fill={EYE} />
            <rect x="10" y="8" width="1" height="1" fill={EYE} />
          </>
        ) : (
          <>
            {/* Open eyes: small dots inside the patches */}
            <rect x="6" y="7" width="1" height="2" fill={EYE} />
            <rect x="11" y="7" width="1" height="2" fill={EYE} />
          </>
        )}
      </g>
    </svg>
  );

  if (!interactive) {
    return (
      <span className="block leading-none" style={{ width: size, height: size }}>
        {svg}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={handleTap}
      aria-label="มาสคอตสลอธของคุณ"
      className="shrink-0 cursor-pointer border-0 bg-transparent p-0 leading-none outline-none focus-visible:opacity-80"
      style={{ width: size, height: size }}
    >
      {svg}
    </button>
  );
}
