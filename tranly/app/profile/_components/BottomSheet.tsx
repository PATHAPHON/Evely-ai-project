"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  ariaLabel?: string;
  closeAria?: string;
  /** Sheet body. */
  children: ReactNode;
  /** Optional sticky footer (e.g. Save / Cancel). */
  footer?: ReactNode;
  /** Tailwind height class for the sheet panel. */
  heightClass?: string;
}

/**
 * Neobrutalist bottom sheet: a scrim plus a panel that slides up from the
 * bottom of the (relatively positioned) parent screen. Closes on backdrop tap,
 * Escape, or dragging the grab handle down. Stays mounted so open/close animate.
 */
export default function BottomSheet({
  open,
  onClose,
  title,
  ariaLabel,
  closeAria = "Close",
  children,
  footer,
  heightClass = "max-h-[80%]",
}: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [dragY, setDragY] = useState(0);

  // Close on Escape while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Drag-to-dismiss bound to the grab handle.
  function startDrag(clientY: number) {
    const startYRef = clientY;
    let currentDy = 0;

    const move = (y: number) => {
      currentDy = Math.max(0, y - startYRef);
      setDragY(currentDy);
    };
    const end = () => {
      if (currentDy > 90) onClose();
      setDragY(0);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
    const onPointerMove = (e: PointerEvent) => move(e.clientY);
    const onPointerUp = () => end();

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  }

  return (
    <>
      {/* Scrim */}
      <div
        className={`absolute inset-0 z-40 bg-black/40 backdrop-blur-[1px] transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        className={`absolute inset-x-0 bottom-0 z-50 flex flex-col overflow-hidden rounded-t-2xl border-3 border-border-color bg-card-bg shadow-nb-lg ${heightClass}`}
        style={{
          transform: open ? `translateY(${dragY}px)` : "translateY(100%)",
          transition: dragY > 0 ? "none" : "transform 0.34s cubic-bezier(.32,.72,0,1)",
        }}
      >
        {/* Grab handle */}
        <div
          className="flex shrink-0 cursor-grab touch-none justify-center pt-3 pb-1"
          onPointerDown={(e) => startDrag(e.clientY)}
        >
          <span className="h-1 w-10 rounded-full bg-border-color/40" />
        </div>

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b-3 border-border-color px-4 pb-3">
          <h2 className="text-lg font-extrabold text-text-primary">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeAria}
            className="flex h-8 w-8 items-center justify-center rounded-full border-3 border-border-color bg-card-bg text-text-secondary shadow-nb-sm active:translate-y-[2px] active:shadow-none cursor-pointer"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="shrink-0 border-t-3 border-border-color bg-card-bg p-4">
            {footer}
          </div>
        )}
      </div>
    </>
  );
}
