import { NextResponse } from 'next/server';

import { verifyCheckoutSessionForUser } from '@/lib/billing/verify-checkout-session';
import { createAdminClient, createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    }

    const body = (await req.json()) as { sessionId?: string; autoClaimStamina?: boolean };
    const sessionId = body.sessionId?.trim();
    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }

    const admin = await createAdminClient();
    const result = await verifyCheckoutSessionForUser(
      sessionId,
      user.id,
      supabase,
      admin,
      { autoClaimStamina: body.autoClaimStamina === true },
    );

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { ok: false, message: e instanceof Error ? e.message : 'Verify failed' },
      { status: 500 },
    );
  }
}
