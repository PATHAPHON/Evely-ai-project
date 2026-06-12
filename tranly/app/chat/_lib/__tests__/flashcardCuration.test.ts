import { describe, it, expect } from "vitest";
import { curateWords, filterWordsByManualQuery } from "../flashcardCuration";

const words = [
  { id: "1", korean: "사과", label: "apple", reading: "ซากวา", romanization: "sagwa", english: "apple", createdAt: 30 },
  { id: "2", korean: "개", label: "dog", reading: "แก", romanization: "gae", english: "dog", createdAt: 10 },
  { id: "3", korean: "고양이", label: "cat", reading: "โกยังงี", romanization: "goyangi", english: "cat", createdAt: 20 },
];

describe("filterWordsByManualQuery", () => {
  it("returns all when query is empty/whitespace", () => {
    expect(filterWordsByManualQuery(words, "  ")).toHaveLength(3);
  });

  it("returns [] for null input", () => {
    expect(filterWordsByManualQuery(null, "a")).toEqual([]);
  });

  it("matches across korean/label/reading/romanization/english (case-insensitive)", () => {
    expect(filterWordsByManualQuery(words, "APPLE").map((w) => w.id)).toEqual(["1"]);
    expect(filterWordsByManualQuery(words, "goyangi").map((w) => w.id)).toEqual(["3"]);
    expect(filterWordsByManualQuery(words, "개").map((w) => w.id)).toEqual(["2"]);
  });
});

describe("curateWords", () => {
  it("returns [] for empty bank", () => {
    expect(curateWords({ savedWords: [], aiStrategy: "recent", customTopic: "", setSize: 10 })).toEqual([]);
  });

  it("sorts by recent (createdAt desc)", () => {
    const out = curateWords({ savedWords: words, aiStrategy: "recent", customTopic: "", setSize: "all" });
    expect(out.map((w) => w.id)).toEqual(["1", "3", "2"]);
  });

  it("sorts by oldest (createdAt asc)", () => {
    const out = curateWords({ savedWords: words, aiStrategy: "oldest", customTopic: "", setSize: "all" });
    expect(out.map((w) => w.id)).toEqual(["2", "3", "1"]);
  });

  it("filters by topic before sizing", () => {
    const out = curateWords({ savedWords: words, aiStrategy: "topic", customTopic: "cat", setSize: "all" });
    expect(out.map((w) => w.id)).toEqual(["3"]);
  });

  it("slices to setSize", () => {
    const out = curateWords({ savedWords: words, aiStrategy: "recent", customTopic: "", setSize: 2 });
    expect(out.map((w) => w.id)).toEqual(["1", "3"]);
  });

  it("does not mutate the input array", () => {
    const copy = words.map((w) => w.id);
    curateWords({ savedWords: words, aiStrategy: "recent", customTopic: "", setSize: "all" });
    expect(words.map((w) => w.id)).toEqual(copy);
  });

  it("random keeps the same set of ids", () => {
    const out = curateWords({ savedWords: words, aiStrategy: "random", customTopic: "", setSize: "all" });
    expect(out.map((w) => w.id).sort()).toEqual(["1", "2", "3"]);
  });
});
