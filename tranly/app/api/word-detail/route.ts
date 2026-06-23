import { NextRequest, NextResponse, after } from 'next/server';
import type { TargetLanguage } from '@/app/_lib/types/wordTypes';
import { LANG_PROMPT, isValidTargetLanguage } from '@/app/api/_lib/utils/languagePrompt';
import { getRequestUser, unauthorizedResponse } from '@/app/api/_lib/utils/requireUser';
import crypto from 'crypto';
import { supabaseServer } from '@/app/_lib/supabase/supabaseServer';

const KKU_API_URL = 'https://gen.ai.kku.ac.th/api/v1/chat/completions';
const API_TIMEOUT_MS = 30_000;

export interface WordDetailExample {
  sentence: string;
  translation: string;
  highlight?: string; // the target word as it appears in the sentence
  tense?: string; // English only — tense of the example sentence
}

export interface WordDetailResponse {
  context: string;      // อธิบาย context ภาษาไทย
  examples: WordDetailExample[];
  grammar: string;      // grammar notes ภาษาไทย
  thai?: string;        // คำแปลไทยสั้น ๆ (English only)
  ipa?: string;         // IPA pronunciation (English only)
  partOfSpeech?: string; // part of speech (English only)
}

export interface WordDetailErrorResponse {
  error: string;
}

function buildPrompt(
  word: string,
  language: TargetLanguage,
  reading?: string,
  romanization?: string,
  english?: string,
  partOfSpeech?: string,
): string {
  const lang = LANG_PROMPT[language];

  const meta = [
    `คำ: "${word}" (${lang.label})`,
    reading ? `การออกเสียง: ${reading}` : null,
    romanization ? `Romanization: ${romanization}` : null,
    english ? `ความหมายภาษาอังกฤษ: ${english}` : null,
    partOfSpeech ? `Part of speech: ${partOfSpeech}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  const examplesSpec =
    language === 'english'
      ? `  "examples": [\n` +
        `    { "sentence": "<ประโยคตัวอย่างใน English>", "translation": "<คำแปลไทย>", "highlight": "<ส่วนของคำในประโยค>", "tense": "<ชื่อ tense>" }\n` +
        `    // exactly 12 items, one for each of the 12 English tenses in this order:\n` +
        `    // Present Simple, Present Continuous, Present Perfect, Present Perfect Continuous,\n` +
        `    // Past Simple, Past Continuous, Past Perfect, Past Perfect Continuous,\n` +
        `    // Future Simple, Future Continuous, Future Perfect, Future Perfect Continuous\n` +
        `  ],\n`
      : `  "examples": [\n` +
        `    { "sentence": "<ประโยคตัวอย่างที่ 1 ใน${lang.label}>", "translation": "<คำแปลไทย>", "highlight": "<ส่วนของคำในประโยค>" },\n` +
        `    { "sentence": "<ประโยคตัวอย่างที่ 2 ใน${lang.label}>", "translation": "<คำแปลไทย>", "highlight": "<ส่วนของคำในประโยค>" },\n` +
        `    { "sentence": "<ประโยคตัวอย่างที่ 3 ใน${lang.label}>", "translation": "<คำแปลไทย>", "highlight": "<ส่วนของคำในประโยค>" }\n` +
        `  ],\n`;

  return (
    `You are a language-learning assistant for Thai speakers learning ${lang.label}.\n` +
    `Given the following word information:\n${meta}\n\n` +
    `Reply with ONLY a raw JSON object (no markdown, no code fences, no prose). Schema:\n` +
    `{\n` +
    `  "context": "<อธิบายความหมาย บริบทการใช้คำ และ nuance สำคัญ เป็นภาษาไทย 2-4 ประโยค>",\n` +
    (language === 'english'
      ? `  "thai": "<คำแปลไทยสั้น ๆ ของคำนี้ เช่น ถาม>",\n` +
        `  "ipa": "<IPA pronunciation เช่น /ɑːsk/>",\n` +
        `  "partOfSpeech": "<part of speech ภาษาอังกฤษตัวพิมพ์เล็ก เช่น verb, noun>",\n`
      : '') +
    examplesSpec +
    `  "grammar": "<อธิบาย part of speech, รูปแบบไวยากรณ์, conjugation หรือ usage pattern สำคัญ เป็นภาษาไทย 2-3 ประโยค>"\n` +
    `}\n` +
    (language === 'english'
      ? `The "examples" array MUST contain exactly 12 sentences using the word "${word}", one per English tense, in the order listed. Each "tense" value is the English tense name.\n`
      : '') +
    `Return ONLY the JSON object and nothing else.`
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

/** Extract examples array via regex when JSON parse fails. */
function extractExamplesField(src: string): WordDetailExample[] {
  // Try to grab the content inside "examples": [ ... ]
  const arrMatch = src.match(/"examples"\s*:\s*(\[[\s\S]*?\])/i);
  if (!arrMatch) return [];
  const arr = tryParseJson(arrMatch[1]);
  if (!Array.isArray(arr)) return [];
  return (arr as unknown[])
    .filter((e): e is Record<string, unknown> => typeof e === 'object' && e !== null)
    .map((e) => ({
      sentence: typeof e.sentence === 'string' ? e.sentence.trim() : '',
      translation: typeof e.translation === 'string' ? e.translation.trim() : '',
      highlight: typeof e.highlight === 'string' ? e.highlight.trim() : undefined,
      tense: typeof e.tense === 'string' ? e.tense.trim() : undefined,
    }))
    .filter((e) => e.sentence.length > 0);
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

  // Strategy 3: field-by-field regex extraction (handles truncated / extra prose)
  if (obj) {
    const context = typeof obj.context === 'string' ? obj.context.trim() : '';
    const grammar = typeof obj.grammar === 'string' ? obj.grammar.trim() : '';
    const rawExamples = Array.isArray(obj.examples) ? obj.examples : [];
    const examples: WordDetailExample[] = rawExamples
      .filter((e): e is Record<string, unknown> => typeof e === 'object' && e !== null)
      .map((e) => ({
        sentence: typeof e.sentence === 'string' ? e.sentence.trim() : '',
        translation: typeof e.translation === 'string' ? e.translation.trim() : '',
        highlight: typeof e.highlight === 'string' ? e.highlight.trim() : undefined,
        tense: typeof e.tense === 'string' ? e.tense.trim() : undefined,
      }))
      .filter((e) => e.sentence.length > 0);

    if (context || examples.length > 0 || grammar) {
      return {
        context,
        examples,
        grammar,
        thai: typeof obj.thai === 'string' ? obj.thai.trim() : undefined,
        ipa: typeof obj.ipa === 'string' ? obj.ipa.trim() : undefined,
        partOfSpeech:
          typeof obj.partOfSpeech === 'string' ? obj.partOfSpeech.trim() : undefined,
      };
    }
  }

  // Strategy 3 fallback: regex extraction when JSON parse fully fails
  const context = extractStringField(trimmed, 'context');
  const grammar = extractStringField(trimmed, 'grammar');
  const examples = extractExamplesField(trimmed);

  if (context || examples.length > 0 || grammar) {
    return {
      context: context || '',
      examples,
      grammar: grammar || '',
      thai: extractStringField(trimmed, 'thai') || undefined,
      ipa: extractStringField(trimmed, 'ipa') || undefined,
      partOfSpeech: extractStringField(trimmed, 'partOfSpeech') || undefined,
    };
  }

  return null;
}


export async function POST(
  request: NextRequest,
): Promise<NextResponse<WordDetailResponse | WordDetailErrorResponse>> {
  if (!await getRequestUser()) return unauthorizedResponse();

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

  const reading = typeof b.reading === 'string' ? b.reading : undefined;
  const romanization = typeof b.romanization === 'string' ? b.romanization : undefined;
  const english = typeof b.english === 'string' ? b.english : undefined;
  const partOfSpeech = typeof b.partOfSpeech === 'string' ? b.partOfSpeech : undefined;

  // Read custom API credentials from headers
  const customApiKey = request.headers.get('x-custom-api-key');
  const customModel = request.headers.get('x-custom-model');

  // Generate unique cache key
  const modelName = customModel || 'deepseek-v4-flash';
  const cacheRawString = [
    word.toLowerCase(),
    language,
    reading || '',
    romanization || '',
    english || '',
    partOfSpeech || '',
    modelName,
    'v3' // prompt version — bump to invalidate cached responses
  ].join(':');

  const cacheKey = crypto.createHash('sha256').update(cacheRawString).digest('hex');

  // Check database cache first
  try {
    const { data: cachedData, error: cacheErr } = await supabaseServer
      .from('ai_word_detail_cache')
      .select('response_json')
      .eq('cache_key', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (cachedData && !cacheErr) {
      console.log(`[word-detail] Cache HIT for key: ${cacheKey} (${word})`);
      return NextResponse.json(cachedData.response_json, { status: 200 });
    }
    if (cacheErr && cacheErr.code !== 'PGRST116') {
      console.error('[word-detail] Cache lookup error:', cacheErr);
    }
  } catch (err) {
    console.error('[word-detail] Cache lookup failed:', err);
  }

  const apiKey = customApiKey || process.env.KKU_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Missing API key' }, { status: 401 });
  }

  const prompt = buildPrompt(word, language, reading, romanization, english, partOfSpeech);

  const requestBody = {
    model: modelName,
    messages: [{ role: 'user' as const, content: prompt }],
    max_tokens: 2048,
  };

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

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[word-detail] KKU API error [${response.status}]:`, errorText);
      return NextResponse.json({ error: 'AI API error' }, { status: 502 });
    }

    const responseText = await response.text();
    let content: string | undefined;

    try {
      const data = JSON.parse(responseText);
      content = data?.choices?.[0]?.message?.content ?? data?.content;
    } catch {
      // fall through
    }

    if (!content || content.trim().length === 0) {
      console.error('[word-detail] Empty content from KKU API');
      return NextResponse.json({ error: 'Empty response from AI' }, { status: 502 });
    }

    const parsed = parseWordDetailContent(content);
    if (!parsed) {
      console.error('[word-detail] Failed to parse AI response:', content);
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 502 });
    }

    // Write to cache in database (asynchronously, so we don't block the client response)
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    after(async () => {
      try {
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
            expires_at: expiresAt.toISOString(),
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
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json({ error: 'Request timed out' }, { status: 504 });
    }
    return NextResponse.json({ error: 'Network error' }, { status: 502 });
  }
}
