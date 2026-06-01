import { NextRequest, NextResponse } from 'next/server';
import { parseLessonResponse } from './parseLessonResponse';
import { LANG_PROMPT, isValidTargetLanguage } from '@/app/api/_lib/languagePrompt';
import type { TargetLanguage } from '@/app/_lib/wordTypes';
import type {
  LessonRequest,
  LessonSuccessResponse,
  LessonErrorResponse,
} from '@/app/chat/_lib/lessonTypes';
import type { ChatErrorType, ProficiencyLevel } from '@/app/chat/_lib/types';

const KKU_API_URL = 'https://gen.ai.kku.ac.th/api/v1/chat/completions';
const API_TIMEOUT_MS = 40_000;

const VALID_PROFICIENCY_LEVELS: ProficiencyLevel[] = [
  'beginner',
  'intermediate',
  'advanced',
];

const ERROR_MESSAGES: Record<ChatErrorType, string> = {
  invalid_input: 'Invalid input.',
  api_error: 'Failed to generate lesson. Please try again.',
  rate_limit: 'Too many requests. Please wait a moment.',
  timeout: 'Connection timed out. Please try again.',
  network_error: 'Cannot connect. Please check your internet.',
};

function errorResponse(
  type: ChatErrorType,
  status: number
): NextResponse<LessonErrorResponse> {
  return NextResponse.json(
    { error: { type, message: ERROR_MESSAGES[type] } },
    { status }
  );
}

/**
 * Build the lesson-generation prompt. Instructs the model to return ONLY a
 * JSON object containing a mix of all four exercise types, tuned to the level.
 */
function buildLessonSystemPrompt(
  topic: string,
  level: ProficiencyLevel,
  wordContext: string[],
  language: TargetLanguage
): string {
  const lang = LANG_PROMPT[language];

  const levelInstructions: Record<ProficiencyLevel, string> = {
    beginner:
      'Keep vocabulary and grammar very simple (CEFR A1-A2): basic words, short phrases, present tense.',
    intermediate:
      'Use everyday vocabulary and common grammar (CEFR B1-B2): natural sentences, polite/casual forms.',
    advanced:
      'Use richer vocabulary and varied grammar (CEFR C1-C2): idioms, nuanced expressions, longer sentences.',
  };

  const wordInstruction =
    wordContext.length > 0
      ? `Build the lesson around these ${lang.label} words the learner is studying — make sure each one appears in at least one exercise: ${wordContext.join(', ')}. `
      : '';

  return (
    `IMPORTANT: You must respond with ONLY a valid JSON object. No prose, no markdown, no explanation — just raw JSON.\n\n` +
    `You are a ${lang.label} language teacher creating a short Duolingo-style lesson for a Thai learner. ` +
    `Topic: "${topic}". ${levelInstructions[level]} ${wordInstruction}\n\n` +
    `Create exactly 6 exercises that mix ALL of these four "type" values (at least one of each): ` +
    `"multiple_choice", "fill_blank", "matching", "listening".\n\n` +
    `Your entire response must be exactly this JSON structure and nothing else:\n` +
    `{"exercises":[\n` +
    `  {"type":"multiple_choice","prompt":"<question/instruction in Thai, e.g., 'เลือกคำแปลที่ถูกต้องของ...' หรือ 'คำใดคือ...'>","korean":"<${lang.label} word/phrase being asked about, in ${lang.script}>","reading":"<${lang.readingDesc}>","romanization":"<${lang.romanizationDesc}>","translation":"<Thai translation/meaning>","options":["<choice1>","<choice2>","<choice3>","<choice4>"],"answerIndex":0},\n` +
    `  {"type":"fill_blank","prompt":"<instruction in Thai>","korean":"<${lang.label} sentence with ___ for the blank>","reading":"<${lang.readingDesc}>","romanization":"<${lang.romanizationDesc}>","translation":"<Thai translation/meaning>","options":["<choice1>","<choice2>","<choice3>"],"answerIndex":0},\n` +
    `  {"type":"matching","prompt":"<instruction in Thai, e.g., 'จับคู่คำกับคำแปลภาษาไทย'>","pairs":[{"korean":"<${lang.label} text>","thai":"<Thai translation/meaning>"},{"korean":"<${lang.label} text>","thai":"<Thai translation/meaning>"},{"korean":"<${lang.label} text>","thai":"<Thai translation/meaning>"}]},\n` +
    `  {"type":"listening","prompt":"<instruction in Thai, e.g., 'ฟังแล้วเลือกคำที่ได้ยิน'>","korean":"<${lang.label} text to be spoken aloud, in ${lang.script}>","reading":"<${lang.readingDesc}>","romanization":"<${lang.romanizationDesc}>","translation":"<Thai translation/meaning>","options":["<${lang.label} choice1>","<${lang.label} choice2>","<${lang.label} choice3>"],"answerIndex":0}\n` +
    `]}\n\n` +
    `RULES:\n` +
    `- Output ONLY the JSON object, starting with { and ending with }\n` +
    `- The "korean" field always holds the ${lang.label} text, regardless of its key name.\n` +
    `- "answerIndex" is the 0-based index of the correct entry in "options"\n` +
    `- For "multiple_choice" and "fill_blank", "options" hold the answer choices (Thai meanings or ${lang.label} words as appropriate)\n` +
    `- For "listening", "options" must all be ${lang.label} words/phrases (the learner picks the one they heard)\n` +
    `- For "matching", provide 2-4 "pairs" that match ${lang.label} words/phrases with their correct Thai translations/meanings.\n` +
    `- STRICT RULE FOR "reading": The "reading" field must strictly contain ONLY ${lang.readingDesc}. It must NOT contain the Thai translation/meaning.\n` +
    `- The "translation" field must contain the Thai translation/meaning of the ${lang.label} word/sentence.\n` +
    `- RULE FOR PRONUNCIATION IN TEXT STRINGS: Whenever you output a ${lang.label} word/phrase/sentence inside the "prompt" (โจทย์), the "options" (except for listening options), or the "korean" field in "matching" pairs, you MUST always append its pronunciation in Thai-script karaoke in parentheses next to it (e.g. ${lang.readingExample}).\n` +
    `  * For "listening" options, do NOT append pronunciation (keep them as plain ${lang.label} so it stays a pure listening test); provide the pronunciation only in the separate "reading" field.\n` +
    `- All instructions/prompts must be in Thai\n` +
    `- Do NOT add any text before or after the JSON`
  );
}

/**
 * Validate that the request body has the expected shape for a lesson request.
 */
function validateInput(body: unknown): LessonRequest | null {
  if (typeof body !== 'object' || body === null) return null;

  const record = body as Record<string, unknown>;

  if (
    typeof record.proficiencyLevel !== 'string' ||
    !VALID_PROFICIENCY_LEVELS.includes(
      record.proficiencyLevel as ProficiencyLevel
    )
  ) {
    return null;
  }

  if (typeof record.topic !== 'string') return null;
  const trimmedTopic = record.topic.trim();
  if (trimmedTopic.length < 2 || trimmedTopic.length > 100) return null;

  // wordContext is optional, but if present must be an array of strings.
  let wordContext: string[] = [];
  if (record.wordContext !== undefined) {
    if (!Array.isArray(record.wordContext)) return null;
    if (!record.wordContext.every((item) => typeof item === 'string'))
      return null;
    wordContext = record.wordContext as string[];
  }

  const language: TargetLanguage = isValidTargetLanguage(record.language)
    ? record.language
    : 'korean';

  return {
    topic: trimmedTopic,
    proficiencyLevel: record.proficiencyLevel as ProficiencyLevel,
    wordContext,
    language,
  };
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<LessonSuccessResponse | LessonErrorResponse>> {
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

  const { topic, proficiencyLevel, wordContext, language } = input;

  // Read custom API key and model from request headers (user-provided config).
  const customApiKey = request.headers.get('x-custom-api-key');
  const customModel = request.headers.get('x-custom-model');

  const apiKey = customApiKey;
  if (!apiKey) {
    return errorResponse('api_error', 401);
  }

  const prompt = buildLessonSystemPrompt(
    topic,
    proficiencyLevel,
    wordContext ?? [],
    language ?? 'korean'
  );

  // KKU has no system role — send the prompt as a single user message.
  const requestBody = {
    model: customModel || 'gemini-3.1-flash-lite',
    messages: [
      {
        role: 'user' as const,
        content: [{ type: 'text' as const, text: prompt }],
      },
    ],
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

      if (response.status === 429) {
        return errorResponse('rate_limit', 429);
      }
      return errorResponse('api_error', 502);
    }

    const responseText = await response.text();

    let content: string | undefined;
    try {
      const data = JSON.parse(responseText);
      content = data?.choices?.[0]?.message?.content;
      if (!content && data?.content) {
        content = data.content;
      }
    } catch {
      content = responseText;
    }

    if (!content || content.trim().length === 0) {
      console.error('Could not extract content from KKU response');
      return errorResponse('api_error', 502);
    }

    try {
      const parsed = parseLessonResponse(content);
      return NextResponse.json(parsed, { status: 200 });
    } catch (parseError) {
      console.error('Failed to parse lesson response:', parseError);
      return errorResponse('api_error', 502);
    }
  } catch (error: unknown) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      return errorResponse('timeout', 504);
    }
    if (error instanceof TypeError) {
      return errorResponse('network_error', 502);
    }
    console.error('Lesson API unexpected error:', error);
    return errorResponse('api_error', 502);
  }
}
