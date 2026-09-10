import { NextRequest, NextResponse, after } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  getRequestUser,
  unauthorizedResponse,
  checkBudget,
  debitBudget,
} from '@/app/api/_lib/utils/requireUser';
import { DAILY_BUDGET_MICROBAHT, IMAGE_COST_MICROBAHT } from '@/app/api/_lib/utils/tokenCost';

export const maxDuration = 60;

function getAdminSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !serviceKey) return null;
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const user = await getRequestUser();
  if (!user) return unauthorizedResponse();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const rawWords = (body as { words?: unknown })?.words;
  if (!Array.isArray(rawWords) || rawWords.length === 0) {
    return NextResponse.json({ error: 'Missing or invalid words array' }, { status: 400 });
  }

  const wordMap = new Map<string, string | undefined>();
  for (const item of rawWords) {
    if (typeof item === 'string' && item.trim().length > 0) {
      const k = item.trim().toLowerCase();
      if (!wordMap.has(k)) wordMap.set(k, undefined);
    } else if (
      item &&
      typeof item === 'object' &&
      'word' in item &&
      typeof (item as { word: unknown }).word === 'string'
    ) {
      const obj = item as { word: string; thai?: string };
      const k = obj.word.trim().toLowerCase();
      if (k && !wordMap.has(k)) {
        wordMap.set(k, typeof obj.thai === 'string' ? obj.thai.trim() : undefined);
      }
    }
  }

  const normalizedWords = Array.from(wordMap.keys()).slice(0, 10);

  if (normalizedWords.length === 0) {
    return NextResponse.json({ images: {} }, { status: 200 });
  }

  const supabase = getAdminSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Database service unavailable' }, { status: 500 });
  }

  const imagesMap: Record<string, string> = {};

  // 1. Check existing cached images
  try {
    const { data: cached, error: selectError } = await supabase
      .from('word_images')
      .select('word, image_url')
      .in('word', normalizedWords);

    if (!selectError && cached) {
      for (const row of cached) {
        if (row.word && row.image_url) {
          imagesMap[row.word] = row.image_url;
        }
      }
    }
  } catch (err) {
    console.warn('[word-image] Failed to read cached images:', err);
  }

  // 2. Identify missing words that need generation
  const missingWords = normalizedWords.filter((w) => !imagesMap[w]);
  if (missingWords.length === 0) {
    return NextResponse.json({ images: imagesMap }, { status: 200 });
  }

  // Gate AI image generation by daily token budget
  const limit = user.isPremium ? DAILY_BUDGET_MICROBAHT.premium : DAILY_BUDGET_MICROBAHT.free;
  const hasBudget = await checkBudget(limit, user.isUnlimited);
  if (!hasBudget) {
    return NextResponse.json(
      { images: imagesMap },
      {
        status: 200,
        headers: {
          'X-Budget-Exhausted': '1',
        },
      }
    );
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error('[word-image] OPENROUTER_API_KEY not found');
    return NextResponse.json({ images: imagesMap }, { status: 200 });
  }

  // Cap batch generation to at most 2 images per request to prevent token spikes and latency
  const wordsToGenerate = missingWords.slice(0, 2);
  let generatedCount = 0;

  // 3. Generate missing images via OpenRouter with meta/muse-image
  await Promise.all(
    wordsToGenerate.map(async (word) => {
      try {
        const thai = wordMap.get(word);
        const context = thai ? `representing "${word}" (meaning in Thai: "${thai}")` : `representing "${word}"`;

        const prompt = [
          `Clean minimalist 2D flat vector graphic illustration ${context}.`,
          `ART DIRECTION:`,
          `- If "${word}" is an action, verb, activity, or emotion (e.g. run, eat, sleep, swim, talk, study, jump): illustrate a cute friendly 2D flat cartoon human character expressively performing that action in a playful modern language-learning game art style (NOT Duolingo owl mascot, but a charming cartoon person in clean flat 2D style).`,
          `- If "${word}" is a concrete object, animal, food, item, or noun (e.g. fish, toilet paper, apple, book, car): illustrate a bold, clean, minimalist 2D flat vector icon with simple geometric shapes, clean silhouette, and vibrant flat colors, instantly recognizable like a game icon.`,
          `- Style: strictly 2D flat vector art, bold clean geometric silhouettes, smooth curved edges, solid vibrant colors, subtle flat shading.`,
          `- Background: solid dark charcoal card background (#1e1f20), seamless matching hex color #1e1f20, centered isolated subject.`,
          `- Forbidden: NO 3D rendering, NO photorealism, NO text, NO labels, NO typography, NO letters. Pure 2D flat visual graphic only.`,
        ].join(' ');

        const res = await fetch('https://openrouter.ai/api/v1/images', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://evelyai.app',
            'X-Title': 'EvelyAI',
          },
          body: JSON.stringify({
            model: 'meta/muse-image',
            prompt,
            aspect_ratio: '1:1',
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          console.warn(`[word-image] Failed generation for "${word}": ${res.status} ${errText}`);
          return;
        }

        const data = await res.json();
        const item = data?.data?.[0];
        let imageBuffer: Buffer | null = null;

        if (item?.b64_json) {
          imageBuffer = Buffer.from(item.b64_json, 'base64');
        } else if (item?.url) {
          const fetchImg = await fetch(item.url);
          if (fetchImg.ok) {
            imageBuffer = Buffer.from(await fetchImg.arrayBuffer());
          }
        }

        if (!imageBuffer) {
          console.warn(`[word-image] No image data returned for "${word}"`);
          return;
        }

        // Upload to Supabase Storage bucket 'word-images'
        const safeWord = word.replace(/[^a-z0-9_-]/g, '_');
        const fileName = `${safeWord}_${Date.now()}.png`;

        const { error: uploadError } = await supabase.storage
          .from('word-images')
          .upload(fileName, imageBuffer, {
            contentType: 'image/png',
            upsert: true,
          });

        let finalUrl = '';
        if (!uploadError) {
          const { data: pubData } = supabase.storage
            .from('word-images')
            .getPublicUrl(fileName);
          finalUrl = pubData.publicUrl;
        } else {
          console.warn(`[word-image] Storage upload failed for "${word}":`, uploadError);
          if (item?.url) {
            finalUrl = item.url;
          } else if (item?.b64_json) {
            finalUrl = `data:image/png;base64,${item.b64_json}`;
          }
        }

        if (finalUrl) {
          imagesMap[word] = finalUrl;
          generatedCount++;

          // Save to database cache table
          await supabase.from('word_images').upsert(
            {
              word,
              image_url: finalUrl,
            },
            { onConflict: 'word' }
          );
        }
      } catch (err) {
        console.error(`[word-image] Error generating image for "${word}":`, err);
      }
    })
  );

  if (generatedCount > 0) {
    after(async () => {
      await debitBudget(generatedCount * IMAGE_COST_MICROBAHT);
    });
  }

  return NextResponse.json({ images: imagesMap }, { status: 200 });
}
