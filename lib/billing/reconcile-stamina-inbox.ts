import type { SupabaseClient } from '@supabase/supabase-js';

import { deliverStaminaPackToInbox } from '@/lib/billing/inbox-delivery';
import { ensureShopPurchaseRecord } from '@/lib/billing/ensure-shop-purchase';
import { getStripeServer } from '@/lib/stripe/server';

async function syncPaidCheckoutSessionsFromStripe(
  adminSupabase: SupabaseClient,
  userId: string,
  stripeCustomerId: string,
): Promise<void> {
  const stripe = getStripeServer();
  const sessions = await stripe.checkout.sessions.list({
    customer: stripeCustomerId,
    limit: 15,
  });

  for (const session of sessions.data) {
    if (session.payment_status !== 'paid') continue;
    const md = session.metadata ?? {};
    if (md.kind !== 'shop_item' || md.user_id !== userId) continue;
    if (md.shop_item_kind !== 'stamina_pack') continue;

    await ensureShopPurchaseRecord(adminSupabase, {
      userId,
      shopItemId: md.shop_item_id || null,
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId:
        typeof session.payment_intent === 'string' ? session.payment_intent : null,
      amountCents: typeof session.amount_total === 'number' ? session.amount_total : null,
      currency: session.currency ?? null,
      status: 'paid',
    });
  }
}

/** 將已付款但未送達收件匣的體力包補進 inbox（webhook / 購買紀錄遺漏時） */
export async function reconcileStaminaInboxForUser(
  adminSupabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const { data: profile } = await adminSupabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', userId)
    .maybeSingle();

  if (profile?.stripe_customer_id) {
    try {
      await syncPaidCheckoutSessionsFromStripe(
        adminSupabase,
        userId,
        profile.stripe_customer_id,
      );
    } catch {
      // Stripe 不可用時仍嘗試本地紀錄補發
    }
  }

  const { data: purchases, error } = await adminSupabase
    .from('user_purchases')
    .select('id, shop_item_id, status, created_at')
    .eq('user_id', userId)
    .eq('status', 'paid')
    .order('created_at', { ascending: false })
    .limit(30);

  if (error || !purchases?.length) return 0;

  let delivered = 0;

  for (const purchase of purchases) {
    if (!purchase.shop_item_id) continue;

    const { data: shopItem } = await adminSupabase
      .from('shop_items')
      .select('kind, title, stamina_amount')
      .eq('id', purchase.shop_item_id)
      .maybeSingle();

    if (shopItem?.kind !== 'stamina_pack') continue;
    const amount = shopItem.stamina_amount ?? 0;
    if (amount <= 0) continue;

    const { data: existing } = await adminSupabase
      .from('profile_inbox_messages')
      .select('id')
      .eq('user_id', userId)
      .contains('payload', { purchase_id: purchase.id })
      .maybeSingle();

    if (existing?.id) continue;

    await deliverStaminaPackToInbox(adminSupabase, {
      userId,
      purchaseId: purchase.id,
      shopItemId: purchase.shop_item_id,
      shopItemTitle: shopItem.title ?? '體力道具',
      staminaAmount: amount,
    });
    delivered += 1;
  }

  return delivered;
}
