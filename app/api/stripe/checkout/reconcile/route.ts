import { NextResponse } from 'next/server';

import { reconcileStaminaInboxForUser } from '@/lib/billing/reconcile-stamina-inbox';
import { createAdminClient, createClient } from '@/lib/supabase/server';

/** 補送已付款體力包至收件匣（舊版 success=1 回跳或 webhook 遺漏時） */
export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ delivered: 0 });
    }

    const admin = await createAdminClient();
    const delivered = await reconcileStaminaInboxForUser(admin, user.id);
    return NextResponse.json({ delivered });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Reconcile failed' },
      { status: 500 },
    );
  }
}
