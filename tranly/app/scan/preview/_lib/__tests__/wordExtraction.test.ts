import { describe, it, expect, vi, afterEach } from "vitest";
import {
  extractAllTextFromResponse,
  filterMeaningfulWords,
  buildSaveInputFromResponse,
  enrichWord,
} from "../wordExtraction";
import type { IdentifySuccessResponse } from "../../../_lib/types";

describe("extractAllTextFromResponse", () => {
  it("joins label and word when word is present", () => {
    expect(extractAllTextFromResponse({ label: "แอปเปิล", word: "apple" } as IdentifySuccessResponse)).toBe("แอปเปิล apple");
  });

  it("excludes pronunciation fields (ipa/romanization etc.)", () => {
    expect(
      extractAllTextFromResponse({ label: "แอปเปิล", word: "apple", ipa: "ˈæp.əl", romanization: "sagwa" } as IdentifySuccessResponse)
    ).toBe("แอปเปิล apple");
  });

  it("omits the word part entirely when there is no word field", () => {
    expect(
      extractAllTextFromResponse({ label: "แอปเปิล", korean: "사과", romanization: "sagwa" } as IdentifySuccessResponse)
    ).toBe("แอปเปิล");
  });

  it("handles a missing label", () => {
    expect(extractAllTextFromResponse({} as IdentifySuccessResponse)).toBe("");
  });
});

describe("filterMeaningfulWords", () => {
  it("keeps real single-letter words a and i (case-insensitive)", () => {
    expect(filterMeaningfulWords(["a", "I", "apple"])).toEqual(["a", "I", "apple"]);
  });

  it("drops spurious single letters", () => {
    expect(filterMeaningfulWords(["p", "r", "s", "n", "person"])).toEqual(["person"]);
  });

  it("keeps multi-char words but drops single-char tokens (incl. single CJK)", () => {
    expect(filterMeaningfulWords(["사과", "犬", "ok"])).toEqual(["사과", "ok"]);
  });
});

describe("buildSaveInputFromResponse", () => {
  it("uses label and word.english when word present", () => {
    expect(buildSaveInputFromResponse({ label: "แมว", word: "cat" } as IdentifySuccessResponse)).toEqual({ label: "แมว", english: "cat" });
  });

  it("falls back to word as label when label is empty", () => {
    expect(buildSaveInputFromResponse({ label: "", word: "cat" } as IdentifySuccessResponse)).toEqual({ label: "cat", english: "cat" });
  });

  it("returns just label when no word field", () => {
    expect(buildSaveInputFromResponse({ label: "แมว", korean: "고양이" } as IdentifySuccessResponse)).toEqual({ label: "แมว" });
  });
});

describe("enrichWord", () => {
  afterEach(() => vi.restoreAllMocks());

  it("maps a successful translate response", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({ translation: "แมว", korean: "cat", reading: "แค็ท", english: "cat" }),
    })) as unknown as typeof fetch);
    expect(await enrichWord("cat", {})).toEqual({ label: "แมว", korean: "cat", reading: "แค็ท", english: "cat" });
  });

  it("falls back to minimal record on non-ok response", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, json: async () => ({}) })) as unknown as typeof fetch);
    expect(await enrichWord("cat", {})).toEqual({ label: "cat", english: "cat" });
  });

  it("falls back when fetch throws", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network"); }) as unknown as typeof fetch);
    expect(await enrichWord("cat", {})).toEqual({ label: "cat", english: "cat" });
  });
});
