import type { SupabaseClient } from '@supabase/supabase-js';

type DeliverStaminaPackInboxInput = {
  userId: string;
  purchaseId: string;
  shopItemId: string | null;
  shopItemTitle: string;
  staminaAmount: number;
  /** 訂閱贈送組數（選填，用於文案） */
  giftQuantity?: number;
  staminaPerPack?: number;
  isSubscriptionGift?: boolean;
  /** 遊戲內購買已即時回復體力時，僅寫入已領取紀錄供 webhook 去重 */
  alreadyClaimed?: boolean;
};

/** 付款成功後將體力包送入使用者收件匣（由 webhook / 管理端呼叫） */
export async function deliverStaminaPackToInbox(
  supabase: SupabaseClient,
  input: DeliverStaminaPackInboxInput,
): Promise<void> {
  const amount = Math.max(0, Math.round(input.staminaAmount));
  if (amount <= 0) return;

  const isSubscriptionGift = input.isSubscriptionGift === true;
  const qty = input.giftQuantity ?? 1;
  const perPack = input.staminaPerPack;
  /** 舊版合併贈送（單則 ×N）；新訂閱贈送改為多則獨立道具，不再帶 giftQuantity */
  const legacyMergedGift = isSubscriptionGift && qty > 1;
  const title = legacyMergedGift
    ? `訂閱贈送：${input.shopItemTitle} ×${qty}`
    : isSubscriptionGift
      ? `訂閱贈送：${input.shopItemTitle}`
      : `購買成功：${input.shopItemTitle}`;
  const body =
    legacyMergedGift && perPack != null && perPack > 0
      ? `訂閱禮包含 ${qty} 組（每組 +${perPack} 體力，共 +${amount} 點）。請點擊「使用」加入遊戲帳戶（上限 10 點）。`
      : isSubscriptionGift
        ? `訂閱禮已送達。請點擊「使用」將體力 +${amount} 點加入遊戲帳戶（上限 10 點）。`
        : `付款已完成。請點擊「使用」將體力 +${amount} 點加入遊戲帳戶（上限 10 點）。`;

  const payload = {
    purchase_id: input.purchaseId,
    shop_item_id: input.shopItemId,
    shop_item_title: input.shopItemTitle,
    stamina_amount: amount,
    ...(qty > 1 ? { gift_quantity: qty } : {}),
  };

  const { data: existing } = await supabase
    .from('profile_inbox_messages')
    .select('id')
    .eq('user_id', input.userId)
    .contains('payload', { purchase_id: input.purchaseId })
    .maybeSingle();

  if (existing?.id) return;

  const now = new Date().toISOString();
  const { error } = await supabase.from('profile_inbox_messages').insert({
    user_id: input.userId,
    kind: 'stamina_pack',
    title,
    body,
    payload,
    ...(input.alreadyClaimed
      ? { claimed_at: now, read_at: now }
      : {}),
  } as never);

  if (error && !/duplicate|unique/i.test(error.message)) {
    console.error('[deliverStaminaPackToInbox]', error.message);
  }
}
