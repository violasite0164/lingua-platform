import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPublicSiteOriginFromRequest } from '@/lib/site-url';

/**
 * OAuth callback handler
 *
 * Flow:
 *  1. Supabase redirects here after Google consent with ?code=...
 *  2. exchangeCodeForSession() converts the code → session cookies
 *  3. User is forwarded to their original destination (or /dashboard)
 *
 * Also handles email confirmation links (?token_hash + type).
 */
export async function GET(request: NextRequest) {
  const origin = getPublicSiteOriginFromRequest(request);
  const { searchParams } = new URL(request.url);

  const code       = searchParams.get('code');
  const tokenHash  = searchParams.get('token_hash');
  const type       = searchParams.get('type') as Parameters<
    Awaited<ReturnType<typeof createClient>>['auth']['verifyOtp']
  >[0]['type'] | null;
  const redirectTo = searchParams.get('redirect') ?? '/dashboard';

  const supabase = await createClient();

  // ── OAuth PKCE code exchange ───────────────────────────────
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('[auth/callback] exchangeCodeForSession error:', error.message);
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent('登入失敗，請重試。')}`,
      );
    }

    return NextResponse.redirect(`${origin}${redirectTo}`);
  }

  // ── Email confirmation / magic-link ───────────────────────
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    } as Parameters<Awaited<ReturnType<typeof createClient>>['auth']['verifyOtp']>[0]);

    if (error) {
      console.error('[auth/callback] verifyOtp error:', error.message);
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent('連結已失效，請重新申請。')}`,
      );
    }

    return NextResponse.redirect(`${origin}${redirectTo}`);
  }

  // ── Fallback: no valid params ──────────────────────────────
  return NextResponse.redirect(`${origin}/login`);
}
