'use client';

import { useState, useEffect, useCallback, useMemo, useContext } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Info } from 'lucide-react';
import { tokenize } from '@/app/_lib/utils/wordTokenizer';
import { STATUS_COLORS, type WordStatus } from '@/app/_lib/utils/wordStatusDerivation';
import { WordStatusContext } from '@/app/_components/WordStatusProvider';
import type { WordStatusContextValue } from '@/app/_components/WordStatusProvider';
import { type FeedWordRecord } from '@/app/_lib/types/wordTypes';
import WordDetailPopup from '@/app/_components/WordDetailPopup';

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

// ─── Word Detail Overlay (inline, minimal) ────────────────────────────────────

interface OverlayState {
  word: string;
  /** Horizontal center of the tapped word (viewport coords, already clamped). */
  x: number;
  /** Top and bottom edges of the tapped word (viewport coords). */
  top: number;
  bottom: number;
}

function WordOverlay({
  word,
  x,
  top,
  bottom,
  onClose,
  onAdd,
  onDetail,
}: {
  word: string;
  x: number;
  top: number;
  bottom: number;
  onClose: () => void;
  onAdd: (word: string) => Promise<void>;
  onDetail: (word: string) => void;
}) {
  // Not enough room above the word → flip the popover below it.
  const placeBelow = top < 96;
  const [isAdding, setIsAdding] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setIsVisible(true));
    });
  }, []);

  const handleClose = useCallback(() => {
    setIsVisible(false);
    setTimeout(onClose, 250);
  }, [onClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleClose]);

  const handleAdd = async () => {
    setIsAdding(true);
    try {
      await onAdd(word);
      handleClose();
    } catch {
      setIsAdding(false);
    }
  };

  // Portal needs a DOM target; bail out during SSR (the overlay only ever
  // mounts after a client-side tap anyway).
  if (typeof document === 'undefined') return null;

  return createPortal(
    <>
      {/* Transparent backdrop to catch outside clicks */}
      <div
        className="fixed inset-0 z-40"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Popover anchored just above (or below, if no room) the tapped word */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Word actions: ${word}`}
        className="fixed z-50 flex items-center gap-1.5 rounded-xl border border-border-color px-2 py-2 shadow-soft-md bg-background"
        style={{
          left: x,
          top: placeBelow ? bottom + 8 : top - 8,
          opacity: isVisible ? 1 : 0,
          transform: isVisible
            ? `translate(-50%, ${placeBelow ? '0' : '-100%'}) scale(1)`
            : `translate(-50%, ${placeBelow ? '0' : '-100%'}) scale(0.92)`,
          transformOrigin: placeBelow ? 'top center' : 'bottom center',
          transition:
            'opacity 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        <button
          type="button"
          onClick={handleAdd}
          disabled={isAdding}
          aria-label="Add"
          className="flex items-center justify-center w-6 h-6 rounded-md bg-correct hover:opacity-90 text-white dark:text-gray-900 shadow-soft-sm transition-all active:scale-95 cursor-pointer disabled:opacity-50"
        >
          <Plus size={14} className={isAdding ? 'animate-spin' : ''} strokeWidth={2.5} />
        </button>

        {/* Open the word detail sheet */}
        <button
          type="button"
          onClick={() => {
            onDetail(word);
            handleClose();
          }}
          aria-label="รายละเอียด"
          className="flex items-center justify-center w-6 h-6 rounded-md border border-border-color bg-card-bg hover:bg-primary-bg/30 text-foreground transition-all active:scale-95 cursor-pointer"
        >
          <Info size={14} strokeWidth={2.5} />
        </button>
      </div>
    </>,
    document.body,
  );
}


// ─── Long passage threshold ───────────────────────────────────────────────────

const LONG_PASSAGE_THRESHOLD = 500;

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
    const x = Math.min(Math.max(center, 40), window.innerWidth - 40);
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
          if (!token.isEnglish) {
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
                  ...(reveal ? { animationDelay: `${index * 55}ms` } : {}),
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
