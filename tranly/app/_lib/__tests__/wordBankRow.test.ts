import { describe, it, expect } from "vitest";
import { isAuthExpiredError, rowToWordBankEntry, type WordRow } from "../utils/wordBankRow";

describe("isAuthExpiredError", () => {
  it("returns false for null", () => {
    expect(isAuthExpiredError(null)).toBe(false);
  });

  it("detects jwt expired message (case-insensitive)", () => {
    expect(isAuthExpiredError({ message: "JWT expired" })).toBe(true);
  });

  it("detects invalid claim and not authenticated", () => {
    expect(isAuthExpiredError({ message: "invalid claim: x" })).toBe(true);
    expect(isAuthExpiredError({ message: "User not authenticated" })).toBe(true);
  });

  it("detects PGRST301 and 401 codes", () => {
    expect(isAuthExpiredError({ code: "PGRST301" })).toBe(true);
    expect(isAuthExpiredError({ code: "401" })).toBe(true);
  });

  it("returns false for unrelated errors", () => {
    expect(isAuthExpiredError({ message: "duplicate key", code: "23505" })).toBe(false);
  });
});

describe("rowToWordBankEntry", () => {
  const baseRow: WordRow = {
    id: "id-1",
    word: "Apple",
    thai: "แอปเปิล",
    ipa: "ˈæp.əl",
    part_of_speech: "noun",
  };

  it("uses the provided wordKey, not row.word", () => {
    const entry = rowToWordBankEntry(baseRow, "apple");
    expect(entry.word).toBe("apple");
    expect(entry.id).toBe("id-1");
    expect(entry.thai).toBe("แอปเปิล");
    expect(entry.partOfSpeech).toBe("noun");
  });

  it("applies defaults when progress is missing", () => {
    const entry = rowToWordBankEntry(baseRow, "apple");
    expect(entry.box).toBe(1);
    expect(entry.interval).toBe(1);
    expect(entry.easeFactor).toBe(2.5);
    expect(entry.nextReviewAt).toEqual(new Date(0));
    expect(entry.lastReviewedAt).toBeNull();
  });

  it("reads progress from an array join", () => {
    const entry = rowToWordBankEntry(
      { ...baseRow, word_progress: [{ box: 3, interval: 7, ease_factor: 2.1, next_review_at: "2026-01-01T00:00:00.000Z", last_reviewed_at: "2025-12-25T00:00:00.000Z" }] },
      "apple"
    );
    expect(entry.box).toBe(3);
    expect(entry.interval).toBe(7);
    expect(entry.easeFactor).toBe(2.1);
    expect(entry.nextReviewAt).toEqual(new Date("2026-01-01T00:00:00.000Z"));
    expect(entry.lastReviewedAt).toEqual(new Date("2025-12-25T00:00:00.000Z"));
  });

  it("nulls out empty string fields", () => {
    const entry = rowToWordBankEntry({ id: "x", word: "", thai: "", ipa: "", part_of_speech: "" }, "k");
    expect(entry.thai).toBeNull();
    expect(entry.ipa).toBeNull();
    expect(entry.partOfSpeech).toBeNull();
  });
});
