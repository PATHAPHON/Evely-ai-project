import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';

async function getServerClient(): Promise<SupabaseClient | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) return null;

  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll() { /* read-only in route handlers */ },
    },
  });
}

/**
 * Returns the authenticated user with premium status, or null if unauthenticated.
 * Reads subscription_status from profiles table.
 */
export async function getRequestUser(): Promise<{ id: string; isPremium: boolean } | null> {
  const supabase = await getServerClient();
  if (!supabase) return null;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status')
    .eq('id', user.id)
    .single();

  return {
    id: user.id,
    isPremium: profile?.subscription_status === 'active',
  };
}

/**
 * Check if the caller has remaining token budget for today.
 * Resets daily spend when the date has changed.
 */
export async function checkBudget(limitMicrobaht: number): Promise<boolean> {
  const supabase = await getServerClient();
  if (!supabase) return false;

  const { data, error } = await supabase.rpc('check_budget', {
    p_limit_microbaht: limitMicrobaht,
  });
  if (error) {
    console.error('check_budget failed:', error);
    return false; // fail-closed: block if DB error
  }
  return data as boolean;
}

/**
 * Debit token cost from today's budget. Call after the LLM responds.
 * Fails silently — overspend by one request is acceptable.
 */
export async function debitBudget(costMicrobaht: number): Promise<void> {
  const supabase = await getServerClient();
  if (!supabase) return;

  const { error } = await supabase.rpc('debit_budget', {
    p_cost_microbaht: costMicrobaht,
  });
  if (error) console.error('debit_budget failed:', error);
}

export function unauthorizedResponse() {
  return NextResponse.json(
    { error: { type: 'unauthorized', message: 'Session expired. Please sign in again.' } },
    { status: 401 }
  );
}

export function budgetExhaustedResponse() {
  return NextResponse.json(
    { error: { type: 'rate_limit', message: 'Daily AI budget exhausted. Upgrade to Premium for more.' } },
    { status: 429 }
  );
}
