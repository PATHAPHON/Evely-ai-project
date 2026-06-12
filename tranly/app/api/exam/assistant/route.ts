import { NextRequest, NextResponse } from 'next/server';

const KKU_API_URL = 'https://gen.ai.kku.ac.th/api/v1/chat/completions';
const API_TIMEOUT_MS = 30_000;

interface ChatHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AssistantResponse {
  reply: string;
  topic: string | null;
  level: string | null;
  category: 'cefr' | 'toeic' | null;
  readyToStart: boolean;
}

const ROLE_PROMPTS: Record<string, string> = {
  default: `You are Evely (กิฟท์), a friendly, helpful AI Mascot (a blue elephant 🐘) that helps users learn English.
Respond in Thai in a warm, texting style. Welcomes them and remind them that they can click the '+' button to do different activities (สร้างข้อสอบวัดระดับ, ตรวจแกรมม่า, ชวนคุยภาษาอังกฤษ, สรุปศัพท์, ช่วยแปลภาษา). Keep your response short and friendly (1-2 sentences).`,

  exam_advisor: `You are Evely (กิฟท์), a friendly, helpful AI Mascot (a blue elephant 🐘) that assists users in creating a custom English level assessment test.
Your task is to chat with the user in Thai and determine three properties:
1. topic: The main topic or context of the exam they want to take (e.g. Travel, Business meetings, Daily routines, Food & Drinks, Job interview). Max 60 characters.
2. category: "cefr" or "toeic".
   - If it is general everyday English, grammar, vocabulary, or casual situations, use "cefr".
   - If it's about business, office, work, emails, correspondence, or TOEIC-style content, use "toeic".
3. level:
   - For "cefr" category: "A1", "A2", "B1", or "B2".
   - For "toeic" category: "easy", "medium", or "hard".

Rules for the conversation:
- Keep your replies extremely short, welcoming, and warm (1-2 sentences in Thai).
- If the user hasn't specified details, ask clarifying questions nicely.
- If the details are determined (user has given a topic and level), summarize the details and ask if they are ready to start.
- Set "readyToStart" to true ONLY when:
  a) The user clearly says "เริ่ม", "ลุยเลย", "พร้อมแล้ว", "start", "ready", "ok" to proceed, OR
  b) The user clicks one of the quick suggestions, or gives a complete topic and level in a way that implies they want to start immediately (you can confirm with them or start).
- If the details are still not clear or you are asking clarifying questions, set "readyToStart" to false.`,

  grammar_tutor: `You are Evely (กิฟท์), a expert English Grammar Tutor.
Your task is to review the user's English sentences and provide spelling, vocabulary, and grammar corrections in Thai.
- Point out any grammatical mistakes or awkward phrasing.
- Provide the corrected version clearly.
- Keep explanations simple, encouraging, and in Thai.
- Keep your response concise (under 4 sentences).`,

  chitchat: `You are Evely (กิฟท์), a friendly English chat companion.
Your task is to chat with the user in simple, conversational English to help them practice texting.
- ALWAYS respond in English.
- Keep sentences short (1-2 sentences), casual, and natural.
- Always end with a simple, friendly open-ended question in English to keep the conversation going.`,

  summarizer: `You are Evely (กิฟท์), a helpful Vocabulary and Study Summarizer.
Your task is to summarize the English words, expressions, or grammar concepts the user asks about.
- Provide neat bullet points of key meanings, examples, or memory tricks.
- Write explanations in Thai.
- Keep it concise, neat, and highly readable.`,

  translator: `You are Evely (กิฟท์), a skilled English-Thai Translator.
Your task is to translate sentences between Thai and English.
- Translate the phrase accurately.
- Provide a brief breakdown of difficult words or idioms used in the translation in Thai.
- Keep your response brief, clear, and easy to understand.`
};

const JSON_INSTRUCTION = `\n\nYou must respond ONLY with a valid JSON object matching this schema. Do NOT add markdown code blocks, do NOT add prose outside the JSON:
{
  "reply": "friendly reply text from your role",
  "topic": "extracted topic (string or null)",
  "level": "extracted level (A1|A2|B1|B2|easy|medium|hard or null)",
  "category": "extracted category (cefr|toeic or null)",
  "readyToStart": boolean
}`;

function parseAssistantResponse(content: string): AssistantResponse {
  const trimmed = content.trim();
  
  // Try to find markdown JSON code block
  const fenceMatch = /```(?:json)?\s*([\s\S]*?)\s*```/i.exec(trimmed);
  const jsonText = fenceMatch ? fenceMatch[1].trim() : trimmed;
  
  try {
    const data = JSON.parse(jsonText);
    return {
      reply: typeof data.reply === 'string' ? data.reply : 'ขออภัยด้วยค่ะ ฉันเกิดข้อผิดพลาดในการประมวลผลคำตอบ',
      topic: typeof data.topic === 'string' ? data.topic : null,
      level: typeof data.level === 'string' ? data.level : null,
      category: data.category === 'cefr' || data.category === 'toeic' ? data.category : null,
      readyToStart: typeof data.readyToStart === 'boolean' ? data.readyToStart : false
    };
  } catch (err) {
    console.error('Failed to parse assistant response:', content, err);
    // Fallback: try manual regex matching if JSON parse fails
    const replyMatch = /"reply"\s*:\s*"([^"]+)"/i.exec(jsonText);
    const topicMatch = /"topic"\s*:\s*"([^"]+)"/i.exec(jsonText);
    const levelMatch = /"level"\s*:\s*"([^"]+)"/i.exec(jsonText);
    const categoryMatch = /"category"\s*:\s*"([^"]+)"/i.exec(jsonText);
    const readyMatch = /"readyToStart"\s*:\s*(true|false)/i.exec(jsonText);

    return {
      reply: replyMatch ? replyMatch[1] : 'ฉันได้รับข้อความแล้วค่ะ มีอะไรให้ฉันช่วยเพิ่มเติมไหมคะ?',
      topic: topicMatch ? topicMatch[1] : null,
      level: levelMatch ? levelMatch[1] : null,
      category: categoryMatch && (categoryMatch[1] === 'cefr' || categoryMatch[1] === 'toeic') ? (categoryMatch[1] as 'cefr' | 'toeic') : null,
      readyToStart: readyMatch ? readyMatch[1] === 'true' : false
    };
  }
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const { messages, role = 'default' } = body as { messages?: ChatHistoryMessage[]; role?: string };
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: 'Messages are required' }, { status: 400 });
  }

  const apiKey = request.headers.get('x-custom-api-key') || process.env.KKU_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'API key is required' }, { status: 401 });
  }

  const model = request.headers.get('x-custom-model') || 'deepseek-v4-flash';

  // Build system prompt for active role
  const basePrompt = ROLE_PROMPTS[role] || ROLE_PROMPTS.default;
  const fullSystemPrompt = basePrompt + JSON_INSTRUCTION;

  // Build KKU API request
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
            ? `${fullSystemPrompt}\n\n--- The user's latest message (reply to this) ---\n${msg.content}`
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

    const parsedResponse = parseAssistantResponse(content);
    return NextResponse.json(parsedResponse);
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('Assistant API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
