import type { SupabaseClient } from '@supabase/supabase-js';

type DeliverStaminaPackInboxInput = {
  userId: string;
  purchaseId: string;
  shopItemId: string | null;
  shopItemTitle: string;
  staminaAmount: number;
};

/** 付款成功後將體力包送入使用者收件匣（由 webhook / 管理端呼叫） */
export async function deliverStaminaPackToInbox(
  supabase: SupabaseClient,
  input: DeliverStaminaPackInboxInput,
): Promise<void> {
  const amount = Math.max(0, Math.round(input.staminaAmount));
  if (amount <= 0) return;

  const title = `購買成功：${input.shopItemTitle}`;
  const body = `付款已完成。請點擊「使用」將體力 +${amount} 點加入遊戲帳戶（上限 10 點）。`;
  const payload = {
    purchase_id: input.purchaseId,
    shop_item_id: input.shopItemId,
    shop_item_title: input.shopItemTitle,
    stamina_amount: amount,
  };

  const { data: existing } = await supabase
    .from('profile_inbox_messages')
    .select('id')
    .eq('user_id', input.userId)
    .contains('payload', { purchase_id: input.purchaseId })
    .maybeSingle();

  if (existing?.id) return;

  const { error } = await supabase.from('profile_inbox_messages').insert({
    user_id: input.userId,
    kind: 'stamina_pack',
    title,
    body,
    payload,
  } as never);

  if (error && !/duplicate|unique/i.test(error.message)) {
    console.error('[deliverStaminaPackToInbox]', error.message);
  }
}
