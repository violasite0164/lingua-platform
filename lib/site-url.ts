import type { NextRequest } from 'next/server';

function normalizeOrigin(url: string): string {
  return url.trim().replace(/\/$/, '');
}

/**
 * Canonical public URL of the app (no trailing slash).
 * Set NEXT_PUBLIC_APP_URL in production so OAuth redirects match your domain.
 */
export function getPublicSiteOriginFromRequest(request: NextRequest): string {
  const env = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (env) return normalizeOrigin(env);

  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto =
    request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() ?? 'https';
  if (forwardedHost) {
    const host = forwardedHost.split(',')[0].trim();
    return normalizeOrigin(`${forwardedProto}://${host}`);
  }

  return normalizeOrigin(new URL(request.url).origin);
}

/** Client-only: prefer env so OAuth redirect matches deployed domain. */
export function getBrowserSiteOrigin(): string {
  const env = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (env) return normalizeOrigin(env);
  if (typeof window !== 'undefined') return normalizeOrigin(window.location.origin);
  return 'http://localhost:3000';
}
