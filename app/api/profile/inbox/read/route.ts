import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false, message: '請先登入' }, { status: 401 });
    }

    const now = new Date().toISOString();
    const { error } = await supabase
      .from('profile_inbox_messages')
      .update({ read_at: now } as never)
      .eq('user_id', user.id)
      .is('read_at', null);

    if (error) {
      return NextResponse.json({ ok: false, message: '無法更新已讀狀態' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, message: e instanceof Error ? e.message : 'Read failed' },
      { status: 500 },
    );
  }
}
