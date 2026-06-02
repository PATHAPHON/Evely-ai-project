"use client";

import { useStrings } from "@/app/_lib/strings";
import type { StudyHeatmap } from "../_lib/useStudyHeatmap";

interface StreakCardProps {
  heatmap: StudyHeatmap | null;
}

/** Streak summary: flame, current/best streak, and the current week's dots. */
export default function StreakCard({ heatmap }: StreakCardProps) {
  const t = useStrings();

  if (!heatmap) {
    return (
      <div className="flex items-center gap-3.5 rounded-2xl border-3 border-border-color bg-card-bg p-4 shadow-nb-md">
        <div className="h-12 w-12 shrink-0 animate-pulse rounded-xl bg-gray-200 dark:bg-[#4a4a6a]" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-1/3 animate-pulse rounded bg-gray-200 dark:bg-[#4a4a6a]" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-gray-200 dark:bg-[#4a4a6a]" />
        </div>
      </div>
    );
  }

  const { currentStreak, maxStreak, weekDots } = heatmap;
  const toBeat = Math.max(0, maxStreak - currentStreak);

  return (
    <div className="flex items-center gap-3.5 rounded-2xl border-3 border-border-color bg-card-bg p-4 shadow-nb-md">
      <div className="grid shrink-0 place-items-center rounded-xl border-3 border-border-color bg-accent-yellow text-2xl shadow-nb-sm" style={{ height: "52px", width: "52px" }}>
        🔥
      </div>

      <div className="min-w-0 flex-1">
        <div className="text-base font-extrabold text-text-primary">
          {t.profile.streakTitle(currentStreak)}
        </div>
        <div className="mt-0.5 text-xs text-text-secondary">
          {maxStreak > 0
            ? t.profile.streakRecord(maxStreak, toBeat)
            : t.profile.streakNew(currentStreak)}
        </div>

        <div className="mt-2 flex gap-1.5">
          {weekDots.map((d, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <span
                className={`grid h-[18px] w-[18px] place-items-center rounded-full border-2 text-[10px] font-bold ${
                  d.studied
                    ? "border-accent-green bg-accent-green text-text-primary"
                    : d.isToday
                      ? "border-dashed border-accent-green text-text-secondary"
                      : "border-border-color/40 text-text-meta"
                } ${d.isFuture ? "opacity-40" : ""}`}
              >
                {d.studied ? "✓" : "·"}
              </span>
              <span className="font-mono text-[10px] text-text-meta">
                {t.profile.weekdays[i]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
