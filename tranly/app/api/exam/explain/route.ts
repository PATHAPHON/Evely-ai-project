import { NextRequest, NextResponse } from 'next/server';

const KKU_API_URL = 'https://gen.ai.kku.ac.th/api/v1/chat/completions';
const API_TIMEOUT_MS = 30_000;
const MAX_TEXT_LENGTH = 2_000;

type ExplainErrorType =
  | 'invalid_input'
  | 'api_error'
  | 'rate_limit'
  | 'timeout'
  | 'network_error';

const ERROR_MESSAGES: Record<ExplainErrorType, string> = {
  invalid_input: 'Invalid input.',
  api_error: 'Failed to generate explanation. Please try again.',
  rate_limit: 'Too many requests. Please wait a moment.',
  timeout: 'Connection timed out. Please try again.',
  network_error: 'Cannot connect. Please check your internet.',
};

interface ExplainErrorResponse {
  error: { type: ExplainErrorType; message: string };
}

interface ExplainSuccessResponse {
  explanation: string;
}

function errorResponse(
  type: ExplainErrorType,
  status: number
): NextResponse<ExplainErrorResponse> {
  return NextResponse.json(
    { error: { type, message: ERROR_MESSAGES[type] } },
    { status }
  );
}

interface ExplainRequest {
  context: string;
  question: string;
  choices: string[];
  correctIndex: number;
  selectedIndex: number;
}

function validateInput(body: unknown): ExplainRequest | null {
  if (typeof body !== 'object' || body === null) return null;
  const record = body as Record<string, unknown>;

  if (typeof record.context !== 'string') return null;
  if (typeof record.question !== 'string' || record.question.trim() === '')
    return null;
  if (record.context.length > MAX_TEXT_LENGTH) return null;
  if (record.question.length > MAX_TEXT_LENGTH) return null;

  if (
    !Array.isArray(record.choices) ||
    record.choices.length !== 4 ||
    !record.choices.every(
      (c) => typeof c === 'string' && c.length <= MAX_TEXT_LENGTH
    )
  )
    return null;

  const { correctIndex, selectedIndex } = record;
  if (
    typeof correctIndex !== 'number' ||
    typeof selectedIndex !== 'number' ||
    !Number.isInteger(correctIndex) ||
    !Number.isInteger(selectedIndex) ||
    correctIndex < 0 ||
    correctIndex > 3 ||
    selectedIndex < 0 ||
    selectedIndex > 3
  )
    return null;

  return {
    context: record.context.trim(),
    question: record.question.trim(),
    choices: record.choices as string[],
    correctIndex,
    selectedIndex,
  };
}

function buildExplainPrompt(input: ExplainRequest): string {
  const choiceList = input.choices
    .map((c, i) => `${i + 1}. ${c}${i === input.correctIndex ? ' (เฉลย)' : ''}`)
    .join('\n');
  const learnerPick = `${input.selectedIndex + 1}. ${input.choices[input.selectedIndex]}`;
  const verdict =
    input.selectedIndex === input.correctIndex
      ? 'ผู้เรียนตอบถูก'
      : 'ผู้เรียนตอบผิด';

  return (
    `คุณคือครูสอนภาษาอังกฤษสำหรับผู้เรียนชาวไทย จงอธิบายข้อสอบข้อนี้เป็นภาษาไทยแบบสั้น กระชับ (3-5 ประโยค)\n\n` +
    `เนื้อหา/บทอ่าน: ${input.context}\n` +
    `คำถาม: ${input.question}\n` +
    `ตัวเลือก:\n${choiceList}\n` +
    `${verdict} โดยเลือกข้อ ${learnerPick}\n\n` +
    `จงอธิบายว่าทำไมเฉลยจึงถูกต้อง` +
    (input.selectedIndex !== input.correctIndex
      ? ` และทำไมข้อที่ผู้เรียนเลือกจึงผิด`
      : '') +
    ` พร้อมแปลคำศัพท์/ประโยคสำคัญเป็นภาษาไทย ตอบเป็นข้อความธรรมดา ไม่ต้องใช้ markdown`
  );
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<ExplainSuccessResponse | ExplainErrorResponse>> {
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
        content: [{ type: 'text' as const, text: buildExplainPrompt(input) }],
      },
    ],
    max_tokens: 1024,
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

    const explanation = content?.trim();
    if (!explanation) {
      return errorResponse('api_error', 502);
    }

    return NextResponse.json({ explanation });
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
