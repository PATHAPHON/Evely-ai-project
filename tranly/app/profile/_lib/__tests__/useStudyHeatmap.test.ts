import { describe, it, expect } from "vitest";
import { computeHeatmap } from "../hooks/useStudyHeatmap";
import type { StudySession } from "@/app/_lib/types/studySessionTypes";

const DAY = 86_400_000;

// Fixed reference "now": Wed 2026-06-03 12:00 local.
const NOW = new Date(2026, 5, 3, 12, 0, 0).getTime();

function session(daysAgo: number, cards = 5): StudySession {
  return {
    id: `s-${daysAgo}-${Math.random()}`,
    language: "english",
    flashcardSetId: "set-1",
    completedAt: NOW - daysAgo * DAY,
    cardsReviewed: cards,
  };
}

describe("computeHeatmap", () => {
  it("renders a full grid of weeks * 7 cells spanning the calendar year", () => {
    const hm = computeHeatmap([], 0, NOW);
    expect(hm.cells).toHaveLength(hm.weeks * 7);
    // 2026 spans Jan–Dec padded to whole Mon–Sun weeks (54 weeks).
    expect(hm.weeks).toBe(54);
    // First in-range cell is Jan 1, last is today.
    const inRange = hm.cells.filter((c) => c.inRange);
    expect(inRange[0].month).toBe(0);
    expect(inRange[0].day).toBe(1);
  });

  it("counts distinct studied days in range", () => {
    const sessions = [session(0), session(0), session(1), session(2)];
    const hm = computeHeatmap(sessions, 26, NOW);
    expect(hm.studiedDays).toBe(3); // two sessions same day count once
  });

  it("sums cards per day for intensity level", () => {
    const sessions = [session(1, 30), session(1, 30)]; // 60 cards -> level 4
    const hm = computeHeatmap(sessions, 26, NOW);
    const cell = hm.cells.find((c) => c.sessions > 0);
    expect(cell?.cards).toBe(60);
    expect(cell?.level).toBe(4);
  });

  it("computes a current streak ending today", () => {
    const sessions = [session(0), session(1), session(2)];
    const hm = computeHeatmap(sessions, 26, NOW);
    expect(hm.currentStreak).toBe(3);
  });

  it("keeps the streak alive from yesterday when today is idle", () => {
    const sessions = [session(1), session(2)];
    const hm = computeHeatmap(sessions, 26, NOW);
    expect(hm.currentStreak).toBe(2);
  });

  it("breaks the streak across a gap", () => {
    const sessions = [session(0), session(1), session(3)];
    const hm = computeHeatmap(sessions, 26, NOW);
    expect(hm.currentStreak).toBe(2);
  });

  it("computes the longest historical streak", () => {
    const sessions = [
      session(10), session(11), session(12), session(13), // run of 4
      session(0), session(1), // run of 2
    ];
    const hm = computeHeatmap(sessions, 26, NOW);
    expect(hm.maxStreak).toBe(4);
  });

  it("returns 7 week dots with today flagged", () => {
    const hm = computeHeatmap([session(0)], 26, NOW);
    expect(hm.weekDots).toHaveLength(7);
    const today = hm.weekDots.find((d) => d.isToday);
    expect(today?.studied).toBe(true);
  });

  it("marks out-of-range future cells as not in range", () => {
    const hm = computeHeatmap([], 13, NOW);
    expect(hm.cells.some((c) => !c.inRange)).toBe(true);
    expect(hm.cells.every((c) => (c.inRange ? c.dateKey !== "" : c.dateKey === ""))).toBe(true);
  });
});
