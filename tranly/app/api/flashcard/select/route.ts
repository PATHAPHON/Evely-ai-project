import { NextRequest, NextResponse } from 'next/server';

const KKU_API_URL = 'https://gen.ai.kku.ac.th/api/v1/chat/completions';
const API_TIMEOUT_MS = 25_000;
const MIN_PICK = 5;
const MAX_PICK = 10;

interface Candidate {
  id: string;
  korean: string;
  english?: string;
}

interface SelectResult {
  ids: string[];
  name?: string;
}

function tryParseJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

/** Shuffle a copy of the array (Fisher–Yates) and take 5–10 items. */
function randomPick(candidates: Candidate[]): string[] {
  const arr = [...candidates];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  const target = Math.min(MAX_PICK, Math.max(MIN_PICK, 0));
  return arr.slice(0, Math.min(target, arr.length)).map((c) => c.id);
}

/** Extract { ids, name } from the model output, keeping only valid candidate ids. */
function parseSelection(content: string, validIds: Set<string>): SelectResult | null {
  const trimmed = content.trim();
  let parsed = tryParseJson(trimmed);
  if (!parsed) {
    const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fence) parsed = tryParseJson(fence[1].trim());
  }
  if (!parsed) {
    const block = trimmed.match(/\{[\s\S]*\}/);
    if (block) parsed = tryParseJson(block[0]);
  }
  if (!parsed || typeof parsed !== 'object') return null;

  const rec = parsed as Record<string, unknown>;
  const rawIds = Array.isArray(rec.ids) ? rec.ids : [];
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const raw of rawIds) {
    if (typeof raw !== 'string') continue;
    const id = raw.trim();
    if (validIds.has(id) && !seen.has(id)) {
      seen.add(id);
      ids.push(id);
      if (ids.length >= MAX_PICK) break;
    }
  }
  if (ids.length === 0) return null;
  const name = typeof rec.name === 'string' ? rec.name.trim() : undefined;
  return { ids, name: name || undefined };
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

  const rawCandidates = (body as Record<string, unknown>).candidates;
  if (!Array.isArray(rawCandidates) || rawCandidates.length === 0) {
    return NextResponse.json({ error: 'No candidate words provided.' }, { status: 400 });
  }

  const candidates: Candidate[] = [];
  for (const c of rawCandidates) {
    if (typeof c !== 'object' || c === null) continue;
    const rec = c as Record<string, unknown>;
    if (typeof rec.id !== 'string' || typeof rec.korean !== 'string') continue;
    candidates.push({
      id: rec.id,
      korean: rec.korean,
      english: typeof rec.english === 'string' ? rec.english : undefined,
    });
  }
  if (candidates.length === 0) {
    return NextResponse.json({ error: 'No valid candidate words.' }, { status: 400 });
  }

  const validIds = new Set(candidates.map((c) => c.id));

  const customApiKey = request.headers.get('x-custom-api-key');
  const customModel = request.headers.get('x-custom-model');

  // Without an API key we can still serve a useful result by picking randomly.
  if (!customApiKey) {
    return NextResponse.json({ ids: randomPick(candidates) }, { status: 200 });
  }

  const wordListStr = candidates
    .map((c) => `{"id":"${c.id}","korean":"${c.korean}"${c.english ? `,"english":"${c.english}"` : ''}}`)
    .join(', ');

  const systemPrompt =
    `You are a Korean language teacher helping a Thai learner build a flashcard study set.\n` +
    `Here is a list of available vocabulary words (each with a unique id):\n` +
    `[${wordListStr}]\n\n` +
    `Pick between ${MIN_PICK} and ${MAX_PICK} words that fit well together as one coherent study set ` +
    `(e.g. same theme, topic, or similar difficulty). If there are fewer than ${MIN_PICK} words available, pick all of them.\n` +
    `Also suggest a short, natural Thai name for the set.\n\n` +
    `Reply with ONLY a raw JSON object (no markdown, no code fences, no prose). Exactly this structure:\n` +
    `{"ids":["<id>","<id>"],"name":"<short Thai set name, max 30 chars>"}\n` +
    `RULES:\n` +
    `- "ids" must contain ONLY ids from the provided list, with no duplicates.\n` +
    `- Pick at most ${MAX_PICK} ids.\n` +
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
        Authorization: `Bearer ${customApiKey}`,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      // Degrade gracefully so the button always works.
      return NextResponse.json({ ids: randomPick(candidates) }, { status: 200 });
    }

    const responseText = await response.text();
    let content: string | undefined;
    try {
      const data = JSON.parse(responseText);
      content = data?.choices?.[0]?.message?.content || data?.content;
    } catch {
      content = responseText;
    }

    const result = content ? parseSelection(content, validIds) : null;
    if (result) {
      return NextResponse.json(result, { status: 200 });
    }
    // Parsing failed → fallback random.
    return NextResponse.json({ ids: randomPick(candidates) }, { status: 200 });
  } catch {
    clearTimeout(timeoutId);
    return NextResponse.json({ ids: randomPick(candidates) }, { status: 200 });
  }
}
