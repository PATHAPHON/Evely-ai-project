"use client";

import { useEffect, useRef, useState } from "react";
import { useStrings } from "@/app/_lib/strings";
import type { StudyHeatmap } from "../_lib/useStudyHeatmap";

interface LearningHeatmapProps {
  heatmap: StudyHeatmap | null;
}

const CELL = 13;
const GAP = 3;
const COL_W = CELL + GAP;

const LEVEL_BG = ["bg-heat-0", "bg-heat-1", "bg-heat-2", "bg-heat-3", "bg-heat-4"];

export default function LearningHeatmap({ heatmap }: LearningHeatmapProps) {
  const t = useStrings();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<string | null>(null);

  // Keep the most recent weeks in view.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) requestAnimationFrame(() => (el.scrollLeft = el.scrollWidth));
  }, [heatmap]);

  const periodLabel = t.profile.period1y;

  const selectedCell = heatmap?.cells.find((c) => c.dateKey === selected) ?? null;
  let tip = t.profile.heatTapHint;
  let tipMuted = true;
  if (selectedCell) {
    const dateStr = `${selectedCell.day} ${t.profile.monthsShort[selectedCell.month]}`;
    tip =
      selectedCell.sessions > 0
        ? t.profile.heatStudied(dateStr, selectedCell.cards)
        : t.profile.heatRest(dateStr);
    tipMuted = false;
  }

  return (
    <div className="rounded-2xl border-3 border-border-color bg-card-bg p-4 shadow-nb-md">
      {/* Header */}
      <div className="text-base font-extrabold text-text-primary">
        {heatmap ? (
          <>
            <span className="text-accent-green">{heatmap.studiedDays}</span>{" "}
            {t.profile.heatTitle(heatmap.studiedDays).replace(`${heatmap.studiedDays} `, "")}
          </>
        ) : (
          "…"
        )}
      </div>

      <p className="mt-1 mb-3.5 text-xs text-text-secondary">
        {heatmap ? t.profile.heatSubtitle(heatmap.studiedDays, periodLabel) : ""}
      </p>

      {/* Grid */}
      <div ref={scrollRef} className="-mx-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {heatmap ? (
          <>
            {/* Month labels */}
            <div className="relative mb-1 h-3.5" style={{ minWidth: `${heatmap.weeks * COL_W}px` }}>
              {heatmap.monthLabels.map((m) => (
                <span
                  key={`${m.col}-${m.month}`}
                  className="absolute font-mono text-[10px] text-text-meta"
                  style={{ left: `${m.col * COL_W}px` }}
                >
                  {t.profile.monthsShort[m.month]}
                </span>
              ))}
            </div>

            <div
              className="grid"
              style={{
                gridAutoFlow: "column",
                gridTemplateRows: `repeat(7, ${CELL}px)`,
                gap: `${GAP}px`,
                minWidth: `${heatmap.weeks * COL_W}px`,
              }}
            >
              {heatmap.cells.map((cell, i) =>
                cell.inRange ? (
                  <button
                    key={cell.dateKey || i}
                    type="button"
                    onClick={() => setSelected(cell.dateKey)}
                    aria-label={`${cell.day} ${t.profile.monthsShort[cell.month]}`}
                    className={`rounded-[4px] ring-1 ring-inset ring-black/5 transition-transform duration-100 hover:scale-110 hover:ring-black/15 cursor-pointer ${LEVEL_BG[cell.level]} ${
                      selected === cell.dateKey
                        ? "outline outline-2 outline-offset-1 outline-text-primary"
                        : ""
                    }`}
                    style={{ width: `${CELL}px`, height: `${CELL}px` }}
                  />
                ) : (
                  <span key={i} style={{ width: `${CELL}px`, height: `${CELL}px` }} />
                )
              )}
            </div>
          </>
        ) : (
          <div className="h-[105px] animate-pulse rounded-lg bg-gray-200 dark:bg-[#4a4a6a]" />
        )}
      </div>

      {/* Foot */}
      <div className="mt-3 flex items-center justify-between gap-2">
        <div className={`min-h-[18px] text-xs ${tipMuted ? "text-text-meta" : "font-semibold text-text-primary"}`}>
          {tip}
        </div>
        <div className="flex shrink-0 items-center gap-1 text-[11px] text-text-meta">
          {t.profile.legendLess}
          {LEVEL_BG.map((bg) => (
            <span key={bg} className={`h-3 w-3 rounded-[4px] ring-1 ring-inset ring-black/5 ${bg}`} />
          ))}
          {t.profile.legendMore}
        </div>
      </div>
    </div>
  );
}
