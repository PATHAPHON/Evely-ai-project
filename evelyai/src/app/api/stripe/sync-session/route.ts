import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import Stripe from 'stripe';

function getServiceClient(): SupabaseClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return null;
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function POST(request: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll() { /* read-only in route handlers */ },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const serviceClient = getServiceClient();
  if (!serviceClient) {
    return NextResponse.json({ error: 'Supabase service role not configured' }, { status: 500 });
  }

  let body: { sessionId?: string; isMock?: boolean } = {};
  try {
    body = await request.json();
  } catch {
    // Empty body is acceptable if fallback check is used
  }

  // 1. Mock Mode handler
  if (secretKey === 'sk_test_mock' || body.isMock) {
    const thirtyDaysAhead = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const { error: updateErr } = await serviceClient
      .from('profiles')
      .update({
        subscription_status: 'active',
        subscription_current_period_end: thirtyDaysAhead,
      })
      .eq('id', user.id);

    if (updateErr) {
      console.error('Failed to update mock subscription:', updateErr);
      return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true, isPremium: true, mock: true });
  }

  // 2. Real Stripe session verification
  if (!secretKey) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
  }

  const { sessionId } = body;
  if (!sessionId) {
    return NextResponse.json({ error: 'Missing session ID' }, { status: 400 });
  }

  try {
    const stripe = new Stripe(secretKey);
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // Verify ownership: session belongs to current user
    const sessionUserId = session.metadata?.supabase_user_id;
    if (sessionUserId && sessionUserId !== user.id) {
      return NextResponse.json({ error: 'User mismatch' }, { status: 403 });
    }

    // Verify payment was successful
    if (session.payment_status !== 'paid' && session.status !== 'complete') {
      return NextResponse.json({ error: 'Session not completed' }, { status: 400 });
    }

    let periodEnd: string | null = null;
    if (session.subscription) {
      const subscription = await stripe.subscriptions.retrieve(
        session.subscription as string
      );
      const ts = subscription.items?.data?.[0]?.current_period_end;
      periodEnd = ts ? new Date(ts * 1000).toISOString() : null;
    }

    const { error: updateErr } = await serviceClient
      .from('profiles')
      .update({
        subscription_status: 'active',
        stripe_customer_id: session.customer as string,
        subscription_current_period_end: periodEnd,
      })
      .eq('id', user.id);

    if (updateErr) {
      console.error('Failed to update subscription profile:', updateErr);
      return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true, isPremium: true });
  } catch (err) {
    console.error('Failed to verify and sync Stripe session:', err);
    return NextResponse.json({ error: 'Failed to verify session' }, { status: 500 });
  }
}
