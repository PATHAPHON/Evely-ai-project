import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { getRequestUser, unauthorizedResponse } from '@/app/api/_lib/utils/requireUser';

const OPENROUTER_TTS_URL = 'https://openrouter.ai/api/v1/audio/speech';
const API_TIMEOUT_MS = 15_000;
const MAX_TEXT_LENGTH = 500;
const CACHE_MAX_ENTRIES = 500;
const DEFAULT_VOICE = 'Aoede';

const VOICE_WHITELIST: ReadonlySet<string> = new Set([
  // Google Gemini 3.1 Flash TTS Voices
  'Aoede',
  'Puck',
  'Charon',
  'Kore',
  'Fenrir',
  'Leda',
  'Orus',
  'Zephyr',
  'Callirrhoe',
  'Autonoe',
  'Enceladus',
  'Iapetus',
  'Umbriel',
  'Algieba',
  'Despina',
  'Erinome',
  'Algenib',
  'Rasalgethi',
  'Laomedeia',
  'Achernar',
  'Alnilam',
  'Schedar',
  'Gacrux',
  'Pulcherrima',
  'Achird',
  'Zubenelgenubi',
  'Vindemiatrix',
  'Sadachbia',
  'Sadaltager',
  'Sulafat',
  // Backward-compatibility aliases if previously requested
  'af_heart',
  'bf_emma',
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

/**
 * Prepend a standard 44-byte RIFF/WAVE header to raw 16-bit mono PCM samples
 * so that standard HTML5 Audio / browser decoders can play it seamlessly.
 */
function pcmToWav(pcmBuffer: Buffer, sampleRate = 24000, numChannels = 1, bitDepth = 16): Buffer {
  const byteRate = (sampleRate * numChannels * bitDepth) / 8;
  const blockAlign = (numChannels * bitDepth) / 8;
  const dataSize = pcmBuffer.length;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF chunk descriptor
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // "fmt " sub-chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // subchunk1 size for PCM
  buffer.writeUInt16LE(1, 20);  // audio format 1 = PCM
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitDepth, 34);

  // "data" sub-chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  pcmBuffer.copy(buffer, 44);
  return buffer;
}

function audioResponse(buffer: Buffer, cacheStatus: 'HIT' | 'MISS'): Response {
  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'audio/wav',
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
    // Map any legacy Kokoro voice aliases to default Gemini voice
    const effectiveVoice = (voice === 'af_heart' || voice === 'bf_emma') ? DEFAULT_VOICE : voice;

    const openRouterResponse = await fetch(
      OPENROUTER_TTS_URL,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-3.1-flash-tts-preview',
          input: text,
          voice: effectiveVoice,
          response_format: 'pcm',
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
    const rawBuffer = Buffer.from(audioArrayBuffer);
    // Wrap raw PCM (24kHz 16-bit mono) in a standard 44-byte RIFF/WAVE header
    // so HTML5 Audio (<audio> / new Audio) can decode and play it seamlessly.
    const isWav = rawBuffer.subarray(0, 4).toString() === 'RIFF';
    const buffer = isWav ? rawBuffer : pcmToWav(rawBuffer, 24000);
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
