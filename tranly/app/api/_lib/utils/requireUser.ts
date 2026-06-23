import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Builds a Supabase client bound to the request's session cookies.
 * Returns null when env config is missing.
 */
async function getServerClient(): Promise<SupabaseClient | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) return null;

  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {
        // read-only in route handlers — no-op
      },
    },
  });
}

/**
 * Reads the Supabase session from request cookies and returns the user.
 * Returns null if the user is not authenticated.
 */
export async function getRequestUser(): Promise<{ id: string } | null> {
  const supabase = await getServerClient();
  if (!supabase) return null;

  const { data: { user } } = await supabase.auth.getUser();
  return user ? { id: user.id } : null;
}

/**
 * Atomically consumes one unit of the caller's daily chat quota.
 * Returns the remaining units, or null when the quota is exhausted.
 */
export async function consumeChatQuota(dailyLimit: number): Promise<number | null> {
  const supabase = await getServerClient();
  if (!supabase) return null;

  const { data, error } = await supabase.rpc('consume_chat_quota', { p_limit: dailyLimit });
  if (error) {
    console.error('consume_chat_quota failed:', error);
    return null;
  }
  return data as number | null;
}

/** Shorthand: returns a 401 JSON response for unauthenticated requests. */
export function unauthorizedResponse() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
