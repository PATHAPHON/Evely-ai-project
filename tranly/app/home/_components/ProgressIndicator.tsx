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
      className="inline-flex items-center justify-center px-3 py-1 rounded-lg border-3 border-black dark:border-[#4a4a6a] bg-white dark:bg-[#2d2d44] font-bold text-sm text-black dark:text-white shadow-nb-md"
      aria-label={`Card ${current} of ${total}`}
    >
      {formatProgress(current, total)}
    </div>
  );
}
