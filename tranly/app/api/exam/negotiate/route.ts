import { NextRequest, NextResponse } from 'next/server';

const KKU_API_URL = 'https://gen.ai.kku.ac.th/api/v1/chat/completions';
const API_TIMEOUT_MS = 30_000;

interface ChatHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface NegotiateResponse {
  reply: string;
  topic: string | null;
  category: 'cefr' | 'toeic' | null;
  /** Short Thai quick-reply chips the user can tap to answer. */
  suggestions: string[];
  readyToStart: boolean;
}

const SYSTEM_PROMPT = `You are Evely (กิฟท์), a friendly, helpful AI Mascot (a blue elephant 🐘) that assists users in creating a custom English exam.
Chat with the user in Thai to figure out what kind of exam they want, then hand off to start it. You decide two things:
1. topic: The main topic or context of the exam (e.g. Travel, Business meetings, Daily routines, Food & Drinks, Job interview). Max 60 characters.
2. category: "cefr" or "toeic".
   - General everyday English, grammar, vocabulary, or casual situations → "cefr".
   - Business, office, work, emails, correspondence, or TOEIC-style content → "toeic".
Do NOT ask the user for a difficulty level — the exam writer will judge the right level itself afterwards.

Rules for the conversation:
- Keep replies extremely short, welcoming and warm (1-2 sentences in Thai).
- Ask about the topic/kind of exam they want. Keep it to roughly 1-2 short questions, then move on.
- "suggestions": 2-4 very short Thai quick-reply options for the user to tap (e.g. "การเดินทาง", "ธุรกิจ", "ชีวิตประจำวัน", "เริ่มเลย"). Always include a "เริ่มเลย"-style option once a topic is known. Use [] only if no helpful options apply.
- Set "readyToStart" to true ONLY when a topic is known AND the user signals go (taps a "เริ่ม"-style chip, says "เริ่ม"/"ลุยเลย"/"พร้อมแล้ว"/"start"/"ok", or gives a clear topic that implies they want to start now). Otherwise false.

You must respond ONLY with a JSON object in this format. Do NOT add markdown code fences, do NOT add prose.
JSON Schema:
{
  "reply": "friendly Thai reply text",
  "topic": "extracted topic (string or null)",
  "category": "extracted category (cefr|toeic or null)",
  "suggestions": ["short Thai option", "..."],
  "readyToStart": boolean
}`;

function parseNegotiateResponse(content: string): NegotiateResponse {
  const trimmed = content.trim();
  
  // Try to find markdown JSON code block
  const fenceMatch = /```(?:json)?\s*([\s\S]*?)\s*```/i.exec(trimmed);
  const jsonText = fenceMatch ? fenceMatch[1].trim() : trimmed;
  
  try {
    const data = JSON.parse(jsonText);
    return {
      reply: typeof data.reply === 'string' ? data.reply : 'ขออภัยด้วยค่ะ ฉันเกิดข้อผิดพลาดในการประมวลผลคำตอบ',
      topic: typeof data.topic === 'string' ? data.topic : null,
      category: data.category === 'cefr' || data.category === 'toeic' ? data.category : null,
      suggestions: normalizeSuggestions(data.suggestions),
      readyToStart: typeof data.readyToStart === 'boolean' ? data.readyToStart : false
    };
  } catch (err) {
    console.error('Failed to parse negotiator response:', content, err);
    // Fallback: try manual regex matching if JSON parse fails
    const replyMatch = /"reply"\s*:\s*"([^"]+)"/i.exec(jsonText);
    const topicMatch = /"topic"\s*:\s*"([^"]+)"/i.exec(jsonText);
    const categoryMatch = /"category"\s*:\s*"([^"]+)"/i.exec(jsonText);
    const readyMatch = /"readyToStart"\s*:\s*(true|false)/i.exec(jsonText);

    return {
      reply: replyMatch ? replyMatch[1] : 'ฉันได้รับข้อมูลแล้วค่ะ พร้อมเริ่มทำข้อสอบเลยไหมคะ?',
      topic: topicMatch ? topicMatch[1] : null,
      category: categoryMatch && (categoryMatch[1] === 'cefr' || categoryMatch[1] === 'toeic') ? (categoryMatch[1] as 'cefr' | 'toeic') : null,
      suggestions: [],
      readyToStart: readyMatch ? readyMatch[1] === 'true' : false
    };
  }
}

function normalizeSuggestions(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((s): s is string => typeof s === 'string' && s.trim() !== '')
    .map((s) => s.trim())
    .slice(0, 4);
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const { messages } = body as { messages?: ChatHistoryMessage[] };
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: 'Messages are required' }, { status: 400 });
  }

  const apiKey = request.headers.get('x-custom-api-key') || process.env.KKU_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'API key is required' }, { status: 401 });
  }

  const model = request.headers.get('x-custom-model') || 'deepseek-v4-flash';

  // Build KKU API request
  // Convert our simple messages to KKU content block format
  const contextPayload = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  // KKU has no system role, so attach instructions to the latest user message
  let lastUserIndex = -1;
  for (let i = contextPayload.length - 1; i >= 0; i--) {
    if (contextPayload[i].role === 'user') {
      lastUserIndex = i;
      break;
    }
  }

  const apiMessages = contextPayload.map((msg, i) => ({
    role: msg.role,
    content: [
      {
        type: 'text' as const,
        text:
          i === lastUserIndex
            ? `${SYSTEM_PROMPT}\n\n--- The user's latest message (reply to this) ---\n${msg.content}`
            : msg.content,
      },
    ],
  }));

  const requestBody = {
    model,
    messages: apiMessages,
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
      const errorBody = await response.text();
      console.error(`KKU API error [${response.status}]:`, errorBody);
      return NextResponse.json({ error: 'API Error' }, { status: response.status });
    }

    const responseText = await response.text();
    let content: string | undefined;
    try {
      const data = JSON.parse(responseText);
      content = data?.choices?.[0]?.message?.content ?? data?.content;
    } catch {
      content = responseText;
    }

    if (!content) {
      return NextResponse.json({ error: 'Empty API response' }, { status: 502 });
    }

    const parsedResponse = parseNegotiateResponse(content);
    return NextResponse.json(parsedResponse);
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('Negotiator API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
