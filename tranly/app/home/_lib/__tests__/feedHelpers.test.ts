import { describe, it, expect } from "vitest";
import {
  getPrimaryWord,
  getTodayDateKey,
  shuffle,
  computeCardTransform,
} from "../feedHelpers";
import type { FeedWordRecord } from "../types";

describe("getPrimaryWord", () => {
  it("returns the word field", () => {
    expect(getPrimaryWord({ word: "apple" } as FeedWordRecord)).toBe("apple");
  });

  it("returns empty string when word is missing", () => {
    expect(getPrimaryWord({} as FeedWordRecord)).toBe("");
  });
});

describe("getTodayDateKey", () => {
  it("formats as zero-padded YYYY-MM-DD", () => {
    expect(getTodayDateKey()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("shuffle", () => {
  it("returns a new array with the same elements", () => {
    const input = [1, 2, 3, 4, 5];
    const out = shuffle(input);
    expect(out).not.toBe(input);
    expect([...out].sort((a, b) => a - b)).toEqual(input);
  });

  it("does not mutate the input array", () => {
    const input = [1, 2, 3];
    const copy = [...input];
    shuffle(input);
    expect(input).toEqual(copy);
  });

  it("handles empty array", () => {
    expect(shuffle([])).toEqual([]);
  });
});

describe("computeCardTransform", () => {
  const base = { dragX: 30, dragY: 10 };

  it("uses scale(0.98) while dragging", () => {
    expect(
      computeCardTransform({ ...base, isDragging: true, exiting: false, exitingDirection: null })
    ).toBe(`translate(30px, 10px) rotate(${30 * 0.04}deg) scale(0.98)`);
  });

  it("flies right when exiting right", () => {
    expect(
      computeCardTransform({ ...base, isDragging: false, exiting: true, exitingDirection: "right" })
    ).toBe("translate(600px, 10px) rotate(20deg) scale(0.95)");
  });

  it("flies left when exiting left", () => {
    expect(
      computeCardTransform({ ...base, isDragging: false, exiting: true, exitingDirection: "left" })
    ).toBe("translate(-600px, 10px) rotate(-20deg) scale(0.95)");
  });

  it("resets when exiting with no direction", () => {
    expect(
      computeCardTransform({ ...base, isDragging: false, exiting: true, exitingDirection: null })
    ).toBe("translate(0px, 0px) rotate(0deg) scale(1)");
  });

  it("idle state uses scale(1)", () => {
    expect(
      computeCardTransform({ ...base, isDragging: false, exiting: false, exitingDirection: null })
    ).toBe(`translate(30px, 10px) rotate(${30 * 0.04}deg) scale(1)`);
  });
});
