'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseSwipeGestureReturn {
  dragX: number;
  dragY: number;
  isDragging: boolean;
  exiting: boolean;
  exitingDirection: 'left' | 'right' | null;
  handleTouchStart: (e: React.TouchEvent) => void;
  handleMouseDown: (e: React.MouseEvent) => void;
  swipeRight: () => Promise<void>;
  swipeLeft: () => Promise<void>;
  resetCard: () => void;
}

/**
 * Tinder-style swipe mechanics for a single card (touch + mouse). Tracks drag
 * offsets and the exit animation, detects left/right swipes past a threshold,
 * and delegates the actual word action to onAccept (right) / onReject (left).
 * Visual reset happens here via resetCard; the queue advancing is the caller's.
 */
export function useSwipeGesture({
  disabled,
  onAccept,
  onReject,
}: {
  disabled: boolean;
  onAccept: () => Promise<void>;
  onReject: () => Promise<void>;
}): UseSwipeGestureReturn {
  const [dragX, setDragX] = useState(0);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  // When true, the card animates out before the next one slides in.
  const [exiting, setExiting] = useState(false);
  const [exitingDirection, setExitingDirection] = useState<'left' | 'right' | null>(null);

  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const mouseStartX = useRef<number | null>(null);
  const mouseStartY = useRef<number | null>(null);

  const resetCard = useCallback(() => {
    setDragX(0);
    setDragY(0);
    setExiting(false);
    setExitingDirection(null);
  }, []);

  const swipeRight = useCallback(async () => {
    if (disabled || exiting) return;
    setExitingDirection('right');
    setExiting(true);
    await onAccept();
    resetCard();
  }, [disabled, exiting, onAccept, resetCard]);

  const swipeLeft = useCallback(async () => {
    if (disabled || exiting) return;
    setExitingDirection('left');
    setExiting(true);
    await onReject();
    resetCard();
  }, [disabled, exiting, onReject, resetCard]);

  // Touch and mouse dragging mechanics
  const handleDragStart = useCallback((clientX: number, clientY: number, isMouse: boolean, target: EventTarget) => {
    if (disabled || exiting) return;

    // Ignore drags that start on interactive elements like buttons.
    // (The image carousel itself IS draggable so the card follows the finger.)
    const isInteractive = (target as HTMLElement).closest('button') ||
                          (target as HTMLElement).closest('a') ||
                          (target as HTMLElement).closest('input');
    if (isInteractive) return;

    setIsDragging(true);
    setExitingDirection(null);
    if (isMouse) {
      mouseStartX.current = clientX;
      mouseStartY.current = clientY;
    } else {
      touchStartX.current = clientX;
      touchStartY.current = clientY;
    }
  }, [disabled, exiting]);

  const handleDragMove = useCallback((clientX: number, clientY: number, isMouse: boolean) => {
    const startX = isMouse ? mouseStartX.current : touchStartX.current;
    const startY = isMouse ? mouseStartY.current : touchStartY.current;
    if (startX === null || startY === null) return;

    const dx = clientX - startX;
    const dy = clientY - startY;

    setDragX(dx);
    setDragY(dy);
  }, []);

  const handleDragEnd = useCallback(async () => {
    touchStartX.current = null;
    touchStartY.current = null;
    mouseStartX.current = null;
    mouseStartY.current = null;
    setIsDragging(false);

    const threshold = 100;
    const absX = Math.abs(dragX);
    const absY = Math.abs(dragY);

    if (absX > absY && absX > threshold) {
      if (dragX > 0) {
        // Swipe Right: Accept (save to Word page) and Next.
        await swipeRight();
      } else {
        // Swipe Left: Reject (store for reuse) and Next
        await swipeLeft();
      }
    } else {
      // Snap back (vertical swipes no longer advance)
      setDragX(0);
      setDragY(0);
      setExitingDirection(null);
    }
  }, [dragX, dragY, swipeRight, swipeLeft]);

  // Touch handlers — only the *start* lives on the element so we can read the
  // initial target/coords. move & end are bound to `window` (see effect below)
  // with passive:false so we can preventDefault and stop the page scrolling /
  // cancelling the touch mid-drag (which is why mobile dragging failed before).
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    handleDragStart(e.touches[0].clientX, e.touches[0].clientY, false, e.target);
  }, [handleDragStart]);

  // Mouse handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return; // Left click only
    handleDragStart(e.clientX, e.clientY, true, e.target);
  }, [handleDragStart]);

  // Handle window-level move & end for BOTH mouse and touch while dragging.
  // Binding to window (instead of the element) keeps the drag alive even when
  // the finger/cursor leaves the card, and the non-passive touchmove lets us
  // preventDefault so the page doesn't scroll and abort the gesture on mobile.
  useEffect(() => {
    if (!isDragging) return;

    const handleWindowMouseMove = (e: MouseEvent) => {
      handleDragMove(e.clientX, e.clientY, true);
    };

    const handleWindowMouseUp = () => {
      void handleDragEnd();
    };

    const handleWindowTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      // Stop the browser from scrolling/zooming so the card follows the finger.
      e.preventDefault();
      handleDragMove(e.touches[0].clientX, e.touches[0].clientY, false);
    };

    const handleWindowTouchEnd = () => {
      void handleDragEnd();
    };

    window.addEventListener("mousemove", handleWindowMouseMove);
    window.addEventListener("mouseup", handleWindowMouseUp);
    window.addEventListener("touchmove", handleWindowTouchMove, { passive: false });
    window.addEventListener("touchend", handleWindowTouchEnd);
    window.addEventListener("touchcancel", handleWindowTouchEnd);

    return () => {
      window.removeEventListener("mousemove", handleWindowMouseMove);
      window.removeEventListener("mouseup", handleWindowMouseUp);
      window.removeEventListener("touchmove", handleWindowTouchMove);
      window.removeEventListener("touchend", handleWindowTouchEnd);
      window.removeEventListener("touchcancel", handleWindowTouchEnd);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  return {
    dragX,
    dragY,
    isDragging,
    exiting,
    exitingDirection,
    handleTouchStart,
    handleMouseDown,
    swipeRight,
    swipeLeft,
    resetCard,
  };
}
