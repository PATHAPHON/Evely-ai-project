/**
 * Resolves the public, routable origin for Stripe redirects.
 * Ensures `0.0.0.0` (bind address from `next dev --hostname 0.0.0.0`)
 * is never used as a client redirect target.
 */
export function resolveOrigin(request: Request, clientOrigin?: string): string {
  // 1. Explicit origin sent from client window.location.origin
  if (clientOrigin && typeof clientOrigin === 'string') {
    try {
      const parsed = new URL(clientOrigin);
      if (
        (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
        parsed.hostname !== '0.0.0.0'
      ) {
        return parsed.origin;
      }
    } catch {
      // Ignore invalid URL
    }
  }

  // 2. Request Origin header
  const headerOrigin = request.headers.get('origin');
  if (headerOrigin) {
    try {
      const parsed = new URL(headerOrigin);
      if (parsed.hostname !== '0.0.0.0') {
        return parsed.origin;
      }
    } catch {
      // Ignore invalid URL
    }
  }

  // 3. Reverse proxy / tunnel forwarded headers (e.g. Vercel, ngrok, localtunnel)
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
  if (forwardedHost && !forwardedHost.startsWith('0.0.0.0')) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  // 4. Host header
  const host = request.headers.get('host');
  if (host && !host.startsWith('0.0.0.0')) {
    const proto = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https';
    return `${proto}://${host}`;
  }

  // 5. Fallback from request.url, explicitly replacing 0.0.0.0 with localhost
  try {
    const parsed = new URL(request.url);
    if (parsed.hostname === '0.0.0.0') {
      parsed.hostname = 'localhost';
    }
    return parsed.origin;
  } catch {
    return 'http://localhost:3000';
  }
}
