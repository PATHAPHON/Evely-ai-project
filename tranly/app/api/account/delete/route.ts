import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { getRequestUser, unauthorizedResponse } from '@/app/api/_lib/utils/requireUser';

export async function DELETE(): Promise<NextResponse> {
  const user = await getRequestUser();
  if (!user) return unauthorizedResponse();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('SUPABASE_SERVICE_ROLE_KEY is not set');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    // Cancel any Stripe subscription before wiping the profile row that
    // points at it — otherwise a deleted premium account keeps getting billed.
    // Best-effort: a Stripe hiccup here must not block account deletion.
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (secretKey && secretKey !== 'sk_test_mock') {
      try {
        const { data: profile } = await admin
          .from('profiles')
          .select('stripe_customer_id')
          .eq('id', user.id)
          .single();

        if (profile?.stripe_customer_id) {
          const stripe = new Stripe(secretKey);
          await stripe.customers.del(profile.stripe_customer_id);
        }
      } catch (stripeError) {
        console.error('Failed to cancel Stripe subscription during account deletion:', stripeError);
      }
    }

    // Delete user data before removing auth record
    await Promise.all([
      admin.from('words').delete().eq('user_id', user.id),
      admin.from('conversations').delete().eq('user_id', user.id),
      admin.from('word_progress').delete().eq('user_id', user.id),
      admin.from('profiles').delete().eq('id', user.id),
    ]);

    const { error: deleteErr } = await admin.auth.admin.deleteUser(user.id);
    if (deleteErr) throw deleteErr;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete account error:', error);
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }
}
