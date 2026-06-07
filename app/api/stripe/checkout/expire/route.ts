import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { getStripeServer } from '@/lib/stripe/server';

/** 放棄嵌入式結帳時過期 Stripe session（例如關閉 Link 視窗後卡住） */
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    }

    const body = (await req.json()) as { sessionId?: string };
    const sessionId = body.sessionId?.trim();
    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    }

    const stripe = getStripeServer();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.metadata?.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (session.status === 'open') {
      try {
        await stripe.checkout.sessions.expire(sessionId);
      } catch {
        /* 可能已過期 */
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, message: e instanceof Error ? e.message : 'Expire failed' },
      { status: 500 },
    );
  }
}
