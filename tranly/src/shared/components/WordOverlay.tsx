'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Info, RotateCcw } from 'lucide-react';
import type { WordStatus } from '@/shared/utils/wordStatusDerivation';

/** Not enough room above the tapped word → flip the popover below it. */
const FLIP_ABOVE_THRESHOLD_PX = 96;
/** Wait for the close animation to finish before unmounting. */
const CLOSE_ANIM_MS = 250;

export interface OverlayState {
  word: string;
  /** Horizontal center of the tapped word (viewport coords, already clamped). */
  x: number;
  /** Top and bottom edges of the tapped word (viewport coords). */
  top: number;
  bottom: number;
}

export function WordOverlay({
  word,
  status = 'unknown',
  x,
  top,
  bottom,
  onClose,
  onAdd,
  onForget,
  onDetail,
}: {
  word: string;
  status?: WordStatus;
  x: number;
  top: number;
  bottom: number;
  onClose: () => void;
  onAdd: (word: string) => Promise<void>;
  onForget?: (word: string) => Promise<void>;
  onDetail: (word: string) => void;
}) {
  const placeBelow = top < FLIP_ABOVE_THRESHOLD_PX;
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setIsVisible(true));
    });
  }, []);

  const handleClose = useCallback(() => {
    setIsVisible(false);
    setTimeout(onClose, CLOSE_ANIM_MS);
  }, [onClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleClose]);

  const handleAdd = async () => {
    setIsProcessing(true);
    try {
      await onAdd(word);
      handleClose();
    } catch {
      setIsProcessing(false);
    }
  };

  const handleForget = async () => {
    if (!onForget) return;
    setIsProcessing(true);
    try {
      await onForget(word);
      handleClose();
    } catch {
      setIsProcessing(false);
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
        {/* Unknown status: show green add button */}
        {status === 'unknown' && (
          <button
            type="button"
            onClick={handleAdd}
            disabled={isProcessing}
            aria-label="Add"
            className="flex items-center justify-center w-6 h-6 rounded-md bg-correct hover:opacity-90 text-white dark:text-gray-900 shadow-soft-sm transition-all active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <Plus size={14} className={isProcessing ? 'animate-spin' : ''} strokeWidth={2.5} />
          </button>
        )}

        {/* Known status: show yellow review/forgotten button */}
        {status === 'known' && (
          <button
            type="button"
            onClick={handleForget}
            disabled={isProcessing}
            aria-label="ลืม / ทบทวน"
            className="flex items-center justify-center w-6 h-6 rounded-md bg-[#ca8a04] dark:bg-[#facc15] hover:opacity-90 text-white dark:text-gray-900 shadow-soft-sm transition-all active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <RotateCcw size={13} className={isProcessing ? 'animate-spin' : ''} strokeWidth={2.5} />
          </button>
        )}

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
