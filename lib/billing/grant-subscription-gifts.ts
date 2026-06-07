import type { SupabaseClient } from '@supabase/supabase-js';

import { deliverStaminaPackToInbox } from '@/lib/billing/inbox-delivery';

/**
 * 訂閱啟用後依方案設定贈送商店商品（每個 Stripe subscription 各發一次）。
 */
export async function grantSubscriptionPlanGifts(
  supabase: SupabaseClient,
  input: {
    userId: string;
    planCode: string;
    stripeSubscriptionId: string;
  },
): Promise<void> {
  const { data: gifts } = await supabase
    .from('subscription_plan_gifts')
    .select('shop_item_id, quantity')
    .eq('plan_code', input.planCode);

  if (!gifts?.length) return;

  for (const row of gifts) {
    const shopItemId = row.shop_item_id;
    const { data: shop } = await supabase
      .from('shop_items')
      .select('id, kind, title, stamina_amount, is_active')
      .eq('id', shopItemId)
      .maybeSingle();

    if (!shop?.is_active) continue;

    const { data: existing } = await supabase
      .from('subscription_gift_deliveries')
      .select('id')
      .eq('user_id', input.userId)
      .eq('plan_code', input.planCode)
      .eq('shop_item_id', shopItemId)
      .eq('stripe_subscription_id', input.stripeSubscriptionId)
      .maybeSingle();

    if (existing?.id) continue;

    const { data: delivery, error: deliveryErr } = await supabase
      .from('subscription_gift_deliveries')
      .insert({
        user_id: input.userId,
        plan_code: input.planCode,
        shop_item_id: shopItemId,
        stripe_subscription_id: input.stripeSubscriptionId,
      } as never)
      .select('id')
      .single();

    if (deliveryErr || !delivery?.id) {
      if (deliveryErr && !/duplicate|unique/i.test(deliveryErr.message)) {
        console.error('[grantSubscriptionPlanGifts] delivery', deliveryErr.message);
      }
      continue;
    }

    if (shop.kind === 'stamina_pack') {
      const perPack = shop.stamina_amount ?? 0;
      const giftQty =
        typeof row.quantity === 'number' && row.quantity >= 1
          ? Math.min(99, Math.round(row.quantity))
          : 1;
      if (perPack <= 0) continue;

      for (let packIndex = 0; packIndex < giftQty; packIndex += 1) {
        await deliverStaminaPackToInbox(supabase, {
          userId: input.userId,
          purchaseId: `${delivery.id}:${packIndex}`,
          shopItemId,
          shopItemTitle: shop.title,
          staminaAmount: perPack,
          isSubscriptionGift: true,
        });
      }
    }
  }
}
