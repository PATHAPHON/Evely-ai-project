"use client";

import { useMemo } from "react";
import { useStudySessions } from "@/app/_lib/useStudySessions";
import type { StudySession } from "@/app/_lib/studySessionTypes";

const DAY_MS = 86_400_000;

export interface HeatCell {
  /** Local YYYY-MM-DD key; empty for out-of-range padding cells. */
  dateKey: string;
  /** Day-of-month (1-31); 0 for padding cells. */
  day: number;
  /** Month index 0-11; -1 for padding cells. */
  month: number;
  /** Number of study sessions completed that day. */
  sessions: number;
  /** Total cards reviewed that day. */
  cards: number;
  /** Intensity bucket 0-4 (0 = no study). */
  level: 0 | 1 | 2 | 3 | 4;
  /** False for future/padding cells that should render blank. */
  inRange: boolean;
}

export interface MonthLabel {
  col: number;
  month: number;
}

export interface WeekDot {
  /** Weekday index, Monday = 0 … Sunday = 6. */
  index: number;
  studied: boolean;
  isToday: boolean;
  isFuture: boolean;
}

export interface StudyHeatmap {
  /** Column-major cells (grid-auto-flow: column, 7 rows). */
  cells: HeatCell[];
  /** Number of columns (weeks) rendered. */
  weeks: number;
  /** Month labels positioned by column index. */
  monthLabels: MonthLabel[];
  /** Distinct days studied within the rendered range. */
  studiedDays: number;
  /** Current consecutive-day streak (counts today, else from yesterday). */
  currentStreak: number;
  /** Longest consecutive-day streak across all sessions. */
  maxStreak: number;
  /** Mon–Sun dots for the current calendar week. */
  weekDots: WeekDot[];
}

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function dateKeyOf(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Monday = 0 … Sunday = 6. */
function mondayIndex(ts: number): number {
  return (new Date(ts).getDay() + 6) % 7;
}

function levelFor(cards: number): 0 | 1 | 2 | 3 | 4 {
  if (cards <= 0) return 0;
  if (cards < 10) return 1;
  if (cards < 25) return 2;
  if (cards < 50) return 3;
  return 4;
}

interface DayAgg {
  sessions: number;
  cards: number;
}

/**
 * Pure heatmap computation. Exposed for testing; `now` defaults to Date.now().
 */
export function computeHeatmap(
  sessions: StudySession[],
  _weeks: number,
  now: number = Date.now()
): StudyHeatmap {
  const today = startOfDay(now);

  // Aggregate sessions per local day.
  const byDay = new Map<string, DayAgg>();
  for (const s of sessions) {
    const key = dateKeyOf(startOfDay(s.completedAt));
    const agg = byDay.get(key) ?? { sessions: 0, cards: 0 };
    agg.sessions += 1;
    agg.cards += s.cardsReviewed;
    byDay.set(key, agg);
  }

  const studiedKeys = new Set<string>();
  byDay.forEach((agg, key) => {
    if (agg.sessions > 0) studiedKeys.add(key);
  });

  // Grid spans the current calendar year (Jan 1 – Dec 31), padded out to whole
  // Monday–Sunday weeks at both ends.
  const year = new Date(today).getFullYear();
  const yearStart = startOfDay(new Date(year, 0, 1).getTime());
  const yearEnd = startOfDay(new Date(year, 11, 31).getTime());
  const startTs = yearStart - mondayIndex(yearStart) * DAY_MS;
  const endTs = yearEnd + (6 - mondayIndex(yearEnd)) * DAY_MS;
  const weeks = Math.round((endTs - startTs) / (7 * DAY_MS)) + 1;

  const cells: HeatCell[] = [];
  const monthLabels: MonthLabel[] = [];
  let studiedDays = 0;
  let lastLabelMonth = -1;

  for (let i = 0; i < weeks * 7; i++) {
    const ts = startTs + i * DAY_MS;
    const col = Math.floor(i / 7);
    const row = i % 7;
    const inRange = ts >= yearStart && ts <= yearEnd;
    const d = new Date(ts);

    if (!inRange) {
      cells.push({
        dateKey: "",
        day: 0,
        month: -1,
        sessions: 0,
        cards: 0,
        level: 0,
        inRange: false,
      });
      continue;
    }

    const key = dateKeyOf(ts);
    const agg = byDay.get(key) ?? { sessions: 0, cards: 0 };
    if (agg.sessions > 0) studiedDays++;

    cells.push({
      dateKey: key,
      day: d.getDate(),
      month: d.getMonth(),
      sessions: agg.sessions,
      cards: agg.cards,
      level: levelFor(agg.cards),
      inRange: true,
    });

    // Month label at the top row of a column when a new month begins.
    if (row === 0 && d.getMonth() !== lastLabelMonth) {
      monthLabels.push({ col, month: d.getMonth() });
      lastLabelMonth = d.getMonth();
    }
  }

  // Current streak: count back from today (or yesterday if today is idle).
  let currentStreak = 0;
  let cursor = today;
  if (!studiedKeys.has(dateKeyOf(today))) cursor = today - DAY_MS;
  while (studiedKeys.has(dateKeyOf(cursor))) {
    currentStreak++;
    cursor -= DAY_MS;
  }

  // Max streak across all studied days.
  let maxStreak = 0;
  if (studiedKeys.size > 0) {
    const sortedTs = Array.from(studiedKeys)
      .map((k) => startOfDay(new Date(k + "T00:00:00").getTime()))
      .sort((a, b) => a - b);
    let run = 1;
    maxStreak = 1;
    for (let i = 1; i < sortedTs.length; i++) {
      const diff = Math.round((sortedTs[i] - sortedTs[i - 1]) / DAY_MS);
      run = diff === 1 ? run + 1 : 1;
      if (run > maxStreak) maxStreak = run;
    }
  }

  // Current week dots (Mon–Sun).
  const weekStart = today - mondayIndex(today) * DAY_MS;
  const weekDots: WeekDot[] = [];
  for (let i = 0; i < 7; i++) {
    const ts = weekStart + i * DAY_MS;
    weekDots.push({
      index: i,
      studied: studiedKeys.has(dateKeyOf(ts)),
      isToday: ts === today,
      isFuture: ts > today,
    });
  }

  return {
    cells,
    weeks,
    monthLabels,
    studiedDays,
    currentStreak,
    maxStreak,
    weekDots,
  };
}

/**
 * Builds a GitHub-style study heatmap from the active language's study
 * sessions. `weeks` controls the visible range (13 ≈ 3mo, 26 ≈ 6mo, 52 = 1yr).
 * Returns `null` while sessions are still loading.
 */
export function useStudyHeatmap(weeks: number): StudyHeatmap | null {
  const { sessions } = useStudySessions();

  return useMemo(() => {
    if (sessions === null) return null;
    return computeHeatmap(sessions, weeks);
  }, [sessions, weeks]);
}
