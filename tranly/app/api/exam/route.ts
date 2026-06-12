import { NextRequest, NextResponse } from 'next/server';
import { parseExamResponse } from './parseExamResponse';
import { validateInput } from './validateInput';
import {
  type ExamCategory,
  type ExamLevel,
  type ExamQuestion,
} from '@/app/exam/_lib/types';

const KKU_API_URL = 'https://gen.ai.kku.ac.th/api/v1/chat/completions';
const API_TIMEOUT_MS = 60_000;

type ExamErrorType =
  | 'invalid_input'
  | 'api_error'
  | 'rate_limit'
  | 'timeout'
  | 'network_error';

const ERROR_MESSAGES: Record<ExamErrorType, string> = {
  invalid_input: 'Invalid input.',
  api_error: 'Failed to generate exam. Please try again.',
  rate_limit: 'Too many requests. Please wait a moment.',
  timeout: 'Connection timed out. Please try again.',
  network_error: 'Cannot connect. Please check your internet.',
};

interface ExamErrorResponse {
  error: { type: ExamErrorType; message: string };
}

interface ExamSuccessResponse {
  questions: ExamQuestion[];
  /** The level the AI chose to write the test at. */
  level: ExamLevel;
  category: ExamCategory;
}

function errorResponse(
  type: ExamErrorType,
  status: number
): NextResponse<ExamErrorResponse> {
  return NextResponse.json(
    { error: { type, message: ERROR_MESSAGES[type] } },
    { status }
  );
}

/** reading/listening split per supported question count */
const QUESTION_SPLITS: Record<number, { reading: number; listening: number }> = {
  5: { reading: 3, listening: 2 },
  10: { reading: 5, listening: 5 },
};

function buildExamPrompt(
  category: ExamCategory,
  topic: string | undefined,
  questionCount: number,
  excludeTexts?: string[],
  level?: ExamLevel
): string {
  const levelInstruction = level
    ? `Write every question at exactly ${category === 'toeic' ? 'TOEIC' : 'CEFR'} level "${level}". Set "level" to "${level}" in your response.`
    : (() => {
        const levelGuide =
          category === 'toeic'
            ? 'a TOEIC level — one of "easy", "medium" or "hard"'
            : 'a CEFR level — one of "A1", "A2", "B1" or "B2"';
        return `Judge for yourself which difficulty best fits this topic and context, pick ${levelGuide}, and write every question at that single chosen level. Report the level you chose in the "level" field.`;
      })();
  const styleNote =
    category === 'toeic'
      ? 'Use TOEIC-style content: workplace, business, travel, announcements, emails.'
      : 'Use general everyday English.';
  const topicNote = topic
    ? `All passages, scripts and questions must be about the topic: "${topic}".\n`
    : '';
  const { reading, listening } = QUESTION_SPLITS[questionCount];

  const excludeNote = excludeTexts && excludeTexts.length > 0
    ? `\nIMPORTANT: Do NOT reuse or reference any of the following passages, scripts, dialogues, or questions (avoid duplicate content): \n${excludeTexts.map(t => `- "${t}"`).join('\n')}\n`
    : '';

  return (
    `IMPORTANT: You must respond with ONLY a valid JSON object. No prose, no markdown, no explanation — just raw JSON.\n\n` +
    `You are an English exam writer creating a practice test for a Thai learner.\n` +
    `${levelInstruction}\n` +
    `${styleNote}\n${topicNote}${excludeNote}\n` +
    `Create exactly ${questionCount} multiple-choice questions: ${reading} with "type":"reading" followed by ${listening} with "type":"listening".\n\n` +
    `Your entire response must be exactly this JSON structure and nothing else:\n` +
    `{"level":"<the level>","questions":[\n` +
    `  {"type":"reading","passage":"<short English passage, 1-4 sentences>","question":"<question in English about the passage>","choices":["<A>","<B>","<C>","<D>"],"correctAnswer":0},\n` +
    `  {"type":"listening","script":"<short English monologue or dialogue to be read aloud, 1-3 sentences>","question":"<question in English about what was heard>","choices":["<A>","<B>","<C>","<D>"],"correctAnswer":0}\n` +
    `]}\n\n` +
    `RULES:\n` +
    `- Output ONLY the JSON object, starting with { and ending with }\n` +
    `- "level" is the single ${category === 'toeic' ? 'TOEIC' : 'CEFR'} level for the whole test\n` +
    `- Exactly ${questionCount} questions: the first ${reading} "reading", the last ${listening} "listening"\n` +
    `- "choices" always has exactly 4 distinct English options\n` +
    `- "correctAnswer" is the 0-based index of the correct choice; vary it across questions\n` +
    `- "script" must NOT be repeated inside "question" or "choices" (the learner only hears it)\n` +
    `- All passages, scripts, questions and choices are in English only\n` +
    `- Do NOT add any text before or after the JSON`
  );
}


export async function POST(
  request: NextRequest
): Promise<NextResponse<ExamSuccessResponse | ExamErrorResponse>> {
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

  const apiKey =
    request.headers.get('x-custom-api-key') || process.env.KKU_API_KEY;
  if (!apiKey) {
    return errorResponse('api_error', 401);
  }
  const model = request.headers.get('x-custom-model') || 'deepseek-v4-flash';

  const requestBody = {
    model,
    messages: [
      {
        role: 'user' as const,
        content: [
          {
            type: 'text' as const,
            text: buildExamPrompt(
              input.category,
              input.topic,
              input.questionCount,
              input.excludeTexts,
              input.level
            ),
          },
        ],
      },
    ],
    max_tokens: 4096,
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
      content = data?.choices?.[0]?.message?.content ?? data?.content;
    } catch {
      content = responseText;
    }

    if (!content) {
      return errorResponse('api_error', 502);
    }

    const parsed = parseExamResponse(content);
    if (!parsed || parsed.questions.length < 3) {
      console.error('Failed to parse exam response:', content.slice(0, 500));
      return errorResponse('api_error', 502);
    }

    // input.level overrides AI choice (e.g. quick exam forced to stage level).
    // Fall back to a sensible mid level when AI omits/garbles the field.
    const level =
      input.level ?? parsed.level ?? (input.category === 'toeic' ? 'medium' : 'A2');

    return NextResponse.json({
      questions: parsed.questions,
      level,
      category: input.category,
    });
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      return errorResponse('timeout', 504);
    }
    if (error instanceof TypeError) {
      return errorResponse('network_error', 502);
    }
    return errorResponse('api_error', 502);
  }
}
