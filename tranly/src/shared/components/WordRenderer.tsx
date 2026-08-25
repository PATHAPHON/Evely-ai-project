'use client';

import { useState, useEffect, useCallback, useMemo, useContext } from 'react';
import { tokenize } from '@/shared/utils/wordTokenizer';
import { STATUS_COLORS, type WordStatus } from '@/shared/utils/wordStatusDerivation';
import { WordStatusContext } from '@/shared/components/WordStatusProvider';
import type { WordStatusContextValue } from '@/shared/components/WordStatusProvider';
import { type FeedWordRecord } from '@/shared/types/wordTypes';
import WordDetailPopup from '@/shared/components/WordDetailPopup';
import { WordOverlay, type OverlayState } from '@/shared/components/WordOverlay';

// ─── Props ────────────────────────────────────────────────────────────────────

interface WordRendererProps {
  /** Raw text to render with clickable English words */
  text: string;
  /** Additional className for the wrapper element */
  className?: string;
  /** Additional className applied to each word span */
  textClassName?: string;
  /** Reveal words one-by-one with a staggered fade (used for AI chat replies) */
  reveal?: boolean;
}

// ─── Theme detection hook ─────────────────────────────────────────────────────

function useIsDarkMode(): boolean {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check the class on documentElement (Tailwind class-based dark mode)
    const check = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };

    check();

    // Observe class changes on <html> to detect theme toggles
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  return isDark;
}

// ─── Layout constants ─────────────────────────────────────────────────────────

/** Render this many tokens synchronously; chunk the rest via raf. */
const LONG_PASSAGE_THRESHOLD = 500;
/** Keep the tap popover this far from the viewport edges (~half its width). */
const VIEWPORT_MARGIN_PX = 40;
/** Per-token delay for the word-by-word reveal animation. */
const REVEAL_STAGGER_MS = 55;

// ─── WordRenderer Component ───────────────────────────────────────────────────

// Fallback for rendering without a WordStatusProvider (e.g., in unit tests)
const FALLBACK_CONTEXT: Pick<WordStatusContextValue, 'getStatus' | 'getEntry' | 'addWord'> = {
  getStatus: () => 'unknown' as WordStatus,
  getEntry: () => null,
  addWord: async () => {},
};

export default function WordRenderer({ text, className, textClassName, reveal = false }: WordRendererProps) {
  const context = useContext(WordStatusContext);
  const { getStatus, getEntry, addWord } = context ?? FALLBACK_CONTEXT;
  const isDark = useIsDarkMode();
  const [overlay, setOverlay] = useState<OverlayState | null>(null);
  const [detailWord, setDetailWord] = useState<FeedWordRecord | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [visibleCount, setVisibleCount] = useState<number>(LONG_PASSAGE_THRESHOLD);

  const tokens = useMemo(() => tokenize(text), [text]);

  // For long passages (>500 words), render visible tokens first, then load rest async
  const isLongPassage = tokens.length > LONG_PASSAGE_THRESHOLD;

  useEffect(() => {
    // Progressive-load reset on text change, then chunk remaining tokens via raf
    if (!isLongPassage) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVisibleCount(tokens.length);
      return;
    }

    // Reset to threshold on text change
    setVisibleCount(LONG_PASSAGE_THRESHOLD);

    // Process remaining tokens async using requestAnimationFrame
    let rafId: number;
    const loadMore = () => {
      rafId = requestAnimationFrame(() => {
        setVisibleCount(tokens.length);
      });
    };
    loadMore();

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [tokens, isLongPassage]);

  const handleWordTap = useCallback((word: string, el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    // Center on the tapped word, keeping the popover within the viewport
    // (~40px half-width for the compact icon buttons).
    const center = rect.left + rect.width / 2;
    const x = Math.min(Math.max(center, VIEWPORT_MARGIN_PX), window.innerWidth - VIEWPORT_MARGIN_PX);
    setOverlay({ word, x, top: rect.top, bottom: rect.bottom });
  }, []);

  const handleCloseOverlay = useCallback(() => {
    setOverlay(null);
  }, []);

  // Open the word-detail popup
  const handleShowDetail = useCallback(
    (word: string) => {
      const entry = getEntry(word);
      setDetailWord({
        id: entry?.id ?? word,
        language: 'english',
        generatedDate: '',
        thai: entry?.thai ?? word,
        bookmarked: false,
        createdAt: Date.now(),
        partOfSpeech: entry?.partOfSpeech ?? undefined,
        word,
      });
    },
    [getEntry]
  );

  const colorMode = isDark ? 'dark' : 'light';
  const displayTokens = isLongPassage ? tokens.slice(0, visibleCount) : tokens;

  return (
    <>
      <span className={className} style={{ display: 'inline' }}>
        {displayTokens.map((token, index) => {
          if (!token.isClickable()) {
            // Non-English token: render as plain non-interactive text
            return (
              <span key={index} className={textClassName}>
                {token.original}
              </span>
            );
          }

          const status = getStatus(token.word);
          const color = STATUS_COLORS[status][colorMode];

          return (
            <span key={index} className={textClassName} style={{ display: 'inline' }}>
              {/* Leading punctuation (non-interactive) */}
              {token.leadingPunct && (
                <span aria-hidden="true">{token.leadingPunct}</span>
              )}

              {/* Clickable word/phrase with a soft rounded background highlight
                  tinted by status color — marks it as tappable. */}
              <span
                role="button"
                tabIndex={0}
                aria-label={`${token.word} (${status})`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleWordTap(token.word, e.currentTarget);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    handleWordTap(token.word, e.currentTarget);
                  }
                }}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                className={`cursor-pointer select-none transition-colors duration-150 inline-block mx-[1px] my-[5px]${reveal ? ' animate-word-reveal' : ''}`}
                style={{
                  color,
                  backgroundColor: hoveredIndex === index ? `${color}4D` : `${color}26`,
                  borderRadius: '0.4em',
                  padding: '0.05em 0.35em',
                  ...(reveal ? { animationDelay: `${index * REVEAL_STAGGER_MS}ms` } : {}),
                }}
              >
                {token.word}
              </span>

              {/* Trailing punctuation (non-interactive) */}
              {token.trailingPunct && (
                <span aria-hidden="true">{token.trailingPunct}</span>
              )}

            </span>
          );
        })}

        {/* Loading indicator for remaining tokens in long passages */}
        {isLongPassage && visibleCount < tokens.length && (
          <span className="inline-block text-foreground/50 text-xs ml-1" aria-label="กำลังโหลดคำที่เหลือ">
            …
          </span>
        )}
      </span>

      {/* Word Detail Overlay */}
      {overlay && (
        <WordOverlay
          word={overlay.word}
          x={overlay.x}
          top={overlay.top}
          bottom={overlay.bottom}
          onClose={handleCloseOverlay}
          onAdd={addWord}
          onDetail={handleShowDetail}
        />
      )}

      {/* Word Detail Popup */}
      <WordDetailPopup word={detailWord} onClose={() => setDetailWord(null)} />
    </>
  );
}
