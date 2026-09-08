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
    ? `Also provide "suggestions": 2-3 short, natural replies (in ${lang.label}) that the USER could send back to you next along with natural Thai translations — these help the user when they don't know what to say. Make them fit the conversation and the user's level, and vary them (e.g. an answer, a follow-up question, a reaction).\n\n`
    : '';

  const suggestionsSchema = isPremium
    ? `  "suggestions": [\n    {\n      "englishText": "<a reply the user could send, in ${lang.script}>",\n      "translation": "<natural Thai translation of this reply>"\n    }\n  ]\n`
    : `  "suggestions": []\n`;

  return (
    `You are a ${lang.label} friend having an ongoing, casual text chat with the user.\n\n` +
    `CONTEXT IS CRITICAL: The messages above are the real conversation so far. Read ALL of them and reply DIRECTLY to the user's most recent message. Acknowledge what they just said, answer their questions, and keep the dialogue flowing. Never ignore their message, never change the subject randomly, and never repeat one of your earlier replies.\n\n` +
    `The user may write in ${lang.label}, Thai, or English — understand their meaning either way, but ALWAYS reply in ${lang.label}.\n\n` +
    `Speak naturally like in a real conversation — medium length (3–5 sentences), using a casual or polite tone and normal everyday expressions. Share more details and elaborate on topics.\n\n` +
    `OPEN-ENDED QUESTION RULE: The last sentence of your reply (the last item in your "sentences" array) MUST always be a friendly, natural, open-ended question in ${lang.label} related to the conversation flow to keep the conversation active (e.g. asking how they feel, what they think, what they did next, etc.).\n\n` +
    suggestionsSection +
    `Respond with ONLY a valid JSON object — no prose, no markdown, no code fences, no text before or after it. Exactly this structure:\n` +
    `{\n` +
    `  "sentences": [\n` +
    `    {\n` +
    `      "englishText": "<sentence in ${lang.script}>",\n` +
    `      "translation": "<natural Thai translation of this sentence>"\n` +
    `    }\n` +
    `  ],\n` +
    suggestionsSchema +
    `}\n\n` +
    `RULES:\n` +
    `- "sentences" is an array of sentence objects, splitting your reply into natural, shorter sentences.\n` +
    `- Output ONLY the JSON object, starting with { and ending with }\n` +
    `- The "englishText" field in each sentence always holds the ${lang.label} text\n` +
    `- The "translation" field in each sentence always holds the natural Thai translation (conversational Thai suited for chat) of that sentence\n` +
    `- "suggestions" are replies for the USER to choose from, where "englishText" is in ${lang.label} and "translation" is the Thai translation, NOT your reply\n` +
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

  const { isPremium } = user;
  const limit = isPremium
    ? DAILY_BUDGET_MICROBAHT.premium
    : DAILY_BUDGET_MICROBAHT.free;

  const hasBudget = await checkBudget(limit);
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
