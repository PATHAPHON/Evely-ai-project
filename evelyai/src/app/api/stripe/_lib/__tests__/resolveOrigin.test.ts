import { describe, it, expect } from 'vitest';
import { resolveOrigin } from '../resolveOrigin';

describe('resolveOrigin', () => {
  it('uses clientOrigin when provided and valid', () => {
    const req = new Request('http://0.0.0.0:3000/api/stripe/create-checkout-session');
    const origin = resolveOrigin(req, 'http://localhost:3000');
    expect(origin).toBe('http://localhost:3000');
  });

  it('rejects 0.0.0.0 in clientOrigin and falls back to safe origin', () => {
    const req = new Request('http://0.0.0.0:3000/api/stripe/create-checkout-session');
    const origin = resolveOrigin(req, 'http://0.0.0.0:3000');
    expect(origin).toBe('http://localhost:3000');
  });

  it('uses request header origin if valid', () => {
    const req = new Request('http://0.0.0.0:3000/api/stripe/create-checkout-session', {
      headers: { origin: 'https://evelyai.com' },
    });
    const origin = resolveOrigin(req);
    expect(origin).toBe('https://evelyai.com');
  });

  it('uses x-forwarded-host and x-forwarded-proto when available', () => {
    const req = new Request('http://0.0.0.0:3000/api/stripe/create-checkout-session', {
      headers: {
        'x-forwarded-host': 'evely-ai.vercel.app',
        'x-forwarded-proto': 'https',
      },
    });
    const origin = resolveOrigin(req);
    expect(origin).toBe('https://evely-ai.vercel.app');
  });

  it('replaces 0.0.0.0 hostname with localhost in fallback URL', () => {
    const req = new Request('http://0.0.0.0:3000/api/stripe/create-checkout-session');
    const origin = resolveOrigin(req);
    expect(origin).toBe('http://localhost:3000');
  });

  it('supports LAN IP origins', () => {
    const req = new Request('http://0.0.0.0:3000/api/stripe/create-checkout-session');
    const origin = resolveOrigin(req, 'http://10.10.0.181:3000');
    expect(origin).toBe('http://10.10.0.181:3000');
  });
});
