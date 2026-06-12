'use client';

import { useState, useEffect, useCallback, useMemo, useContext } from 'react';
import { createPortal } from 'react-dom';
import { tokenize, tokenizePhrases } from '@/app/_lib/wordTokenizer';
import { STATUS_COLORS, type WordStatus } from '@/app/_lib/wordStatusDerivation';
import { WordStatusContext } from '@/app/_components/WordStatusProvider';
import type { WordStatusContextValue } from '@/app/_components/WordStatusProvider';
import { useRouter } from 'next/navigation';
import { DETAIL_WORD_STORAGE_KEY, type FeedWordRecord } from '@/app/home/_lib/types';

// ─── Props ────────────────────────────────────────────────────────────────────

interface WordRendererProps {
  /** Raw text to render with clickable English words */
  text: string;
  /** Additional className for the wrapper element */
  className?: string;
  /** Additional className applied to each word span */
  textClassName?: string;
  /**
   * Pre-grouped phrases. When provided, each phrase is rendered as a single
   * clickable token (one dot group, learned as one unit) instead of splitting
   * `text` word-by-word. Falls back to word-by-word tokenization when empty.
   */
  phrases?: string[];
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

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  const handleClose = useCallback(() => {
    setIsVisible(false);
    setTimeout(onClose, 250);
  }, [onClose]);

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
        className="fixed z-50 flex items-center gap-1.5 rounded-xl border border-gray-200 dark:border-gray-800 px-2 py-2 shadow-lg bg-white dark:bg-[#1e1f20]"
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
          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all active:scale-95 cursor-pointer disabled:opacity-50"
        >
          {isAdding ? '...' : 'Add'}
        </button>

        {/* Open the word detail sheet */}
        <button
          type="button"
          onClick={() => {
            onDetail(word);
            handleClose();
          }}
          className="px-3 py-1.5 rounded-lg border border-gray-250 dark:border-gray-750 bg-white dark:bg-[#1e1f20] hover:bg-gray-50 dark:hover:bg-gray-850 text-gray-700 dark:text-gray-200 font-bold text-xs shadow-sm transition-all active:scale-95 cursor-pointer"
        >
          รายละเอียด
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

export default function WordRenderer({ text, className, textClassName, phrases }: WordRendererProps) {
  const context = useContext(WordStatusContext);
  const { getStatus, getEntry, addWord } = context ?? FALLBACK_CONTEXT;
  const router = useRouter();
  const isDark = useIsDarkMode();
  const [overlay, setOverlay] = useState<OverlayState | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [visibleCount, setVisibleCount] = useState<number>(LONG_PASSAGE_THRESHOLD);

  // Phrase mode: the AI grouped the text into meaningful chunks ("good day",
  // "up to"), each learned/clicked as one unit. Otherwise split word-by-word.
  const phraseMode = !!(phrases && phrases.length > 0);
  const tokens = useMemo(
    () => (phraseMode ? tokenizePhrases(phrases!) : tokenize(text)),
    [text, phrases, phraseMode]
  );

  // For long passages (>500 words), render visible tokens first, then load rest async
  const isLongPassage = tokens.length > LONG_PASSAGE_THRESHOLD;

  useEffect(() => {
    if (!isLongPassage) {
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
    // Keep the popover within the viewport horizontally (~90px half-width).
    const center = rect.left + rect.width / 2;
    const x = Math.min(Math.max(center, 90), window.innerWidth - 90);
    setOverlay({ word, x, top: rect.top, bottom: rect.bottom });
  }, []);

  const handleCloseOverlay = useCallback(() => {
    setOverlay(null);
  }, []);

  // Open the full word-detail page (same handoff as /home and /words)
  const handleShowDetail = useCallback(
    (word: string) => {
      const entry = getEntry(word);
      const detailWord: FeedWordRecord = {
        id: entry?.id ?? word,
        language: 'english',
        generatedDate: '',
        thai: entry?.thai ?? word,
        bookmarked: false,
        imageBlob: null,
        imageUrl: entry?.imageUrl ?? undefined,
        createdAt: Date.now(),
        partOfSpeech: entry?.partOfSpeech ?? undefined,
        word,
        ipa: entry?.ipa ?? undefined,
      };
      try {
        sessionStorage.setItem(DETAIL_WORD_STORAGE_KEY, JSON.stringify(detailWord));
      } catch {
        return;
      }
      router.push('/word-detail');
    },
    [getEntry, router]
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
                className="cursor-pointer select-none transition-colors duration-150"
                style={{
                  color,
                  backgroundColor: hoveredIndex === index ? `${color}4D` : `${color}26`,
                  borderRadius: '0.4em',
                  padding: '0.02em 0.28em',
                }}
              >
                {token.word}
              </span>

              {/* Trailing punctuation (non-interactive) */}
              {token.trailingPunct && (
                <span aria-hidden="true">{token.trailingPunct}</span>
              )}

              {/* Whitespace between words */}
              {index < displayTokens.length - 1 && ' '}
            </span>
          );
        })}

        {/* Loading indicator for remaining tokens in long passages */}
        {isLongPassage && visibleCount < tokens.length && (
          <span className="inline-block text-text-secondary text-xs ml-1" aria-label="Loading remaining words">
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
    </>
  );
}
