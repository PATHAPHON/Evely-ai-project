import { NextResponse, after } from 'next/server';
import {
  getRequestUser,
  unauthorizedResponse,
  checkBudget,
  debitBudget,
  budgetExhaustedResponse,
} from '@/app/api/_lib/utils/requireUser';
import { DAILY_BUDGET_MICROBAHT, STT_COST_MICROBAHT } from '@/app/api/_lib/utils/tokenCost';

// Base64 encodes ~4/3 bytes; this caps raw audio at roughly 8MB.
const MAX_AUDIO_BASE64_LENGTH = 11_000_000;

export async function POST(request: Request) {
  try {
    const user = await getRequestUser();
    if (!user) return unauthorizedResponse();

    const limit = user.isPremium ? DAILY_BUDGET_MICROBAHT.premium : DAILY_BUDGET_MICROBAHT.free;
    const hasBudget = await checkBudget(limit);
    if (!hasBudget) return budgetExhaustedResponse();

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.error('OPENROUTER_API_KEY is not set in environment variables');
      return NextResponse.json({ error: 'OpenRouter API key is not configured' }, { status: 500 });
    }

    const body = await request.json().catch(() => null);
    if (!body || !body.audio) {
      return NextResponse.json({ error: 'Missing audio data' }, { status: 400 });
    }

    const { audio, format = 'webm' } = body;

    if (typeof audio !== 'string' || audio.length > MAX_AUDIO_BASE64_LENGTH) {
      return NextResponse.json({ error: 'Audio data too large' }, { status: 400 });
    }

    // Call OpenRouter Audio Transcription API
    const response = await fetch('https://openrouter.ai/api/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/whisper-large-v3',
        input_audio: {
          data: audio,
          format: format,
        },
        language: 'en',
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`OpenRouter STT error [${response.status}]:`, errorBody);
      // Never forward upstream's status verbatim — a 429 here is OpenRouter
      // rate-limiting us, not our own budget gate, and the client treats any
      // 429 as "budget exhausted for the day". Map all upstream failures to
      // 502 so 429 stays reserved for budgetExhaustedResponse above.
      return NextResponse.json(
        { error: `OpenRouter STT service failed: ${response.statusText}` },
        { status: 502 }
      );
    }

    const result = await response.json();

    after(async () => {
      await debitBudget(STT_COST_MICROBAHT);
    });

    return NextResponse.json({ text: result.text || '' });
  } catch (error) {
    console.error('Unexpected error in STT route handler:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
