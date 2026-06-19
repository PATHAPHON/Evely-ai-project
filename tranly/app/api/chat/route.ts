import { NextRequest, NextResponse } from 'next/server';
import { parseChatResponse } from './parseChatResponse';
import { buildContext } from './buildContext';
import { LANG_PROMPT, isValidTargetLanguage } from '@/app/api/_lib/languagePrompt';
import type { TargetLanguage } from '@/app/_lib/wordTypes';
import type {
  ChatRequest,
  ChatSuccessResponse,
  ChatErrorResponse,
  ChatErrorType,
  ChatMessage,
} from '@/app/chat/_lib/types';

const KKU_API_URL = 'https://gen.ai.kku.ac.th/api/v1/chat/completions';
const API_TIMEOUT_MS = 30_000;

const ERROR_MESSAGES: Record<ChatErrorType, string> = {
  invalid_input: 'Invalid input.',
  api_error: 'Failed to generate message. Please try again.',
  rate_limit: 'Too many requests. Please wait a moment.',
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

/**
 * Build the system prompt based on language.
 */
function buildSystemPrompt(language: TargetLanguage): string {
  const lang = LANG_PROMPT[language];

  return (
    `You are a ${lang.label} friend having an ongoing, casual text chat with the user.\n\n` +
    `CONTEXT IS CRITICAL: The messages above are the real conversation so far. Read ALL of them and reply DIRECTLY to the user's most recent message. Acknowledge what they just said, answer their questions, and keep the dialogue flowing. Never ignore their message, never change the subject randomly, and never repeat one of your earlier replies.\n\n` +
    `The user may write in ${lang.label}, Thai, or English — understand their meaning either way, but ALWAYS reply in ${lang.label}.\n\n` +
    `Speak naturally like in a real conversation — medium length (3–5 sentences), using a casual or polite tone and normal everyday expressions. Share more details and elaborate on topics.\n\n` +
    `OPEN-ENDED QUESTION RULE: The last sentence of your reply (the last item in your "sentences" array) MUST always be a friendly, natural, open-ended question in ${lang.label} related to the conversation flow to keep the conversation active (e.g. asking how they feel, what they think, what they did next, etc.).\n\n` +
    `Also provide "suggestions": 2-3 short, natural replies (in ${lang.label}) that the USER could send back to you next — these help the user when they don't know what to say. Make them fit the conversation and the user's level, and vary them (e.g. an answer, a follow-up question, a reaction).\n\n` +
    `Respond with ONLY a valid JSON object — no prose, no markdown, no code fences, no text before or after it. Exactly this structure:\n` +
    `{\n` +
    `  "sentences": [\n` +
    `    {\n` +
    `      "englishText": "<sentence in ${lang.script}>",\n` +
    `      "reading": "<${lang.readingDesc}, e.g. ${lang.readingExample}>",\n` +
    `      "romanization": "<${lang.romanizationDesc}>",\n` +
    `      "translation": "<Thai meaning of this sentence>",\n` +
    `      "english": "<English meaning of this sentence>",\n` +
    `      "englishPhrases": ["<the same English meaning split into ordered, meaningful chunks>"]\n` +
    `    }\n` +
    `  ],\n` +
    `  "suggestions": [\n` +
    `    { "englishText": "<a reply the user could send, in ${lang.script}>", "translation": "<its Thai meaning>" }\n` +
    `  ]\n` +
    `}\n\n` +
    `RULES:\n` +
    `- "sentences" is an array of sentence objects, splitting your reply into natural, shorter sentences.\n` +
    `- Output ONLY the JSON object, starting with { and ending with }\n` +
    `- The "englishText" field in each sentence always holds the ${lang.label} text\n` +
    `- "suggestions" are replies for the USER to choose from (${lang.label} + Thai meaning), NOT your reply\n` +
    `- "reading" = ${lang.readingDesc}, NOT a translation\n` +
    `- "englishPhrases" splits the "english" meaning into ordered chunks of 1-3 words each, grouping natural units together (collocations like "good day", phrasal verbs like "up to", "article + noun" like "a book", greetings like "Hey there"). Each chunk MUST keep any punctuation attached at its END (e.g. "Hey there!", "from you."). NEVER start a chunk with punctuation and NEVER make a chunk that is only punctuation. Joining the chunks with single spaces MUST reproduce "english" exactly. Example: english "Hey there! Good to hear from you." → englishPhrases ["Hey there!", "Good to", "hear from you."].\n` +
    `- Do NOT add any text before or after the JSON`
  );
}

/**
 * Validate that the request body has the expected shape for a chat request.
 */
function validateInput(body: unknown): ChatRequest | null {
  if (typeof body !== 'object' || body === null) return null;

  const record = body as Record<string, unknown>;

  // messages must be a non-empty array
  if (!Array.isArray(record.messages) || record.messages.length === 0)
    return null;

  // Each message must have role and content
  for (const msg of record.messages) {
    if (typeof msg !== 'object' || msg === null) return null;
    const m = msg as Record<string, unknown>;
    if (m.role !== 'user' && m.role !== 'assistant') return null;
    if (typeof m.content !== 'string') return null;
  }

  // language is optional; default to English.
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
  // Parse request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse('invalid_input', 400);
  }

  // Validate input
  const input = validateInput(body);
  if (!input) {
    return errorResponse('invalid_input', 400);
  }

  const { messages, language } = input;

  // Read custom API key and model from request headers (user-provided config).
  const customApiKey = request.headers.get('x-custom-api-key');
  const customModel = request.headers.get('x-custom-model');

  const apiKey = customApiKey || process.env.KKU_API_KEY;
  if (!apiKey) {
    return errorResponse('api_error', 401);
  }

  // Build system prompt
  const systemPrompt = buildSystemPrompt(language ?? 'english');

  // Build conversation context from messages (up to 20 most recent)
  // Convert ChatMessagePayload[] to ChatMessage[] for buildContext
  const chatMessages: ChatMessage[] = messages.map((msg, index) => ({
    id: String(index),
    role: msg.role,
    englishText: msg.role === 'assistant' ? msg.content : '',
    reading: '',
    romanization: '',
    translation: '',
    english: '',
    rawText: msg.role === 'user' ? msg.content : '',
    timestamp: new Date().toISOString(),
    status: 'sent' as const,
  }));

  const contextPayload = buildContext(chatMessages);

  // Construct KKU IntelSphere API request.
  // KKU has no system role, so the instructions are attached to the LATEST user
  // message (the one the model must reply to). Keeping the prompt adjacent to the
  // newest turn — instead of buried at the start — keeps replies on-context and
  // correctly formatted even in long conversations.
  let lastUserIndex = -1;
  for (let i = contextPayload.length - 1; i >= 0; i--) {
    if (contextPayload[i].role === 'user') {
      lastUserIndex = i;
      break;
    }
  }

  const contextWithSystem = contextPayload.map((msg, i) => ({
    role: msg.role as 'user' | 'assistant',
    content: [
      {
        type: 'text' as const,
        text:
          i === lastUserIndex
            ? `${systemPrompt}\n\n--- The user's latest message (reply to this) ---\n${msg.content}`
            : msg.content,
      },
    ],
  }));

  // If no context yet (first message), create a starter
  const apiMessages = contextWithSystem.length > 0
    ? contextWithSystem
    : [{ role: 'user' as const, content: [{ type: 'text' as const, text: systemPrompt + '\n\nStart the conversation.' }] }];

  const requestBody = {
    model: customModel || 'deepseek-v4-flash',
    messages: apiMessages,
    max_tokens: 2048,
    stream: true,
  };

  // Set up timeout with AbortController
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(KKU_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      return errorResponse('timeout', 504);
    }
    if (error instanceof TypeError) {
      return errorResponse('network_error', 502);
    }
    console.error('Chat API unexpected error:', error);
    return errorResponse('api_error', 502);
  }

  // Map upstream error responses (before streaming starts)
  if (!upstreamResponse.ok) {
    clearTimeout(timeoutId);
    const errorBody = await upstreamResponse.text();
    console.error(`KKU API error [${upstreamResponse.status}]:`, errorBody);
    if (upstreamResponse.status === 429) {
      return errorResponse('rate_limit', 429);
    }
    return errorResponse('api_error', 502);
  }

  // Stream SSE delta chunks to the client as plain text.
  // Each chunk is the raw `delta.content` string from the upstream SSE.
  // The client accumulates the buffer and runs parseChatResponse on completion.
  const upstreamBody = upstreamResponse.body;
  if (!upstreamBody) {
    clearTimeout(timeoutId);
    return errorResponse('api_error', 502);
  }

  const stream = new ReadableStream({
    async start(streamController) {
      const reader = upstreamBody.getReader();
      const decoder = new TextDecoder();
      let sseBuffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          sseBuffer += decoder.decode(value, { stream: true });

          // Process complete SSE lines
          const lines = sseBuffer.split('\n');
          // Keep last (possibly incomplete) line in buffer
          sseBuffer = lines.pop() ?? '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data:')) continue;
            const data = trimmed.slice(5).trim();
            if (data === '[DONE]') {
              streamController.close();
              return;
            }
            try {
              const parsed = JSON.parse(data);
              const delta = parsed?.choices?.[0]?.delta?.content;
              if (typeof delta === 'string' && delta.length > 0) {
                streamController.enqueue(new TextEncoder().encode(delta));
              }
            } catch {
              // skip malformed SSE data lines
            }
          }
        }
        streamController.close();
      } catch {
        streamController.close();
      } finally {
        clearTimeout(timeoutId);
        reader.releaseLock();
      }
    },
    cancel() {
      clearTimeout(timeoutId);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-cache',
    },
  });
}
