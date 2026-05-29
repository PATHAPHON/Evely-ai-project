import type {
  ExerciseType,
  LessonExercise,
  LessonSuccessResponse,
  MatchingPair,
} from '@/app/chat/_lib/lessonTypes';

const VALID_TYPES: ExerciseType[] = [
  'multiple_choice',
  'fill_blank',
  'matching',
  'listening',
];

/**
 * Attempt to parse a string as JSON. Returns null on failure.
 */
function tryParseJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function asTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizePairs(value: unknown): MatchingPair[] {
  if (!Array.isArray(value)) return [];
  const pairs: MatchingPair[] = [];
  for (const raw of value) {
    if (typeof raw !== 'object' || raw === null) continue;
    const rec = raw as Record<string, unknown>;
    const korean = asTrimmedString(rec.korean);
    const thai = asTrimmedString(rec.thai);
    if (korean.length > 0 && thai.length > 0) {
      pairs.push({ korean, thai });
    }
  }
  return pairs;
}

function normalizeOptions(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => asTrimmedString(item))
    .filter((item) => item.length > 0);
}

/**
 * Validate and normalize a single raw item into a LessonExercise.
 * Returns null when the item is malformed for its declared type.
 */
function normalizeExercise(raw: unknown): LessonExercise | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const rec = raw as Record<string, unknown>;

  const type = rec.type;
  if (typeof type !== 'string' || !VALID_TYPES.includes(type as ExerciseType)) {
    return null;
  }

  const prompt = asTrimmedString(rec.prompt);
  const korean = asTrimmedString(rec.korean);
  const reading = asTrimmedString(rec.reading);
  const romanization = asTrimmedString(rec.romanization);
  const translation = asTrimmedString(rec.translation);

  const base: LessonExercise = {
    id: crypto.randomUUID(),
    type: type as ExerciseType,
    prompt,
    korean: korean || undefined,
    reading: reading || undefined,
    romanization: romanization || undefined,
    translation: translation || undefined,
  };

  if (type === 'matching') {
    const pairs = normalizePairs(rec.pairs);
    if (pairs.length < 2) return null;
    return { ...base, pairs: pairs.slice(0, 4) };
  }

  // multiple_choice | fill_blank | listening all require options + answerIndex
  const options = normalizeOptions(rec.options);
  if (options.length < 2) return null;

  const answerIndex =
    typeof rec.answerIndex === 'number' ? rec.answerIndex : Number(rec.answerIndex);
  if (
    !Number.isInteger(answerIndex) ||
    answerIndex < 0 ||
    answerIndex >= options.length
  ) {
    return null;
  }

  // Listening needs Korean to synthesize; bail if missing.
  if (type === 'listening' && !korean) return null;

  return { ...base, options, answerIndex };
}

/**
 * Pull an array of raw exercise items out of an already-parsed JSON value.
 * Accepts either `{ exercises: [...] }` or a bare top-level array.
 */
function extractRawArray(parsed: unknown): unknown[] | null {
  if (Array.isArray(parsed)) return parsed;
  if (typeof parsed === 'object' && parsed !== null) {
    const exercises = (parsed as Record<string, unknown>).exercises;
    if (Array.isArray(exercises)) return exercises;
  }
  return null;
}

function buildFromRawArray(rawArray: unknown[]): LessonExercise[] {
  const exercises: LessonExercise[] = [];
  for (const raw of rawArray) {
    const normalized = normalizeExercise(raw);
    if (normalized) exercises.push(normalized);
  }
  return exercises;
}

/**
 * Parse the KKU API response content string into a LessonSuccessResponse.
 *
 * Handles markdown code fences, extra prose before/after the JSON, and
 * double-encoded (backslash-escaped) JSON. Malformed individual exercises are
 * dropped. Throws if no valid exercise can be recovered.
 */
export function parseLessonResponse(content: string): LessonSuccessResponse {
  if (!content || content.trim().length === 0) {
    throw new Error('Empty response content');
  }

  const trimmed = content.trim();

  // Try every ```...``` code block (thinking models emit multiple blocks).
  const fenceRe = /```(?:json)?\s*([\s\S]*?)\s*```/gi;
  let fenceMatch: RegExpExecArray | null;
  while ((fenceMatch = fenceRe.exec(trimmed)) !== null) {
    const parsed = tryParseJson(fenceMatch[1].trim());
    const rawArray = extractRawArray(parsed);
    if (rawArray) {
      const exercises = buildFromRawArray(rawArray);
      if (exercises.length > 0) return { exercises };
    }
  }

  // Handle double-encoded JSON (backslash-escaped quotes).
  let candidate = trimmed;
  if (/\\"/.test(candidate) && !/[^\\]"/.test(candidate.slice(0, 50))) {
    try {
      const unescaped = JSON.parse(`"${candidate.replace(/\n/g, '\\n')}"`);
      if (typeof unescaped === 'string') candidate = unescaped.trim();
    } catch {
      // fall through
    }
  }

  // Try parsing the whole content as JSON.
  const parsed = tryParseJson(candidate);
  const rawArray = extractRawArray(parsed);
  if (rawArray) {
    const exercises = buildFromRawArray(rawArray);
    if (exercises.length > 0) return { exercises };
  }

  // Last resort: locate the first bracketed array and parse it.
  const arrayStart = candidate.indexOf('[');
  const arrayEnd = candidate.lastIndexOf(']');
  if (arrayStart !== -1 && arrayEnd > arrayStart) {
    const slice = candidate.slice(arrayStart, arrayEnd + 1);
    const parsedSlice = tryParseJson(slice);
    if (Array.isArray(parsedSlice)) {
      const exercises = buildFromRawArray(parsedSlice);
      if (exercises.length > 0) return { exercises };
    }
  }

  throw new Error(
    'Invalid response format: no valid exercises found in lesson response'
  );
}
