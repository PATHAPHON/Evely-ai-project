import { NextRequest, NextResponse } from 'next/server';

const KKU_API_URL = 'https://gen.ai.kku.ac.th/api/v1/chat/completions';
const API_TIMEOUT_MS = 25_000;

interface SavedWordPayload {
  korean: string;
  thai: string;
}

function tryParseJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function parseSuggestTopicResponse(content: string): { topic: string; goal: string } {
  const trimmed = content.trim();

  // Try ```json or ``` blocks first
  const fenceRe = /```(?:json)?\s*([\s\S]*?)\s*```/gi;
  let fenceMatch: RegExpExecArray | null;
  while ((fenceMatch = fenceRe.exec(trimmed)) !== null) {
    const parsed = tryParseJson(fenceMatch[1].trim());
    if (parsed && typeof parsed === 'object') {
      const rec = parsed as Record<string, unknown>;
      const topic = typeof rec.topic === 'string' ? rec.topic.trim() : '';
      const goal = typeof rec.goal === 'string' ? rec.goal.trim() : '';
      if (topic.length > 0) {
        return { topic, goal };
      }
    }
  }

  // Try parsing the whole content
  const parsed = tryParseJson(trimmed);
  if (parsed && typeof parsed === 'object') {
    const rec = parsed as Record<string, unknown>;
    const topic = typeof rec.topic === 'string' ? rec.topic.trim() : '';
    const goal = typeof rec.goal === 'string' ? rec.goal.trim() : '';
    if (topic.length > 0) {
      return { topic, goal };
    }
  }

  // Fallback: extract topic and goal via regex
  const topicMatch = /"topic"\s*:\s*"([^"]+)"/.exec(trimmed);
  const goalMatch = /"goal"\s*:\s*"([^"]+)"/.exec(trimmed);
  const topic = topicMatch ? topicMatch[1].trim() : '';
  const goal = goalMatch ? goalMatch[1].trim() : '';

  if (topic.length > 0) {
    return { topic, goal };
  }

  throw new Error('Could not parse suggest topic response');
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON input.' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Invalid input structure.' }, { status: 400 });
  }

  const record = body as Record<string, unknown>;
  const words = record.words as SavedWordPayload[] | undefined;

  if (!Array.isArray(words) || words.length === 0) {
    return NextResponse.json({ error: 'Please select at least one word.' }, { status: 400 });
  }

  // Read custom API credentials from headers
  const customApiKey = request.headers.get('x-custom-api-key');
  const customModel = request.headers.get('x-custom-model');
  const apiKey = customApiKey;

  if (!apiKey) {
    return NextResponse.json({ error: 'API key is missing. Please add your API key in the app settings.' }, { status: 401 });
  }

  const wordListStr = words
    .map((w) => `${w.korean} (แปลว่า: ${w.thai})`)
    .join(', ');

  const systemPrompt =
    `You are a professional Korean language teacher helping a Thai learner.\n` +
    `The learner has selected the following Korean vocabulary words to practice in an interactive text chat conversation:\n` +
    `[${wordListStr}]\n\n` +
    `Please create a natural, interesting conversation topic and a matching, realistic conversation goal in Thai where the learner would naturally use these words.\n\n` +
    `Your response must be ONLY a valid JSON object. Do not include markdown code fences, prose, explanations, or text before/after the JSON. Exactly this structure:\n` +
    `{\n` +
    `  "topic": "<highly specific, creative, and short conversation topic in Thai, e.g. 'สั่งอาหารที่ร้านกาแฟ' or 'ถามทางไปสถานีรถไฟ' — max 50 chars>",\n` +
    `  "goal": "<a realistic, achievable goal in Thai that wraps up the conversation, e.g. 'สั่งคาปูชิโน่เย็น 1 แก้วได้สำเร็จ' or 'ถามทางไปหาทางออกได้สำเร็จ' — max 80 chars>"\n` +
    `}\n\n` +
    `RULES:\n` +
    `- The suggested topic and goal MUST naturally fit the given vocabulary words.\n` +
    `- Keep them short, concise, and in natural Thai language.\n` +
    `- Return ONLY the JSON starting with { and ending with }`;

  const requestBody = {
    model: customModel || 'gemini-3.1-flash-lite',
    messages: [
      {
        role: 'user' as const,
        content: [{ type: 'text' as const, text: systemPrompt }],
      },
    ],
    max_tokens: 512,
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
      console.error('Suggest Topic API Error Response:', errorText);
      return NextResponse.json({ error: 'Failed to generate topic.' }, { status: 502 });
    }

    const responseText = await response.text();
    let content: string | undefined;

    try {
      const data = JSON.parse(responseText);
      content = data?.choices?.[0]?.message?.content || data?.content;
    } catch {
      content = responseText;
    }

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: 'Empty response received from API.' }, { status: 502 });
    }

    try {
      const parsed = parseSuggestTopicResponse(content);
      return NextResponse.json(parsed, { status: 200 });
    } catch (parseError) {
      console.error('Suggest Topic Parse Error:', parseError, 'Raw Content:', content);
      return NextResponse.json({ error: 'Failed to parse suggested topic.' }, { status: 502 });
    }
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json({ error: 'Request timed out.' }, { status: 504 });
    }
    console.error('Suggest Topic Unexpected Error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
