const KKU_API_URL = 'https://gen.ai.kku.ac.th/api/v1/chat/completions';
const TIMEOUT_MS = 15_000;

export interface TranslateResult {
  translations: string[];
  tokens: number;
}

/** Common contract every translation provider must satisfy. */
export interface Translator {
  translateWithUsage(texts: string[]): Promise<TranslateResult | null>;
  translate(texts: string[]): Promise<string[] | null>;
}

/**
 * KKU (DeepSeek V4 Flash) translation provider.
 *
 * Encapsulates the API endpoint, auth, timeout, and reply-parsing so callers
 * depend on the `Translator` contract rather than provider internals — swap
 * providers by plugging in a different implementation.
 */
export class KkuTranslator implements Translator {
  constructor(
    private readonly apiKey: string,
    private readonly model = 'deepseek-v4-flash',
  ) {}

  /**
   * Translate an array of English texts to Thai via KKU DeepSeek V4 Flash.
   * Asks for a JSON array reply so results map back to inputs by index.
   * Returns null when the key is missing, the reply is malformed, or the
   * array length doesn't match the input (callers have their own fallback).
   */
  async translateWithUsage(texts: string[]): Promise<TranslateResult | null> {
    if (!this.apiKey || texts.length === 0) return null;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const res = await fetch(KKU_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'user',
              content:
                `Translate each English phrase to natural Thai. Reply with ONLY a raw ` +
                `JSON array of Thai strings — same order and same length as the input. ` +
                `No markdown, no code fences, no extra text.\n` +
                `Input: ${JSON.stringify(texts)}`,
            },
          ],
          // Disable reasoning — translation needs no chain-of-thought (≈halves cost/latency).
          chat_template_kwargs: { thinking: false },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      if (!res.ok) return null;

      const data = await res.json() as {
        choices?: { message?: { content?: string } }[];
        content?: string;
        usage?: { total_tokens?: number };
      };
      const content = data.choices?.[0]?.message?.content ?? data.content;
      if (!content) return null;

      // Strip optional ```json ... ``` fence, then take the [...] array.
      const fenced = content.replace(/```(?:json)?/gi, '').trim();
      const start = fenced.indexOf('[');
      const end = fenced.lastIndexOf(']');
      if (start === -1 || end <= start) return null;

      const parsed = JSON.parse(fenced.slice(start, end + 1)) as unknown;
      if (!Array.isArray(parsed)) return null;

      // Salvage instead of all-or-nothing: normalise to the input length so a
      // slightly-off reply (extra/missing/non-string items) still yields Thai for
      // the items that came back, rather than blanking the whole batch.
      const translations = texts.map((_, i) =>
        typeof parsed[i] === 'string' ? (parsed[i] as string) : ''
      );

      return {
        translations,
        tokens: data.usage?.total_tokens ?? 0,
      };
    } catch {
      clearTimeout(timeoutId);
      return null;
    }
  }

  /**
   * Drop-in replacement for the old deeplTranslate signature.
   * Returns just the translations, or null on any failure.
   */
  async translate(texts: string[]): Promise<string[] | null> {
    const result = await this.translateWithUsage(texts);
    return result?.translations ?? null;
  }
}

/**
 * @deprecated Use `new KkuTranslator(process.env.KKU_API_KEY ?? '')` instead.
 * Kept as a thin wrapper so existing callers keep working untouched.
 */
export async function kkuTranslateWithUsage(
  texts: string[]
): Promise<TranslateResult | null> {
  return new KkuTranslator(process.env.KKU_API_KEY ?? '').translateWithUsage(texts);
}

/**
 * @deprecated Use `new KkuTranslator(process.env.KKU_API_KEY ?? '')` instead.
 * Kept as a thin wrapper so existing callers keep working untouched.
 */
export async function kkuTranslate(texts: string[]): Promise<string[] | null> {
  return new KkuTranslator(process.env.KKU_API_KEY ?? '').translate(texts);
}