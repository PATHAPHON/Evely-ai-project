import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import Stripe from 'stripe';

import { resolveOrigin } from '../_lib/resolveOrigin';

export async function POST(request: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID;
  if (!secretKey || !priceId) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
  }

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

  let body: { origin?: string; returnPath?: string } = {};
  try {
    body = await request.json();
  } catch {
    // Empty body is acceptable
  }

  const rawPath = body.returnPath || '/profile/usage';
  const returnPath = rawPath.startsWith('/') && !rawPath.startsWith('//') ? rawPath : '/profile/usage';

  // ponytail: mock mode — swap for real Stripe call when sk_test_mock replaced
  if (secretKey === 'sk_test_mock') {
    return NextResponse.json({ url: `${returnPath}?checkout=success&mock=1` });
  }

  try {
    const stripe = new Stripe(secretKey);
    const origin = resolveOrigin(request, body.origin);

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: user.email,
      metadata: { supabase_user_id: user.id },
      // Also stash on the subscription itself so subscription.updated/deleted
      // events can match a profile even if they arrive before this checkout
      // session's own webhook (Stripe doesn't guarantee delivery order).
      subscription_data: { metadata: { supabase_user_id: user.id } },
      success_url: `${origin}${returnPath}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}${returnPath}`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('Failed to create Stripe checkout session:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
