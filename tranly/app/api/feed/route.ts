import { NextRequest, NextResponse } from 'next/server';
import { parseFeedResponse } from './parseFeedResponse';
import type {
  FeedSuccessResponse,
  FeedErrorResponse,
  FeedWord,
} from '@/app/home/_lib/types';
import type { TargetLanguage } from '@/app/_lib/wordTypes';

const KKU_API_URL = 'https://gen.ai.kku.ac.th/api/v1/chat/completions';
const API_TIMEOUT_MS = 30_000;

const VALID_LANGUAGES: TargetLanguage[] = ['english', 'japanese', 'korean', 'chinese'];

type FeedErrorType = FeedErrorResponse['error']['type'];

const ERROR_MESSAGES: Record<FeedErrorType, string> = {
  invalid_input: 'Invalid input.',
  api_error: 'Failed to generate word. Please try again.',
  rate_limit: 'Too many requests. Please wait a moment.',
  timeout: 'Connection timed out. Please try again.',
  network_error: 'Cannot connect. Please check your internet.',
};

function errorResponse(
  type: FeedErrorType,
  status: number
): NextResponse<FeedErrorResponse> {
  return NextResponse.json(
    { error: { type, message: ERROR_MESSAGES[type] } },
    { status }
  );
}

/**
 * Validate that the request body has the expected shape:
 * - language: TargetLanguage
 * - excludeWords: string[]
 * - count: positive integer
 */
function validateInput(
  body: unknown
): { language: TargetLanguage; excludeWords: string[]; count: number; topic?: string } | null {
  if (typeof body !== 'object' || body === null) return null;

  const record = body as Record<string, unknown>;

  // language must be a valid TargetLanguage
  if (typeof record.language !== 'string') return null;
  if (!VALID_LANGUAGES.includes(record.language as TargetLanguage)) return null;

  // excludeWords must be an array of strings
  if (!Array.isArray(record.excludeWords)) return null;
  if (!record.excludeWords.every((item) => typeof item === 'string'))
    return null;

  // count must be a positive integer
  if (typeof record.count !== 'number') return null;
  if (!Number.isInteger(record.count) || record.count <= 0) return null;

  const topic = typeof record.topic === 'string' ? record.topic : undefined;

  return {
    language: record.language as TargetLanguage,
    excludeWords: record.excludeWords as string[],
    count: record.count,
    topic,
  };
}

/**
 * Build a language-specific prompt for vocabulary generation.
 */
function buildPrompt(language: TargetLanguage, count: number, exclusionText: string, topic?: string): string {
  const topicInstruction = topic ? `about the topic "${topic}" ` : '';
  switch (language) {
    case 'korean':
      return (
        `Generate ${count} Korean vocabulary words ${topicInstruction}for a language learner. ` +
        exclusionText +
        'Reply with ONLY a raw JSON array (no markdown, no code fences, no prose, no leading/trailing text). ' +
        'Each element must have this schema: {"korean":"<Korean word in Hangul>","reading":"<Korean pronunciation written in Thai script>","romanization":"<Korean pronunciation in Revised Romanization>","english":"<English translation>","thai":"<Thai translation>","part_of_speech":"<part of speech in Thai, e.g. คำนาม, คำกริยา, คำคุณศัพท์, คำสรรพนาม, คำวิเศษณ์>","image_queries":["<English search query for a clean, isolated version on a solid white background, e.g. \\"red apple isolated on white background\\">", "<English query for a 3D icon version on white background, e.g. \\"3D red apple sticker style isolated on white background\\">", "<English query for another isolated version, e.g. \\"sliced apple isolated on white background\\">"]}. ' +
        'Example: [{"korean":"사과","reading":"ซากวา","romanization":"sagwa","english":"apple","thai":"แอปเปิ้ล","part_of_speech":"คำนาม","image_queries":["red apple isolated on white background","3D red apple icon isolated on white background","sliced apple isolated on white background"]}]. ' +
        'Return ONLY the JSON array and nothing else.'
      );
    case 'japanese':
      return (
        `Generate ${count} Japanese vocabulary words ${topicInstruction}for a language learner. ` +
        exclusionText +
        'Reply with ONLY a raw JSON array (no markdown, no code fences, no prose, no leading/trailing text). ' +
        'Each element must have this schema: {"kanji":"<word in kanji>","hiragana":"<hiragana reading>","romaji":"<romaji pronunciation>","english":"<English translation>","thai":"<Thai translation>","part_of_speech":"<part of speech in Thai, e.g. คำนาม, คำกริยา, คำคุณศัพท์, คำสรรพนาม, คำวิเศษณ์>","image_queries":["<English search query for a clean, isolated version on a solid white background, e.g. \\"cute cat isolated on white background\\">", "<English query for a 3D icon version on white background, e.g. \\"3D cat icon isolated on white background\\">", "<English query for another isolated version, e.g. \\"white kitten isolated on white background\\">"]}. ' +
        'Example: [{"kanji":"猫","hiragana":"ねこ","romaji":"neko","english":"cat","thai":"แมว","part_of_speech":"คำนาม","image_queries":["cute cat isolated on white background","3D cat icon isolated on white background","white kitten isolated on white background"]}]. ' +
        'Return ONLY the JSON array and nothing else.'
      );
    case 'chinese':
      return (
        `Generate ${count} Chinese vocabulary words ${topicInstruction}for a language learner. ` +
        exclusionText +
        'Reply with ONLY a raw JSON array (no markdown, no code fences, no prose, no leading/trailing text). ' +
        'Each element must have this schema: {"hanzi":"<word in Chinese characters>","pinyin":"<pinyin with tone marks>","english":"<English translation>","thai":"<Thai translation>","part_of_speech":"<part of speech in Thai, e.g. คำนาม, คำกริยา, คำคุณศัพท์, คำสรรพนาม, คำวิเศษณ์>","image_queries":["<English search query for a clean, isolated version on a solid white background, e.g. \\"cute cat isolated on white background\\">", "<English query for a 3D icon version on white background, e.g. \\"3D cat icon isolated on white background\\">", "<English query for another isolated version, e.g. \\"white kitten isolated on white background\\">"]}. ' +
        'Example: [{"hanzi":"猫","pinyin":"māo","english":"cat","thai":"แมว","part_of_speech":"คำนาม","image_queries":["cute cat isolated on white background","3D cat icon isolated on white background","white kitten isolated on white background"]}]. ' +
        'Return ONLY the JSON array and nothing else.'
      );
    case 'english':
      return (
        `Generate ${count} English vocabulary words ${topicInstruction}for a language learner. ` +
        exclusionText +
        'Reply with ONLY a raw JSON array (no markdown, no code fences, no prose, no leading/trailing text). ' +
        'Each element must have this schema: {"word":"<English word>","ipa":"<IPA phonetic transcription>","thai":"<Thai translation>","part_of_speech":"<part of speech in Thai, e.g. คำนาม, คำกริยา, คำคุณศัพท์, คำสรรพนาม, คำวิเศษณ์>","image_queries":["<English search query for a clean, isolated version on a solid white background, e.g. \\"cute cat isolated on white background\\">", "<English query for a 3D icon version on white background, e.g. \\"3D cat icon isolated on white background\\">", "<English query for another isolated version, e.g. \\"white kitten isolated on white background\\">"]}. ' +
        'Example: [{"word":"cat","ipa":"/kæt/","thai":"แมว","part_of_speech":"คำนาม","image_queries":["cute cat isolated on white background","3D cat icon isolated on white background","white kitten isolated on white background"]}]. ' +
        'Return ONLY the JSON array and nothing else.'
      );
  }
}

function getProcessedQuery(query: string): string {
  const qLower = query.toLowerCase();
  if (
    !qLower.includes('white background') &&
    !qLower.includes('isolated') &&
    !qLower.includes('transparent')
  ) {
    return `${query} isolated on white background`;
  }
  return query;
}

async function fetchPexelsImage(query: string): Promise<string | null> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    console.log('PEXELS_API_KEY is not set. Skipping Pexels search.');
    return null;
  }

  const processedQuery = getProcessedQuery(query);

  try {
    const response = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(processedQuery)}&per_page=1`,
      {
        headers: {
          Authorization: apiKey,
        },
      }
    );

    if (!response.ok) {
      console.error(`Pexels API error: [${response.status}]`);
      return null;
    }

    const data = await response.json();
    const photo = data?.photos?.[0];
    if (photo?.src?.large) {
      return photo.src.large;
    }
    if (photo?.src?.medium) {
      return photo.src.medium;
    }
    return null;
  } catch (error) {
    console.error('Failed to fetch from Pexels API:', error);
    return null;
  }
}

function getEnglishWord(word: FeedWord): string {
  if (word.language === 'english') {
    return word.word;
  }
  return word.english || word.thai;
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<FeedSuccessResponse | FeedErrorResponse>> {
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

  const { language, excludeWords, count, topic } = input;

  // Read custom API key and model from request headers (user-provided config)
  const customApiKey = request.headers.get('x-custom-api-key');
  const customModel = request.headers.get('x-custom-model');

  // Use custom API key provided in request headers (fallback to server key)
  const apiKey = customApiKey || process.env.KKU_API_KEY;
  if (!apiKey) {
    return errorResponse('api_error', 401);
  }

  // Build exclusion instruction
  const exclusionText =
    excludeWords.length > 0
      ? `Do NOT include any of these words: ${excludeWords.join(', ')}. `
      : '';

  // Use custom model if provided, otherwise fall back to default
  const model = customModel || 'deepseek-v4-flash';

  // Build language-specific prompt
  const promptText = buildPrompt(language, count, exclusionText, topic);


  // Construct KKU IntelSphere API request
  const requestBody = {
    model,
    messages: [
      {
        role: 'user' as const,
        content: [
          {
            type: 'text' as const,
            text: promptText,
          },
        ],
      },
    ],
    max_tokens: 4096,
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

    // Parse the feed response content into FeedWord[]
    const words = parseFeedResponse(content, language);

    if (words.length === 0) {
      console.error('Failed to parse any words from content:', content);
      return errorResponse('api_error', 502);
    }

    // Fetch image URLs for each word
    const wordsWithImages = await Promise.all(
      words.map(async (word) => {
        const queries = word.imageQueries || [];
        const imageUrls: string[] = [];

        for (const query of queries) {
          let imageUrl: string | undefined;
          const processedQuery = getProcessedQuery(query);

          if (process.env.PEXELS_API_KEY) {
            const pexelsUrl = await fetchPexelsImage(query);
            if (pexelsUrl) {
              imageUrl = pexelsUrl;
            }
          }

          // Fallback to LoremFlickr search if Pexels key is not set or Pexels returns no image
          if (!imageUrl) {
            imageUrl = `https://loremflickr.com/600/400/${encodeURIComponent(processedQuery)}`;
          }

          imageUrls.push(imageUrl);
        }

        return {
          ...word,
          imageUrl: imageUrls[0],
          imageUrls,
        };
      })
    );

    return NextResponse.json({ words: wordsWithImages }, { status: 200 });
  } catch (error: unknown) {
    clearTimeout(timeoutId);

    // Handle timeout (AbortError)
    if (error instanceof Error && error.name === 'AbortError') {
      return errorResponse('timeout', 504);
    }

    // Handle network errors (TypeError from fetch)
    if (error instanceof TypeError) {
      return errorResponse('network_error', 502);
    }

    // Fallback to api_error
    return errorResponse('api_error', 502);
  }
}
