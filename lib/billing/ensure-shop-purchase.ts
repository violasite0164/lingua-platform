import type { SupabaseClient } from '@supabase/supabase-js';

type EnsureShopPurchaseInput = {
  userId: string;
  shopItemId: string | null;
  stripeCheckoutSessionId: string;
  amountCents: number | null;
  currency: string | null;
  stripePaymentIntentId?: string | null;
  status?: 'pending' | 'paid';
};

/** 確保 user_purchases 有一筆對應 checkout session 的紀錄（需 service role） */
export async function ensureShopPurchaseRecord(
  adminSupabase: SupabaseClient,
  input: EnsureShopPurchaseInput,
): Promise<string | null> {
  const { data: existing } = await adminSupabase
    .from('user_purchases')
    .select('id')
    .eq('stripe_checkout_session_id', input.stripeCheckoutSessionId)
    .maybeSingle();

  if (existing?.id) {
    if (input.status === 'paid') {
      await adminSupabase
        .from('user_purchases')
        .update({
          status: 'paid',
          stripe_payment_intent_id: input.stripePaymentIntentId ?? null,
          amount_cents: input.amountCents,
          currency: input.currency,
          shop_item_id: input.shopItemId,
        } as never)
        .eq('id', existing.id);
    }
    return existing.id;
  }

  const { data: inserted, error } = await adminSupabase
    .from('user_purchases')
    .insert({
      user_id: input.userId,
      kind: 'shop_item',
      shop_item_id: input.shopItemId,
      stripe_checkout_session_id: input.stripeCheckoutSessionId,
      stripe_payment_intent_id: input.stripePaymentIntentId ?? null,
      amount_cents: input.amountCents,
      currency: input.currency,
      status: input.status ?? 'pending',
    } as never)
    .select('id')
    .single();

  if (error) {
    console.error('[ensureShopPurchaseRecord]', error.message);
    return null;
  }

  return inserted?.id ?? null;
}
