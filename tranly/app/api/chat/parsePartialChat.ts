/**
 * Partial-buffer parser for streaming chat responses.
 *
 * Extracts whatever sentence data is already available from an incomplete JSON
 * buffer — used for live preview while the LLM is still generating. Does NOT
 * throw; returns empty sentences when nothing is readable yet.
 *
 * For the final, complete response use `parseChatResponse` instead.
 */

export interface PartialSentence {
  englishText: string;
  english?: string;
  translation?: string;
}

export interface PartialChatResponse {
  sentences: PartialSentence[];
}

/**
 * Extract all complete sentence objects from a partial JSON buffer.
 * Each sentence must have at least a non-empty `englishText` field.
 *
 * Only scans within the "sentences" array region — stops before "suggestions"
 * or "ended" so that suggestion objects (which also use "englishText") are
 * never mistaken for sentences.
 */
export function parsePartialChat(buffer: string): PartialChatResponse {
  if (!buffer || buffer.trim().length === 0) {
    return { sentences: [] };
  }

  // Narrow the scan region to everything after "sentences" and before the
  // first sibling key ("suggestions" or "ended") that follows it.
  const sentencesStart = buffer.indexOf('"sentences"');
  if (sentencesStart === -1) {
    return { sentences: [] };
  }

  let regionEnd = buffer.length;
  for (const sibling of ['"suggestions"', '"ended"']) {
    const idx = buffer.indexOf(sibling, sentencesStart + 11);
    if (idx !== -1 && idx < regionEnd) regionEnd = idx;
  }

  const region = buffer.slice(sentencesStart, regionEnd);

  const sentences: PartialSentence[] = [];

  // Match complete sentence objects: { "englishText": "...", optional fields }
  const sentenceRe =
    /\{\s*"englishText"\s*:\s*"((?:\\.|[^"\\])*)"\s*(?:,[\s\S]*?)?(?=\s*\})/g;

  let m: RegExpExecArray | null;
  while ((m = sentenceRe.exec(region)) !== null) {
    const englishText = safeUnescape(m[1]);
    if (!englishText.trim()) continue;

    // Extract optional fields from the same object region
    const objRegion = region.slice(m.index, m.index + 600);
    const english = extractField(objRegion, 'english');
    const translation = extractField(objRegion, 'translation');

    sentences.push({ englishText, ...(english ? { english } : {}), ...(translation ? { translation } : {}) });
  }

  return { sentences };
}

function extractField(src: string, key: string): string | undefined {
  const re = new RegExp(`"${key}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`, 'i');
  const m = src.match(re);
  if (!m) return undefined;
  const v = safeUnescape(m[1]).trim();
  return v.length > 0 ? v : undefined;
}

function safeUnescape(s: string): string {
  try {
    return JSON.parse(`"${s}"`);
  } catch {
    return s;
  }
}
