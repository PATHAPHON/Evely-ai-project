import { NextRequest, NextResponse, after } from 'next/server';
import { buildContext } from './buildContext';
import { LANG_PROMPT, isValidTargetLanguage } from '@/app/api/_lib/utils/languagePrompt';
import {
  getRequestUser,
  unauthorizedResponse,
  checkBudget,
  debitBudget,
  budgetExhaustedResponse,
} from '@/app/api/_lib/utils/requireUser';
import { TOKEN_COST_MICROBAHT, DAILY_BUDGET_MICROBAHT } from '@/app/api/_lib/utils/tokenCost';
import type { TargetLanguage } from '@/shared/types/wordTypes';
import type {
  ChatRequest,
  ChatSuccessResponse,
  ChatErrorResponse,
  ChatErrorType,
  ChatMessage,
} from '@/shared/types/chatTypes';

// ponytail: LLM call can take 30s; without this the serverless gateway 504s
// at its default cap (10s on Vercel hobby) before our own timeout fires.
export const maxDuration = 60;

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_OPENROUTER_MODEL = 'google/gemini-3.1-flash-lite';
const API_TIMEOUT_MS = 30_000;

const ERROR_MESSAGES: Record<ChatErrorType, string> = {
  invalid_input: 'Invalid input.',
  api_error: 'Failed to generate message. Please try again.',
  rate_limit: 'Too many requests. Please wait a moment.',
  upstream_busy: 'Server is busy right now. Please try again shortly.',
  timeout: 'Connection timed out. Please try again.',
  network_error: 'Cannot connect. Please check your internet.',
};

function errorResponse(
  type: ChatErrorType,
  status: number
): NextResponse<ChatErrorResponse> {
  return NextResponse.json(
    { error: { type, message: ERROR_MESSAGES[type] } },
    { status }
  );
}

function buildSystemPrompt(language: TargetLanguage, isPremium: boolean): string {
  const lang = LANG_PROMPT[language];

  const suggestionsSection = isPremium
    ? `SUGGESTED REPLIES ("suggestions"):\n` +
      `- Provide 2-3 short, natural reply choices (in ${lang.label}) that the USER could send back to you next, along with natural conversational Thai translations.\n` +
      `- DIVERSE, CASUAL & OPEN-ENDED: Do NOT make them sound formal, corporate, or limited to work tasks. The suggestions can be ANYTHING that fits a natural chat — casual opinions, playful reactions, direct answers, curiosity, sharing personal feelings, or changing the topic.\n` +
      `- Offer varied angles across the 2-3 options so the user has fun and flexible choices (e.g. 1 direct/positive reply, 1 casual opinion/reaction, 1 curious question or alternate thought).\n` +
      `- Aim for 3 to 10 words per reply, simple and natural for a learner to speak or send.\n\n`
    : '';

  const suggestionsSchema = isPremium
    ? `  "suggestions": [\n    {\n      "englishText": "<a reply the user could send, in ${lang.script}>",\n      "translation": "<natural Thai translation of this reply>"\n    }\n  ]\n`
    : `  "suggestions": []\n`;

  return (
    `You are a ${lang.label} friend having an ongoing, casual text chat with the user.\n\n` +
    `CONTEXT IS CRITICAL: The messages above are the real conversation so far. Read ALL of them and reply DIRECTLY to the user's most recent message. Acknowledge what they just said, answer their questions, and keep the dialogue flowing. Never ignore their message, never change the subject randomly, and never repeat one of your earlier replies.\n\n` +
    `The user may write in ${lang.label}, Thai, or English — understand their meaning either way, but ALWAYS reply in ${lang.label}.\n\n` +
    `CONCISE 1–3 SENTENCE STRUCTURE:\n` +
    `- Reply length: Strictly 1 to 3 short sentences total (aim for 5–12 words per sentence).\n` +
    `- Sentence 1 (and 2): Acknowledge or react warmly and briefly to what the user said (e.g. "That sounds like a busy day!", "Nice!"). Keep it simple, clear, and direct.\n` +
    `- No long paragraphs, no compound run-on sentences, and no over-explaining.\n\n` +
    `PROACTIVE FOLLOW-UP QUESTION (MANDATORY):\n` +
    `- The LAST sentence of your reply MUST always be a clear, engaging, and friendly follow-up question in ${lang.label} that invites the user to continue the conversation.\n` +
    `- Keep it natural, casual, and directly relevant to whatever topic was just discussed (feelings, everyday life, food, hobbies, opinions, fun curiosity, personal experiences). Do NOT force questions into work tasks, to-do lists, or next steps unless the user explicitly brought up work.\n` +
    `- Make the question simple and easy for a language learner to answer, encouraging them to chat comfortably.\n\n` +
    `EMOTION / TONE (MANDATORY):\n` +
    `- For each sentence, assign a natural emotional vocal delivery tone in the "emotion" field.\n` +
    `- Choose from this standard list suited for conversational speech: "friendly", "cheerful", "curious", "encouraging", "calm", "excited", "empathetic", "thoughtful", "neutral".\n` +
    `- Match the emotion directly to the sentiment of the sentence (e.g. reactions can be "cheerful", "excited", or "empathetic"; questions can be "curious" or "friendly").\n\n` +
    suggestionsSection +
    `Respond with ONLY a valid JSON object — no prose, no markdown, no code fences, no text before or after it. Exactly this structure:\n` +
    `{\n` +
    `  "sentences": [\n` +
    `    {\n` +
    `      "englishText": "<sentence in ${lang.script}>",\n` +
    `      "translation": "<natural Thai translation of this sentence>",\n` +
    `      "emotion": "<one of: friendly, cheerful, curious, encouraging, calm, excited, empathetic, thoughtful, neutral>"\n` +
    `    }\n` +
    `  ],\n` +
    suggestionsSchema +
    `}\n\n` +
    `RULES:\n` +
    `- "sentences" is an array of 1 to 3 short sentence objects (never exceed 3 sentences).\n` +
    `- Keep each sentence short, clear, and easy to read.\n` +
    `- Output ONLY the JSON object, starting with { and ending with }\n` +
    `- The "englishText" field in each sentence always holds the ${lang.label} text\n` +
    `- The "translation" field in each sentence always holds the natural Thai translation (conversational Thai suited for chat) of that sentence\n` +
    `- The "emotion" field in each sentence indicates the vocal tone for speech synthesis\n` +
    `- "suggestions" are 2-3 casual, diverse conversational replies for the USER to choose from (open-ended and NOT work-restricted), where "englishText" is in ${lang.label} and "translation" is the conversational Thai translation\n` +
    `- Do NOT add any markdown formatting, code fences, or text before or after the JSON`
  );
}

function validateInput(body: unknown): ChatRequest | null {
  if (typeof body !== 'object' || body === null) return null;

  const record = body as Record<string, unknown>;

  if (!Array.isArray(record.messages) || record.messages.length === 0)
    return null;

  for (const msg of record.messages) {
    if (typeof msg !== 'object' || msg === null) return null;
    const m = msg as Record<string, unknown>;
    if (m.role !== 'user' && m.role !== 'assistant') return null;
    if (typeof m.content !== 'string') return null;
  }

  const language: TargetLanguage = isValidTargetLanguage(record.language)
    ? record.language
    : 'english';

  return {
    messages: record.messages as ChatRequest['messages'],
    language,
  };
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<ChatSuccessResponse | ChatErrorResponse> | Response> {
  const user = await getRequestUser();
  if (!user) return unauthorizedResponse();

  const { isPremium, isUnlimited } = user;
  const limit = isPremium
    ? DAILY_BUDGET_MICROBAHT.premium
    : DAILY_BUDGET_MICROBAHT.free;

  const hasBudget = await checkBudget(limit, isUnlimited);
  if (!hasBudget) return budgetExhaustedResponse();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse('invalid_input', 400);
  }

  const input = validateInput(body);
  if (!input) {
    return errorResponse('invalid_input', 400);
  }

  const { messages, language } = input;

  const openRouterKey = process.env.OPENROUTER_API_KEY;

  if (!openRouterKey) {
    return errorResponse('api_error', 401);
  }

  const systemPrompt = buildSystemPrompt(language ?? 'english', isPremium);

  const chatMessages: ChatMessage[] = messages.map((msg, index) => ({
    id: String(index),
    role: msg.role,
    englishText: msg.role === 'assistant' ? msg.content : '',
    translation: '',
    english: '',
    rawText: msg.role === 'user' ? msg.content : '',
    timestamp: new Date().toISOString(),
    status: 'sent' as const,
  }));

  const contextPayload = buildContext(chatMessages);

  let lastUserIndex = -1;
  for (let i = contextPayload.length - 1; i >= 0; i--) {
    if (contextPayload[i].role === 'user') {
      lastUserIndex = i;
      break;
    }
  }

  const contextWithSystem = contextPayload.map((msg, i) => ({
    role: msg.role as 'user' | 'assistant',
    content:
      i === lastUserIndex
        ? `${systemPrompt}\n\n--- The user's latest message (reply to this) ---\n${msg.content}`
        : msg.content,
  }));

  const apiMessages = contextWithSystem.length > 0
    ? contextWithSystem
    : [{ role: 'user' as const, content: systemPrompt + '\n\nStart the conversation.' }];

  let textContent: string | null = null;
  let totalTokens = 500;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const openRouterRes = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openRouterKey}`,
      },
      body: JSON.stringify({
        model: DEFAULT_OPENROUTER_MODEL,
        messages: apiMessages,
        max_tokens: 2048,
        stream: false,
        include_reasoning: false,
        reasoning: { effort: 'minimal' },
      }),
      signal: controller.signal,
    });

    if (openRouterRes.ok) {
      const result = await openRouterRes.json();
      const content = result?.choices?.[0]?.message?.content;
      if (typeof content === 'string' && content.trim().length > 0) {
        textContent = content;
        totalTokens = result?.usage?.total_tokens ?? 500;
      }
    } else {
      console.error(`OpenRouter returned status ${openRouterRes.status}:`, await openRouterRes.text());
    }
  } catch (err) {
    console.error('OpenRouter request failed:', err);
  } finally {
    clearTimeout(timeoutId);
  }

  if (!textContent) {
    return errorResponse('api_error', 502);
  }

  // Debit budget after response is parsed
  const debitCost = totalTokens * TOKEN_COST_MICROBAHT.openrouter;

  after(async () => {
    await debitBudget(debitCost);
  });

  return new Response(textContent, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      ...(isPremium ? {} : { 'X-Suggestions-Locked': '1' }),
    },
  });
}
