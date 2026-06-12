/**
 * Pure word filtering/curation logic for the flashcard setup wizard.
 * Extracted from FlashcardSetupGuide so it can be unit-tested without rendering.
 */

export type AIStrategy = "recent" | "random" | "oldest" | "topic";

// The saved-word records carry loosely-typed, language-specific fields. We list
// the fields this module reads and keep the rest open via an index signature.
interface Word {
  id?: string;
  korean?: string;
  label?: string;
  reading?: string;
  romanization?: string;
  english?: string;
  createdAt: number;
  [key: string]: unknown;
}

/** Filter saved words by the manual-select search box query. */
export function filterWordsByManualQuery(savedWords: Word[] | null | undefined, query: string): Word[] {
  if (!savedWords) return [];
  const q = query.toLowerCase().trim();
  return savedWords.filter((w) => {
    if (!q) return true;
    return (
      (w.korean && w.korean.toLowerCase().includes(q)) ||
      (w.label && w.label.toLowerCase().includes(q)) ||
      (w.reading && w.reading.toLowerCase().includes(q)) ||
      (w.romanization && w.romanization.toLowerCase().includes(q)) ||
      (w.english && w.english.toLowerCase().includes(q))
    );
  });
}

export interface CurationParams {
  savedWords: Word[] | null | undefined;
  aiStrategy: AIStrategy | null;
  customTopic: string;
  setSize: number | "all";
}

/**
 * Smart curation for the AI-curated path: filter by topic (when strategy is
 * 'topic'), sort by the chosen strategy, then slice to the requested size.
 */
export function curateWords({ savedWords, aiStrategy, customTopic, setSize }: CurationParams): Word[] {
  if (!savedWords || savedWords.length === 0) return [];
  let list = [...savedWords];

  // 1. Filter by Custom Topic if strategy is 'topic'
  if (aiStrategy === "topic" && customTopic.trim()) {
    const query = customTopic.toLowerCase().trim();
    list = list.filter((w) => {
      return (
        (w.label && w.label.toLowerCase().includes(query)) ||
        (w.english && w.english.toLowerCase().includes(query)) ||
        (w.korean && w.korean.toLowerCase().includes(query)) ||
        (w.reading && w.reading.toLowerCase().includes(query))
      );
    });
  }

  // 2. Apply Strategy Sorting
  if (aiStrategy === "recent") {
    // most recently scanned
    list.sort((a, b) => b.createdAt - a.createdAt);
  } else if (aiStrategy === "oldest") {
    // oldest scanned (helps prevent forgetting)
    list.sort((a, b) => a.createdAt - b.createdAt);
  } else if (aiStrategy === "random") {
    // shuffle array using Fisher-Yates
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
  }

  // 3. Slice according to requested size
  if (setSize !== "all" && list.length > setSize) {
    list = list.slice(0, setSize);
  }

  return list;
}
