import { NextResponse } from 'next/server';

import { reconcileStaminaInboxForUser } from '@/lib/billing/reconcile-stamina-inbox';
import { createAdminClient, createClient } from '@/lib/supabase/server';

type InboxRow = {
  id: string;
  kind: string;
  title: string;
  body: string;
  payload: unknown;
  read_at: string | null;
  claimed_at: string | null;
  created_at: string;
};

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false, message: '請先登入' }, { status: 401 });
    }

    const url = new URL(req.url);
    if (url.searchParams.get('reconcile') === '1' && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const admin = await createAdminClient();
        await reconcileStaminaInboxForUser(admin, user.id);
      } catch {
        // 補發失敗仍回傳列表
      }
    }

    const { data, error } = await supabase
      .from('profile_inbox_messages')
      .select('id, kind, title, body, payload, read_at, claimed_at, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(80);

    if (error) {
      if (error.code === '42P01' || /profile_inbox_messages/i.test(error.message)) {
        return NextResponse.json({
          ok: false,
          message:
            '收件匣尚未就緒，請套用 migration：supabase/migrations/20260605140000_profile_inbox.sql',
        });
      }
      return NextResponse.json({ ok: false, message: '無法載入收件匣' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, messages: (data ?? []) as InboxRow[] });
  } catch (e) {
    return NextResponse.json(
      { ok: false, message: e instanceof Error ? e.message : 'Inbox load failed' },
      { status: 500 },
    );
  }
}
