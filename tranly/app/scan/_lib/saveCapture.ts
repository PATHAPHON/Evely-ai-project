import { supabase } from '@/app/_lib/supabaseClient';

/**
 * Uploads capture image and logs the AI OCR result to Supabase.
 */
export async function saveCaptureRecord(
  imageBlob: Blob,
  ocrResult: object
): Promise<string> {
  const userRes = await supabase.auth.getUser();
  const userId = userRes.data.user?.id;
  if (!userId) {
    throw new Error('User not authenticated.');
  }

  const id = crypto.randomUUID();
  const filePath = `authenticated/${userId}/captures/${id}.png`;

  // 1. Upload image to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('tarnly-media')
    .upload(filePath, imageBlob, {
      contentType: 'image/png',
      upsert: true,
    });

  if (uploadError) {
    throw uploadError;
  }

  // 2. Get Public URL
  const { data: { publicUrl } } = supabase.storage
    .from('tarnly-media')
    .getPublicUrl(filePath);

  // 3. Insert record in captures table
  const { error: dbError } = await supabase.from('captures').insert({
    id,
    user_id: userId,
    image_path: publicUrl,
    ocr_result: ocrResult,
    created_at: new Date().toISOString(),
  });

  if (dbError) {
    throw dbError;
  }

  return id;
}
