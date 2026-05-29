import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';

const GOOGLE_TTS_URL = 'https://texttospeech.googleapis.com/v1/text:synthesize';
const API_TIMEOUT_MS = 15_000;
const MAX_TEXT_LENGTH = 500;
const CACHE_MAX_ENTRIES = 500;
const DEFAULT_VOICE = 'ko-KR-Chirp3-HD-Achernar';

const VOICE_WHITELIST: ReadonlySet<string> = new Set([
  'ko-KR-Chirp3-HD-Achernar',
  'ko-KR-Chirp3-HD-Charon',
  'ko-KR-Chirp3-HD-Aoede',
  'ko-KR-Chirp3-HD-Kore',
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
  const fromEnv = process.env.GOOGLE_TTS_VOICE;
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

  const apiKey = process.env.GOOGLE_TTS_API_KEY;
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
    const googleResponse = await fetch(
      `${GOOGLE_TTS_URL}?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { text },
          voice: { languageCode: 'ko-KR', name: voice },
          audioConfig: { audioEncoding: 'MP3', speakingRate: 0.95 },
        }),
        signal: controller.signal,
      },
    );

    clearTimeout(timeoutId);

    if (!googleResponse.ok) {
      const errorBody = await googleResponse.text();
      console.error(`Google TTS error [${googleResponse.status}]:`, errorBody);
      return NextResponse.json(
        { error: 'tts_failed', message: 'Upstream TTS request failed.' },
        { status: 502 },
      );
    }

    const data = (await googleResponse.json()) as { audioContent?: string };
    if (!data.audioContent) {
      console.error('Google TTS missing audioContent in response');
      return NextResponse.json(
        { error: 'tts_failed', message: 'Upstream TTS returned no audio.' },
        { status: 502 },
      );
    }

    const buffer = Buffer.from(data.audioContent, 'base64');
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
