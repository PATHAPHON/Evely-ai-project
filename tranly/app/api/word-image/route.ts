import { NextRequest, NextResponse } from 'next/server';
import { getProcessedQuery, fetchPexelsImage } from '@/app/api/_lib/pexels';

const MAX_WORD_LENGTH = 100;

interface WordImageErrorResponse {
  error: { type: 'invalid_input'; message: string };
}

interface WordImageSuccessResponse {
  imageUrl: string;
}

function errorResponse(message: string): NextResponse<WordImageErrorResponse> {
  return NextResponse.json(
    { error: { type: 'invalid_input' as const, message } },
    { status: 400 }
  );
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<WordImageSuccessResponse | WordImageErrorResponse>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON body.');
  }

  const word =
    typeof (body as { word?: unknown })?.word === 'string'
      ? (body as { word: string }).word.trim()
      : '';

  if (!word || word.length > MAX_WORD_LENGTH) {
    return errorResponse('Field "word" must be a non-empty string.');
  }

  let imageUrl = await fetchPexelsImage(word);

  // Fallback to LoremFlickr search if Pexels key is not set or Pexels returns no image
  if (!imageUrl) {
    imageUrl = `https://loremflickr.com/600/400/${encodeURIComponent(getProcessedQuery(word))}`;
  }

  return NextResponse.json({ imageUrl });
}
