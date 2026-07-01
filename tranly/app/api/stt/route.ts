import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.error('OPENROUTER_API_KEY is not set in environment variables');
      return NextResponse.json({ error: 'OpenRouter API key is not configured' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body || !body.audio) {
      return NextResponse.json({ error: 'Missing audio data' }, { status: 400 });
    }

    const { audio, format = 'webm' } = body;

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
      return NextResponse.json(
        { error: `OpenRouter STT service failed: ${response.statusText}` },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json({ text: result.text || '' });
  } catch (error) {
    console.error('Unexpected error in STT route handler:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
