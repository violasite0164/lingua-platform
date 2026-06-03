import type { SupabaseClient } from '@supabase/supabase-js';

import { deliverStaminaPackToInbox } from '@/lib/billing/inbox-delivery';
import { getStripeServer } from '@/lib/stripe/server';

export type CheckoutVerifyResult =
  | {
      ok: true;
      status: 'paid';
      purchaseKind: 'shop_item' | 'subscription';
      shopItemKind?: string;
      staminaDelivered?: boolean;
      shopItemTitle?: string;
    }
  | {
      ok: true;
      status: 'pending';
      message: string;
    }
  | {
      ok: false;
      message: string;
    };

/** 付款完成頁確認 Stripe session，並在 webhook 未到時補送體力包至收件匣 */
export async function verifyCheckoutSessionForUser(
  sessionId: string,
  userId: string,
  userSupabase: SupabaseClient,
  adminSupabase: SupabaseClient,
): Promise<CheckoutVerifyResult> {
  const stripe = getStripeServer();
  let session: Awaited<ReturnType<typeof stripe.checkout.sessions.retrieve>>;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch {
    return { ok: false, message: '無法讀取付款紀錄' };
  }

  const md = session.metadata ?? {};
  if (md.user_id !== userId) {
    return { ok: false, message: '付款紀錄與目前帳號不符' };
  }

  if (session.payment_status !== 'paid') {
    return {
      ok: true,
      status: 'pending',
      message:
        session.status === 'expired'
          ? '付款連結已過期，請重新購買'
          : '付款尚未完成，若已扣款請稍候再重新整理',
    };
  }

  if (md.kind === 'subscription') {
    return { ok: true, status: 'paid', purchaseKind: 'subscription' };
  }

  if (md.kind !== 'shop_item') {
    return { ok: true, status: 'paid', purchaseKind: 'shop_item' };
  }

  const shopItemKind = md.shop_item_kind || '';
  const shopItemId = md.shop_item_id || null;
  const staminaAmount = Number.parseInt(md.stamina_amount || '0', 10);

  const { data: purchase } = await userSupabase
    .from('user_purchases')
    .select('id, status, shop_item_id')
    .eq('stripe_checkout_session_id', sessionId)
    .eq('user_id', userId)
    .maybeSingle();

  const purchaseId = purchase?.id ?? null;

  if (purchaseId && purchase?.status !== 'paid') {
    await adminSupabase
      .from('user_purchases')
      .update({
        status: 'paid',
        stripe_payment_intent_id:
          typeof session.payment_intent === 'string' ? session.payment_intent : null,
        amount_cents: typeof session.amount_total === 'number' ? session.amount_total : null,
        currency: session.currency ?? null,
      } as never)
      .eq('id', purchaseId);
  }

  let shopItemTitle = '體力道具';
  const resolvedShopItemId = shopItemId || purchase?.shop_item_id || null;
  if (resolvedShopItemId) {
    const { data: shopItem } = await adminSupabase
      .from('shop_items')
      .select('title')
      .eq('id', resolvedShopItemId)
      .maybeSingle();
    if (shopItem?.title) shopItemTitle = shopItem.title;
  }

  let staminaDelivered = false;
  if (
    shopItemKind === 'stamina_pack' &&
    Number.isFinite(staminaAmount) &&
    staminaAmount > 0 &&
    purchaseId
  ) {
    await deliverStaminaPackToInbox(adminSupabase, {
      userId,
      purchaseId,
      shopItemId: resolvedShopItemId,
      shopItemTitle,
      staminaAmount,
    });

    const { data: inboxRow } = await userSupabase
      .from('profile_inbox_messages')
      .select('id')
      .eq('user_id', userId)
      .contains('payload', { purchase_id: purchaseId })
      .maybeSingle();

    staminaDelivered = Boolean(inboxRow?.id);
  }

  return {
    ok: true,
    status: 'paid',
    purchaseKind: 'shop_item',
    shopItemKind,
    staminaDelivered,
    shopItemTitle,
  };
}
