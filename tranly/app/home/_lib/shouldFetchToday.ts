import { supabase } from '@/app/_lib/supabaseClient';
import type { TargetLanguage } from '@/app/_lib/wordTypes';

function getTodayDateKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getRetentionCutoffDate(): string {
  const now = new Date();
  now.setDate(now.getDate() - 30);
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Deletes feed word records older than 30 days for the given language.
 */
async function cleanupOldRecords(
  userId: string,
  language: TargetLanguage
): Promise<void> {
  const cutoffDate = getRetentionCutoffDate();
  try {
    await supabase
      .from('feed_words')
      .delete()
      .eq('user_id', userId)
      .eq('language', language)
      .lt('generated_date', cutoffDate);
  } catch (err) {
    console.error('Failed to cleanup old feed words:', err);
  }
}

/**
 * Returns `true` if no records with today's generatedDate exist for the given language
 * in the feed-words table in Supabase, meaning new words should be fetched from the API.
 *
 * Also performs cleanup of records older than 30 days for the given language.
 */
export async function shouldFetchToday(language: TargetLanguage): Promise<boolean> {
  try {
    const userRes = await supabase.auth.getUser();
    const userId = userRes.data.user?.id;
    if (!userId) return true;

    const todayKey = getTodayDateKey();

    // Query entries count for today and this language in Supabase
    const { count, error } = await supabase
      .from('feed_words')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('language', language)
      .eq('generated_date', todayKey);

    if (error) {
      throw error;
    }

    // Perform 30-day retention cleanup in the background
    cleanupOldRecords(userId, language).catch(() => {});

    return (count || 0) === 0;
  } catch (err) {
    console.error('Failed check shouldFetchToday:', err);
    return true;
  }
}
