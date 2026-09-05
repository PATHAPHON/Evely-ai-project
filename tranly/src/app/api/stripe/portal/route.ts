import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import Stripe from 'stripe';

export async function POST(request: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single();

  const stripeCustomerId = profile?.stripe_customer_id;
  if (!stripeCustomerId) {
    return NextResponse.json({ error: 'No subscription found' }, { status: 400 });
  }

  // ponytail: mock mode
  if (secretKey === 'sk_test_mock') {
    return NextResponse.json({ url: '/profile?portal=mock' });
  }

  try {
    const stripe = new Stripe(secretKey);
    const origin = new URL(request.url).origin;

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${origin}/profile/billing`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (err) {
    console.error('Failed to create Stripe billing portal session:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to open billing portal' },
      { status: 500 }
    );
  }
}
