import { NextRequest } from 'next/server';

/**
 * Returns the canonical base URL for the application.
 * Handles reverse proxies (Hostinger, Cloudflare, Vercel, Docker)
 * and prevents accidental redirects to internal 0.0.0.0:3000 / localhost.
 */
export function getBaseUrl(request?: NextRequest): string {
  // 1. Explicit environment variable takes highest precedence
  if (process.env.NEXT_PUBLIC_APP_URL && process.env.NEXT_PUBLIC_APP_URL.trim() !== '') {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, '');
  }

  // 2. Check incoming request headers
  if (request) {
    // Reverse proxy forwarded headers
    const forwardedHost = request.headers.get('x-forwarded-host');
    const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
    if (forwardedHost && !forwardedHost.includes('0.0.0.0') && !forwardedHost.includes('127.0.0.1')) {
      return `${forwardedProto}://${forwardedHost}`;
    }

    // Host header
    const host = request.headers.get('host');
    if (host && !host.includes('0.0.0.0') && !host.includes('127.0.0.1')) {
      const proto = host.includes('localhost') ? 'http' : 'https';
      return `${proto}://${host}`;
    }
  }

  // 3. Fallback to production live domain
  return 'https://game.khabarmonkey.com';
}
