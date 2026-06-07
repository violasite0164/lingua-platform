import { NextResponse } from 'next/server';

import { claimInboxStaminaPack } from '@/lib/billing/claim-inbox-stamina';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false, message: '請先登入' }, { status: 401 });
    }

    const body = (await req.json()) as { messageId?: string };
    const messageId = body.messageId?.trim();
    if (!messageId) {
      return NextResponse.json({ ok: false, message: '缺少 messageId' }, { status: 400 });
    }

    const result = await claimInboxStaminaPack(supabase, user.id, messageId);
    if (!result.ok) {
      const status = result.message === '找不到此道具' ? 404 : 400;
      return NextResponse.json({ ok: false, message: result.message }, { status });
    }

    return NextResponse.json({
      ok: true,
      granted: result.granted,
      stamina: result.stamina,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, message: e instanceof Error ? e.message : 'Claim failed' },
      { status: 500 },
    );
  }
}
