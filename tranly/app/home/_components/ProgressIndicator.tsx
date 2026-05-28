"use client";

import { formatProgress } from "../_lib/formatProgress";

interface ProgressIndicatorProps {
  current: number;
  total: number;
}

/**
 * Displays the current card position relative to total cards
 * in "current/total" format with Neobrutalist styling.
 *
 * Requirements: 1.4
 */
export default function ProgressIndicator({
  current,
  total,
}: ProgressIndicatorProps) {
  return (
    <div
      className="inline-flex items-center justify-center px-3 py-1 rounded-lg border-3 border-black bg-white font-bold text-sm shadow-[4px_4px_0_#000000]"
      aria-label={`Card ${current} of ${total}`}
    >
      {formatProgress(current, total)}
    </div>
  );
}
