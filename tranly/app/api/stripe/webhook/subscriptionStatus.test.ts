import { describe, it, expect } from 'vitest';
import { subscriptionStatusToProfile } from './subscriptionStatus';

describe('subscriptionStatusToProfile', () => {
  it('maps active and trialing to active', () => {
    expect(subscriptionStatusToProfile('active')).toBe('active');
    expect(subscriptionStatusToProfile('trialing')).toBe('active');
  });

  it('maps past_due, canceled, unpaid, and incomplete states to free', () => {
    expect(subscriptionStatusToProfile('past_due')).toBe('free');
    expect(subscriptionStatusToProfile('canceled')).toBe('free');
    expect(subscriptionStatusToProfile('unpaid')).toBe('free');
    expect(subscriptionStatusToProfile('incomplete')).toBe('free');
    expect(subscriptionStatusToProfile('incomplete_expired')).toBe('free');
    expect(subscriptionStatusToProfile('paused')).toBe('free');
  });
});
