import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { getRequestUser, unauthorizedResponse } from '@/app/api/_lib/utils/requireUser';

const OPENROUTER_TTS_URL = 'https://openrouter.ai/api/v1/audio/speech';
const API_TIMEOUT_MS = 15_000;
const MAX_TEXT_LENGTH = 500;
const CACHE_MAX_ENTRIES = 500;
const DEFAULT_VOICE = 'af_heart';

const VOICE_WHITELIST: ReadonlySet<string> = new Set([
  // Kokoro-82M English Voices
  // American English
  'af_heart',
  'af_alloy',
  'af_aoede',
  'af_bella',
  'af_jessica',
  'af_kore',
  'af_nicole',
  'af_nova',
  'af_river',
  'af_sarah',
  'af_sky',
  'am_adam',
  'am_echo',
  'am_eric',
  'am_fenrir',
  'am_liam',
  'am_michael',
  'am_onyx',
  'am_puck',
  'am_santa',
  // British English
  'bf_alice',
  'bf_emma',
  'bf_isabella',
  'bf_lily',
  'bm_daniel',
  'bm_fable',
  'bm_george',
  'bm_lewis',
]);

// Module-scope FIFO cache shared across requests in the same Node instance.
// Map preserves insertion order so we evict the oldest entry on overflow.
const audioCache = new Map<string, Buffer>();

function cacheKey(voice: string, text: string): string {
  return createHash('sha256').update(`${voice}:${text}`).digest('hex');
}

function evictIfNeeded() {
  while (audioCache.size > CACHE_MAX_ENTRIES) {
    const oldest = audioCache.keys().next().value;
    if (oldest === undefined) return;
    audioCache.delete(oldest);
  }
}

function resolveVoice(requested: unknown): string {
  if (typeof requested === 'string' && VOICE_WHITELIST.has(requested)) {
    return requested;
  }
  const fromEnv = process.env.OPENROUTER_TTS_VOICE;
  if (fromEnv && VOICE_WHITELIST.has(fromEnv)) {
    return fromEnv;
  }
  return DEFAULT_VOICE;
}

function audioResponse(buffer: Buffer, cacheStatus: 'HIT' | 'MISS'): Response {
  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'audio/mpeg',
      'Content-Length': String(buffer.byteLength),
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Cache': cacheStatus,
    },
  });
}

export async function POST(request: NextRequest) {
  if (!await getRequestUser()) return unauthorizedResponse();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'invalid_input', message: 'Invalid request body.' },
      { status: 400 },
    );
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json(
      { error: 'invalid_input', message: 'Body must be an object.' },
      { status: 400 },
    );
  }

  const rawText = (body as Record<string, unknown>).text;
  if (typeof rawText !== 'string') {
    return NextResponse.json(
      { error: 'invalid_input', message: 'Missing or invalid text field.' },
      { status: 400 },
    );
  }

  const text = rawText.trim();
  if (text.length === 0 || text.length > MAX_TEXT_LENGTH) {
    return NextResponse.json(
      { error: 'invalid_input', message: `Text must be 1–${MAX_TEXT_LENGTH} characters.` },
      { status: 400 },
    );
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'tts_unavailable', message: 'TTS not configured.' },
      { status: 503 },
    );
  }

  const voice = resolveVoice((body as Record<string, unknown>).voice);
  const key = cacheKey(voice, text);

  const cached = audioCache.get(key);
  if (cached) {
    return audioResponse(cached, 'HIT');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const openRouterResponse = await fetch(
      OPENROUTER_TTS_URL,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'hexgrad/kokoro-82m',
          input: text,
          voice: voice,
          response_format: 'mp3',
        }),
        signal: controller.signal,
      },
    );

    clearTimeout(timeoutId);

    if (!openRouterResponse.ok) {
      const errorBody = await openRouterResponse.text();
      console.error(`OpenRouter TTS error [${openRouterResponse.status}]:`, errorBody);
      return NextResponse.json(
        { error: 'tts_failed', message: 'Upstream TTS request failed.' },
        { status: 502 },
      );
    }

    const audioArrayBuffer = await openRouterResponse.arrayBuffer();
    const buffer = Buffer.from(audioArrayBuffer);
    audioCache.set(key, buffer);
    evictIfNeeded();

    return audioResponse(buffer, 'MISS');
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'timeout', message: 'TTS request timed out.' },
        { status: 504 },
      );
    }
    console.error('TTS unexpected error:', error);
    return NextResponse.json(
      { error: 'tts_failed', message: 'TTS request failed.' },
      { status: 502 },
    );
  }
}
