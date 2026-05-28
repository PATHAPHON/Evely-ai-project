import { NextRequest, NextResponse } from 'next/server';
import { parseChatResponse } from './parseChatResponse';
import { buildContext } from './buildContext';
import type {
  ChatRequest,
  ChatSuccessResponse,
  ChatErrorResponse,
  ChatErrorType,
  ProficiencyLevel,
  ChatMessage,
} from '@/app/chat/_lib/types';

const KKU_API_URL = 'https://gen.ai.kku.ac.th/api/v1/chat/completions';
const API_TIMEOUT_MS = 30_000;

const VALID_PROFICIENCY_LEVELS: ProficiencyLevel[] = [
  'beginner',
  'intermediate',
  'advanced',
];

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
 * Build the system prompt based on topic, proficiency level, and word context.
 */
function buildSystemPrompt(
  topic: string,
  level: ProficiencyLevel,
  wordContext: string[]
): string {
  const levelInstructions: Record<ProficiencyLevel, string> = {
    beginner:
      'Speak like a friendly person texting — very short (1–2 sentences max), simple words, basic grammar (은/는, 이/가, 을/를, present tense). No long explanations.',
    intermediate:
      'Speak naturally like a real conversation — 1–3 short sentences, casual or polite tone, normal everyday expressions. No lengthy responses.',
    advanced:
      'Speak like a native in casual chat — concise, natural, may use slang, contractions, or informal speech. Keep it punchy and real.',
  };

  const wordInstruction =
    wordContext.length > 0
      ? `Naturally incorporate these Korean words into the conversation within the first 5 exchanges: ${wordContext.join(', ')}.`
      : '';

  return (
    `IMPORTANT: You must respond with ONLY a valid JSON object. No prose, no markdown, no explanation — just raw JSON.\n\n` +
    `You are a Korean friend having a casual chat. Topic: "${topic}". ${levelInstructions[level]} ${wordInstruction} Keep responses SHORT — 1-2 sentences like texting.\n\n` +
    `Your entire response must be exactly this JSON structure and nothing else:\n` +
    `{"korean":"<Korean reply in Hangul>","reading":"<Korean sounds in Thai script karaoke e.g. อัน เนียง ฮา เซ โย for 안녕하세요 — NOT Thai meaning>","romanization":"<Revised Romanization>","translation":"<Thai meaning>","english":"<English meaning>"}\n\n` +
    `RULES:\n` +
    `- Output ONLY the JSON object, starting with { and ending with }\n` +
    `- The "reading" field = Korean pronunciation written in Thai characters (karaoke), NOT translation\n` +
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

  // proficiencyLevel must be valid
  if (
    typeof record.proficiencyLevel !== 'string' ||
    !VALID_PROFICIENCY_LEVELS.includes(
      record.proficiencyLevel as ProficiencyLevel
    )
  )
    return null;

  // topic must be 2-100 chars after trimming
  if (typeof record.topic !== 'string') return null;
  const trimmedTopic = record.topic.trim();
  if (trimmedTopic.length < 2 || trimmedTopic.length > 100) return null;

  // wordContext is optional, but if present must be an array of strings
  let wordContext: string[] = [];
  if (record.wordContext !== undefined) {
    if (!Array.isArray(record.wordContext)) return null;
    if (!record.wordContext.every((item) => typeof item === 'string'))
      return null;
    wordContext = record.wordContext as string[];
  }

  return {
    messages: record.messages as ChatRequest['messages'],
    proficiencyLevel: record.proficiencyLevel as ProficiencyLevel,
    topic: trimmedTopic,
    wordContext,
  };
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<ChatSuccessResponse | ChatErrorResponse>> {
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

  const { messages, proficiencyLevel, topic, wordContext } = input;

  // Read API key from environment
  const apiKey = process.env.KKU_API_KEY;
  if (!apiKey) {
    return errorResponse('api_error', 502);
  }

  // Build system prompt
  const systemPrompt = buildSystemPrompt(
    topic,
    proficiencyLevel,
    wordContext ?? []
  );

  // Build conversation context from messages (up to 20 most recent)
  // Convert ChatMessagePayload[] to ChatMessage[] for buildContext
  const chatMessages: ChatMessage[] = messages.map((msg, index) => ({
    id: String(index),
    role: msg.role,
    korean: msg.role === 'assistant' ? msg.content : '',
    reading: '',
    romanization: '',
    translation: '',
    english: '',
    rawText: msg.role === 'user' ? msg.content : '',
    timestamp: new Date().toISOString(),
    status: 'sent' as const,
  }));

  const contextPayload = buildContext(chatMessages);

  // Construct KKU IntelSphere API request
  // Prepend system prompt to the first user message to avoid unsupported system role
  const contextWithSystem = contextPayload.map((msg, i) => ({
    role: msg.role as 'user' | 'assistant',
    content: [
      {
        type: 'text' as const,
        text: i === 0 && msg.role === 'user'
          ? `${systemPrompt}\n\n${msg.content}`
          : msg.content,
      },
    ],
  }));

  // If no context yet (first message), create a starter
  const apiMessages = contextWithSystem.length > 0
    ? contextWithSystem
    : [{ role: 'user' as const, content: [{ type: 'text' as const, text: systemPrompt + '\n\nStart the conversation.' }] }];

  const requestBody = {
    model: 'gemini-3.1-flash-lite',
    messages: apiMessages,
    max_tokens: 1024,
  };

  // Set up timeout with AbortController
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

    // Map error responses
    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`KKU API error [${response.status}]:`, errorBody);

      if (response.status === 429) {
        return errorResponse('rate_limit', 429);
      }
      return errorResponse('api_error', 502);
    }

    // Parse successful response
    const responseText = await response.text();

    let content: string | undefined;
    try {
      const data = JSON.parse(responseText);
      content = data?.choices?.[0]?.message?.content;

      if (!content && data?.content) {
        content = data.content;
      }
    } catch {
      // Fall through — treat raw text as content
      content = responseText;
    }

    if (!content || content.trim().length === 0) {
      console.error('Could not extract content from KKU response');
      return errorResponse('api_error', 502);
    }

    console.log('KKU raw content:', JSON.stringify(content));

    // Parse the chat response content into ChatSuccessResponse
    const parsed = parseChatResponse(content);

    return NextResponse.json(parsed, { status: 200 });
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
}
