const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const TIMEOUT_MS = 15_000;
const DEFAULT_MODEL = 'google/gemini-3.1-flash-lite';

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
 * OpenRouter (Google: Gemini 3.1 Flash Lite) translation provider.
 *
 * Encapsulates the API endpoint, auth, timeout, and reply-parsing so callers
 * depend on the `Translator` contract rather than provider internals.
 */
export class OpenRouterTranslator implements Translator {
  constructor(
    private readonly apiKey: string,
    private readonly model = DEFAULT_MODEL,
  ) {}

  /**
   * Translate an array of English texts to Thai via OpenRouter (Gemini 3.1 Flash Lite).
   * Asks for a JSON array reply so results map back to inputs by index.
   * Returns null when the key is missing, the reply is malformed, or the
   * array length doesn't match the input.
   */
  async translateWithUsage(texts: string[]): Promise<TranslateResult | null> {
    if (texts.length === 0) return null;
    if (!this.apiKey) {
      console.error('[openRouterTranslate] Missing OPENROUTER_API_KEY');
      return null;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const res = await fetch(OPENROUTER_API_URL, {
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
          include_reasoning: false,
          reasoning: { effort: 'minimal' },
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        console.error(`[openRouterTranslate] OpenRouter API error [${res.status}]:`, errorText.slice(0, 500));
        if (res.status === 429) {
          const err = new Error('OpenRouter rate limited') as Error & { status?: number };
          err.status = 429;
          throw err;
        }
        return null;
      }

      const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
        content?: string;
        usage?: { total_tokens?: number };
      };
      const content = data.choices?.[0]?.message?.content ?? data.content;
      if (!content) {
        console.error('[openRouterTranslate] Empty content from OpenRouter API');
        return null;
      }

      // Strip optional ```json ... ``` fence, then take the [...] array.
      const fenced = content.replace(/```(?:json)?/gi, '').trim();
      const start = fenced.indexOf('[');
      const end = fenced.lastIndexOf(']');
      if (start === -1 || end <= start) {
        console.error('[openRouterTranslate] No JSON array found in response:', content.slice(0, 500));
        return null;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(fenced.slice(start, end + 1)) as unknown;
      } catch (e) {
        console.error('[openRouterTranslate] JSON parse failed:', (e as Error).message, 'raw:', fenced.slice(start, end + 1).slice(0, 500));
        return null;
      }
      if (!Array.isArray(parsed)) {
        console.error('[openRouterTranslate] Parsed value is not an array:', typeof parsed);
        return null;
      }

      // Salvage instead of all-or-nothing: normalise to the input length so a
      // slightly-off reply still yields Thai for the items that came back.
      const translations = texts.map((_, i) =>
        typeof parsed[i] === 'string' ? (parsed[i] as string) : ''
      );

      return {
        translations,
        tokens: data.usage?.total_tokens ?? 0,
      };
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        console.error(`[openRouterTranslate] Request timed out after ${TIMEOUT_MS}ms`);
        throw e;
      }
      if (e instanceof Error && (e as Error & { status?: number }).status === 429) throw e;
      console.error('[openRouterTranslate] Network/parse error:', e);
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async translate(texts: string[]): Promise<string[] | null> {
    const result = await this.translateWithUsage(texts);
    return result?.translations ?? null;
  }
}

export async function openRouterTranslateWithUsage(
  texts: string[]
): Promise<TranslateResult | null> {
  return new OpenRouterTranslator(process.env.OPENROUTER_API_KEY ?? '').translateWithUsage(texts);
}

export async function openRouterTranslate(texts: string[]): Promise<string[] | null> {
  return new OpenRouterTranslator(process.env.OPENROUTER_API_KEY ?? '').translate(texts);
}
