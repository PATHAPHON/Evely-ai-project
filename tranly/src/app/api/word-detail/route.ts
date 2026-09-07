import { NextRequest, NextResponse, after } from 'next/server';
import type { TargetLanguage } from '@/shared/types/wordTypes';
import { LANG_PROMPT, isValidTargetLanguage } from '@/app/api/_lib/utils/languagePrompt';
import {
  getRequestUser,
  unauthorizedResponse,
  checkBudget,
  debitBudget,
  budgetExhaustedResponse,
} from '@/app/api/_lib/utils/requireUser';
import { TOKEN_COST_MICROBAHT, DAILY_BUDGET_MICROBAHT } from '@/app/api/_lib/utils/tokenCost';
import crypto from 'crypto';
import { supabaseServer } from '@/shared/supabase/supabaseServer';

// ponytail: LLM call can take 30s; without this the serverless gateway 504s
// at its default cap (10s on Vercel hobby) before our own timeout fires.
export const maxDuration = 60;

const KKU_API_URL = 'https://gen.ai.kku.ac.th/api/v1/chat/completions';
const DEFAULT_MODEL = 'deepseek-v4-flash';
const API_TIMEOUT_MS = 30_000;

// DeepSeek replies directly: `definition` is Thai; `usage` is one English example
// sentence using the word; `tense`/`partOfSpeech` are short English labels.
export interface WordDetailResponse {
  thai: string;          // short Thai translation of the word
  definition: string;    // Thai meaning/explanation
  partOfSpeech?: string; // part of speech (English)
  tense?: string;        // grammatical form / tense label, e.g. "present simple"
  usage: string;         // one English example sentence using the word
}

export interface WordDetailErrorResponse {
  error: string | { type: string; message: string };
}

function buildPrompt(
  word: string,
  language: TargetLanguage,
  english?: string,
  partOfSpeech?: string,
): string {
  const lang = LANG_PROMPT[language];

  const meta = [
    `Word: "${word}" (${lang.label})`,
    english ? `English meaning: ${english}` : null,
    partOfSpeech ? `Part of speech: ${partOfSpeech}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  return (
    `You are a language-learning assistant for Thai speakers learning ${lang.label}.\n` +
    `Given the following word information:\n${meta}\n\n` +
    `Reply with ONLY a raw JSON object (no markdown, no code fences, no prose). Schema:\n` +
    `{\n` +
    `  "thai": "<short Thai translation of the word (คำแปลไทยสั้นๆ)>",\n` +
    `  "definition": "<explain the meaning and key nuance of the word in 1-2 Thai sentences (ภาษาไทย)>",\n` +
    `  "partOfSpeech": "<part of speech in English, lowercase, e.g. verb, noun>",\n` +
    `  "tense": "<short grammatical form or tense label in English, e.g. present simple, past tense, base form; empty string if not applicable>",\n` +
    `  "usage": "<one natural ${lang.label} example sentence using the word "${word}">"\n` +
    `}\n` +
    `"definition" MUST be in Thai. "usage" MUST be in ${lang.label}. Return ONLY the JSON object and nothing else.`
  );
}

function tryParseJson(s: string): Record<string, unknown> | null {
  try {
    const v = JSON.parse(s);
    return typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Extract a string value by key using regex — fallback when JSON parse fails. */
function extractStringField(src: string, key: string): string {
  // Match "key": "value" with escaped chars inside
  const re = new RegExp(`"${key}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`, 'i');
  const m = src.match(re);
  if (!m) return '';
  try {
    return JSON.parse(`"${m[1]}"`).trim();
  } catch {
    return m[1].trim();
  }
}

function parseWordDetailContent(content: string): WordDetailResponse | null {
  let trimmed = content.trim();

  // Strip ```json ... ``` or ``` ... ``` fences
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenceMatch) trimmed = fenceMatch[1].trim();

  // Strategy 1: parse the whole string
  let obj = tryParseJson(trimmed);

  // Strategy 2: find and parse the first {...} block
  if (!obj) {
    const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
    if (jsonMatch) obj = tryParseJson(jsonMatch[0]);
  }

  // Strategy 3: read fields off the parsed object
  if (obj) {
    const definition = typeof obj.definition === 'string' ? obj.definition.trim() : '';
    const usage = typeof obj.usage === 'string' ? obj.usage.trim() : '';

    if (definition || usage) {
      return {
        thai: typeof obj.thai === 'string' ? obj.thai.trim() : '',
        definition,
        usage,
        partOfSpeech:
          typeof obj.partOfSpeech === 'string' ? obj.partOfSpeech.trim() : undefined,
        tense: typeof obj.tense === 'string' ? obj.tense.trim() : undefined,
      };
    }
  }

  // Strategy 3 fallback: regex extraction when JSON parse fully fails
  const definition = extractStringField(trimmed, 'definition');
  const usage = extractStringField(trimmed, 'usage');

  if (definition || usage) {
    return {
      thai: extractStringField(trimmed, 'thai'),
      definition,
      usage,
      partOfSpeech: extractStringField(trimmed, 'partOfSpeech') || undefined,
      tense: extractStringField(trimmed, 'tense') || undefined,
    };
  }

  return null;
}


export async function POST(
  request: NextRequest,
): Promise<NextResponse<WordDetailResponse | WordDetailErrorResponse>> {
  const user = await getRequestUser();
  if (!user) return unauthorizedResponse();

  // Parse request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const word = typeof b.word === 'string' ? b.word.trim() : '';
  const languageParam = b.language;

  if (!word) {
    return NextResponse.json({ error: 'Missing word' }, { status: 400 });
  }

  const language: TargetLanguage = isValidTargetLanguage(languageParam)
    ? languageParam
    : 'english';

  const english = typeof b.english === 'string' ? b.english : undefined;
  const partOfSpeech = typeof b.partOfSpeech === 'string' ? b.partOfSpeech : undefined;

  // Generate unique cache key
  const modelName = DEFAULT_MODEL;
  const cacheRawString = [
    word.toLowerCase(),
    language,
    english || '',
    partOfSpeech || '',
    modelName,
    'v9' // prompt version — bump to invalidate cached responses
  ].join(':');

  const cacheKey = crypto.createHash('sha256').update(cacheRawString).digest('hex');

  // Check database cache first
  try {
    const { data: cachedData, error: cacheErr } = await supabaseServer
      .from('ai_word_detail_cache')
      .select('response_json')
      .eq('cache_key', cacheKey)
      .single();

    if (cachedData && !cacheErr) {
      console.log(`[word-detail] Cache HIT for key: ${cacheKey} (${word})`);
      return NextResponse.json(cachedData.response_json, { status: 200 });
    }
    if (cacheErr && cacheErr.code !== 'PGRST116') {
      console.error('[word-detail] Cache lookup error:', cacheErr);
    }

    // Fallback: reuse any cached response for this word+language (ignores meta/partOfSpeech).
    // Filter by 'definition' key so old schema rows ({context,examples}) never sneak through.
    const { data: fallbackData, error: fallbackErr } = await supabaseServer
      .from('ai_word_detail_cache')
      .select('response_json')
      .eq('word', word.toLowerCase())
      .eq('language', language)
      .not('response_json->definition', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1);

    if (fallbackData && fallbackData.length > 0 && !fallbackErr) {
      console.log(`[word-detail] Cache HIT (fallback) for word: ${word} (${language})`);
      return NextResponse.json(fallbackData[0].response_json, { status: 200 });
    }
  } catch (err) {
    console.error('[word-detail] Cache lookup failed:', err);
  }

  // Gate only the cache-miss path — cached lookups above stay free even when
  // the daily budget is exhausted.
  const limit = user.isPremium ? DAILY_BUDGET_MICROBAHT.premium : DAILY_BUDGET_MICROBAHT.free;
  if (!(await checkBudget(limit))) return budgetExhaustedResponse();

  const apiKey = process.env.KKU_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Missing API key' }, { status: 401 });
  }

  const prompt = buildPrompt(word, language, english, partOfSpeech);

  const requestBody = {
    model: modelName,
    messages: [{ role: 'user' as const, content: prompt }],
    max_tokens: 2048,
  };

  // ponytail: 2 attempts, no backoff — upstream is occasionally flaky, not
  // worth a real retry/backoff library. Timeouts (AbortError) never retry,
  // they'd already burn the API_TIMEOUT_MS budget against maxDuration=60.
  const MAX_ATTEMPTS = 2;
  let parsed: WordDetailResponse | null = null;
  let totalTokens = 0;

  try {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

      try {
        const response = await fetch(KKU_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[word-detail] Attempt ${attempt} failed: KKU API error [${response.status}]:`, errorText);
          if (attempt < MAX_ATTEMPTS) continue;
          return NextResponse.json({ error: 'AI API error' }, { status: 502 });
        }

        const responseText = await response.text();
        let content: string | undefined;
        let attemptTokens = 0;

        try {
          const data = JSON.parse(responseText);
          content = data?.choices?.[0]?.message?.content ?? data?.content;
          attemptTokens = data?.usage?.total_tokens ?? 0;
        } catch {
          // fall through
        }

        if (!content || content.trim().length === 0) {
          console.error(`[word-detail] Attempt ${attempt} failed: empty content from KKU API`);
          if (attempt < MAX_ATTEMPTS) continue;
          return NextResponse.json({ error: 'Empty response from AI' }, { status: 502 });
        }

        parsed = parseWordDetailContent(content);
        if (!parsed) {
          console.error(`[word-detail] Attempt ${attempt} failed: could not parse AI response:`, content);
          if (attempt < MAX_ATTEMPTS) continue;
          return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 502 });
        }

        totalTokens = attemptTokens;
        break;
      } catch (fetchErr: unknown) {
        if (fetchErr instanceof Error && fetchErr.name === 'AbortError') {
          console.error(`[word-detail] Attempt ${attempt} timed out`);
          return NextResponse.json({ error: 'Request timed out' }, { status: 504 });
        }
        console.error(`[word-detail] Attempt ${attempt} fetch error:`, fetchErr);
        if (attempt < MAX_ATTEMPTS) continue;
        return NextResponse.json({ error: 'Network error' }, { status: 502 });
      } finally {
        clearTimeout(timeoutId);
      }
    }

    if (!parsed) {
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 502 });
    }

    after(async () => {
      // Debit budget for cache-miss AI call
      const tokens = totalTokens > 0 ? totalTokens : 300;
      await debitBudget(tokens * TOKEN_COST_MICROBAHT.kku);
      try {
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        const { error: saveErr } = await supabaseServer
          .from('ai_word_detail_cache')
          .upsert({
            cache_key: cacheKey,
            word,
            language,
            english: english || null,
            part_of_speech: partOfSpeech || null,
            model: modelName,
            response_json: parsed,
            expires_at: expiresAt,
          }, { onConflict: 'cache_key' });

        if (saveErr) {
          console.error('[word-detail] Cache write error:', saveErr);
        } else {
          console.log(`[word-detail] Cache stored for key: ${cacheKey} (${word})`);
        }
      } catch (err) {
        console.error('[word-detail] Cache write failed:', err);
      }
    });

    return NextResponse.json(parsed, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json({ error: 'Request timed out' }, { status: 504 });
    }
    return NextResponse.json({ error: 'Network error' }, { status: 502 });
  }
}
