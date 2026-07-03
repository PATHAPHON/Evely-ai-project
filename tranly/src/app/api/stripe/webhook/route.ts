import { NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { subscriptionStatusToProfile } from './subscriptionStatus';

/**
 * Service-role Supabase client. Stripe calls this endpoint without auth cookies,
 * so we bypass RLS with the service role key to update profiles directly.
 */
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
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secretKey || !webhookSecret) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 400 });
  }

  const stripe = new Stripe(secretKey);
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig ?? '', webhookSecret);
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  // Idempotency check: if we've already processed this event, skip it.
  // The dedup row is only written after successful processing (below) so a
  // handler failure doesn't get treated as "already handled" on retry.
  const { data: existing } = await supabase
    .from('stripe_events')
    .select('id')
    .eq('id', event.id)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ received: true });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.supabase_user_id;

      let periodEnd: string | null = null;
      if (session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        );
        periodEnd = periodEndFromSubscription(subscription);
      }

      if (userId) {
        await supabase
          .from('profiles')
          .update({
            subscription_status: 'active',
            stripe_customer_id: session.customer,
            subscription_current_period_end: periodEnd,
          })
          .eq('id', userId);
      }
    } else if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription;
      await updateProfileForSubscription(supabase, subscription, {
        subscription_status: 'free',
      });
    } else if (event.type === 'customer.subscription.updated') {
      // Covers renewals, upgrades/downgrades, and payment failures
      // (past_due) — checkout.session.completed only fires once, so without
      // this handler none of those later transitions reach the profile.
      const subscription = event.data.object as Stripe.Subscription;
      await updateProfileForSubscription(supabase, subscription, {
        subscription_status: subscriptionStatusToProfile(subscription.status),
        subscription_current_period_end: periodEndFromSubscription(subscription),
      });
    }
  } catch (err) {
    console.error('Stripe webhook handler failed:', err);
    return NextResponse.json({ error: 'Handler error' }, { status: 500 });
  }

  // Mark processed only after the handler above succeeded. A duplicate insert
  // (23505) here just means a concurrent retry beat us to it — harmless.
  const { error: dedupError } = await supabase.from('stripe_events').insert({ id: event.id });
  if (dedupError && dedupError.code !== '23505') {
    console.error('Failed to record stripe_events dedup row:', dedupError);
  }

  return NextResponse.json({ received: true });
}

/** Stripe SDK v22+ moved current_period_end off the top-level Subscription
 * object and onto its items — read it from there instead of a stale field. */
function periodEndFromSubscription(sub: Stripe.Subscription): string | null {
  const ts = sub.items?.data?.[0]?.current_period_end;
  return ts ? new Date(ts * 1000).toISOString() : null;
}

/**
 * Updates the profile owning this subscription. Matches by stripe_customer_id
 * (set by checkout.session.completed) first; if Stripe delivers an updated/
 * deleted event before that handler has run (delivery order isn't guaranteed),
 * falls back to the supabase_user_id we stash in subscription metadata.
 */
async function updateProfileForSubscription(
  supabase: SupabaseClient,
  subscription: Stripe.Subscription,
  patch: Record<string, unknown>
): Promise<void> {
  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('stripe_customer_id', subscription.customer)
    .select('id');

  if (!error && data && data.length > 0) return;

  const userId = subscription.metadata?.supabase_user_id;
  if (!userId) return;

  await supabase.from('profiles').update(patch).eq('id', userId);
}
