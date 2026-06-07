import { NextResponse } from 'next/server';

import { expireStalePendingPurchases } from '@/lib/billing/expire-pending-purchases';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/** 定時將逾時的 pending 商店訂單標為 cancelled（建議每 5–10 分鐘呼叫一次） */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (secret) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'CRON_SECRET is required in production' },
      { status: 500 },
    );
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY' }, { status: 500 });
  }

  const admin = await createAdminClient();
  const result = await expireStalePendingPurchases(admin);

  return NextResponse.json({ ok: true, ...result });
}
