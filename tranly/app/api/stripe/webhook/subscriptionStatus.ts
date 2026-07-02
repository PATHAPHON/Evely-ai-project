import type Stripe from 'stripe';

/** Maps a Stripe subscription status to the profile's simplified access tier. */
export function subscriptionStatusToProfile(status: Stripe.Subscription.Status): 'active' | 'free' {
  return status === 'active' || status === 'trialing' ? 'active' : 'free';
}
