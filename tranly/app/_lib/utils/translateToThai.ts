/**
 * Client-side batch English→Thai translation via /api/translate (KKU DeepSeek).
 * Returns null when unauthenticated or on server error (callers fall back).
 */
export async function translateBatchToThai(texts: string[]): Promise<string[] | null> {
  if (texts.length === 0) return [];
  try {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts }),
    });
    if (!res.ok) return null;
    const data = await res.json() as { translations: string[] | null };
    return data.translations;
  } catch {
    return null;
  }
}
