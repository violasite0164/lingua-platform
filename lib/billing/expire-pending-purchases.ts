import type { SupabaseClient } from '@supabase/supabase-js';

import { PENDING_PURCHASE_TTL_MS } from '@/lib/billing/pending-purchase-ttl';
import { getStripeServer } from '@/lib/stripe/server';

export type ExpirePendingPurchasesResult = {
  scanned: number;
  cancelled: number;
};

/**
 * 將超過 TTL 仍為 pending 的商店訂單標為 cancelled。
 * 這些多半是開啟結帳（含遊戲內嵌付款）後未完成的 session。
 */
export async function expireStalePendingPurchases(
  adminSupabase: SupabaseClient,
  options?: { userId?: string; limit?: number },
): Promise<ExpirePendingPurchasesResult> {
  const cutoff = new Date(Date.now() - PENDING_PURCHASE_TTL_MS).toISOString();
  const limit = options?.limit ?? 200;

  let query = adminSupabase
    .from('user_purchases')
    .select('id, stripe_checkout_session_id')
    .eq('status', 'pending')
    .eq('kind', 'shop_item')
    .lt('created_at', cutoff)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (options?.userId) {
    query = query.eq('user_id', options.userId);
  }

  const { data: rows, error } = await query;
  if (error) {
    console.error('[expireStalePendingPurchases]', error.message);
    return { scanned: 0, cancelled: 0 };
  }

  if (!rows?.length) {
    return { scanned: 0, cancelled: 0 };
  }

  let stripe: ReturnType<typeof getStripeServer> | null = null;
  try {
    stripe = getStripeServer();
  } catch {
    stripe = null;
  }

  let cancelled = 0;
  for (const row of rows) {
    const sessionId = row.stripe_checkout_session_id;
    if (stripe && sessionId) {
      try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        if (session.status === 'complete') {
          continue;
        }
        if (session.status === 'open') {
          try {
            await stripe.checkout.sessions.expire(sessionId);
          } catch {
            /* session 可能已過期 */
          }
        }
      } catch {
        /* 找不到 session 仍標記取消 */
      }
    }

    const { error: updErr } = await adminSupabase
      .from('user_purchases')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() } as never)
      .eq('id', row.id)
      .eq('status', 'pending');

    if (!updErr) cancelled += 1;
  }

  return { scanned: rows.length, cancelled };
}
