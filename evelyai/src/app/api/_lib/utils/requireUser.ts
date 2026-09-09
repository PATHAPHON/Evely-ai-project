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

export interface RequestUser {
  id: string;
  isPremium: boolean;
  isUnlimited: boolean;
}

/**
 * Returns the authenticated user with premium and unlimited status, or null if unauthenticated.
 * Reads subscription_status and handle from profiles table.
 */
export async function getRequestUser(): Promise<RequestUser | null> {
  try {
    const supabase = await getServerClient();
    if (!supabase) return null;

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return null;

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('subscription_status, handle')
      .eq('id', user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.warn('getRequestUser: profile lookup warning:', profileError);
    }

    const isUnlimited = profile?.subscription_status === 'unlimited' || profile?.handle === 'admin';
    const isPremium = isUnlimited || profile?.subscription_status === 'active';

    return {
      id: user.id,
      isPremium,
      isUnlimited,
    };
  } catch (err) {
    console.error('getRequestUser unexpected error:', err);
    return null;
  }
}

/**
 * Check if the caller has remaining token budget for today.
 * Unlimited users always pass.
 * Resets daily spend when the date has changed.
 */
export async function checkBudget(limitMicrobaht: number, isUnlimited = false): Promise<boolean> {
  if (isUnlimited) return true;
  try {
    const supabase = await getServerClient();
    if (!supabase) return false;

    const { data, error } = await supabase.rpc('check_budget', {
      p_limit_microbaht: limitMicrobaht,
    });
    if (error) {
      console.error('check_budget failed:', error);
      return false; // fail-closed: block if DB error
    }
    return Boolean(data);
  } catch (err) {
    console.error('checkBudget unexpected error:', err);
    return false;
  }
}

/**
 * Debit token cost from today's budget. Call after the LLM responds.
 * Fails silently — overspend by one request is acceptable.
 */
export async function debitBudget(costMicrobaht: number): Promise<void> {
  try {
    const supabase = await getServerClient();
    if (!supabase) return;

    const { error } = await supabase.rpc('debit_budget', {
      p_cost_microbaht: costMicrobaht,
    });
    if (error) console.error('debit_budget failed:', error);
  } catch (err) {
    console.error('debitBudget unexpected error:', err);
  }
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
