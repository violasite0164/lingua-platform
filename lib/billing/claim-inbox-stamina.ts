import type { SupabaseClient } from '@supabase/supabase-js';

import { GAME_STAMINA_MAX, type GameStaminaState } from '@/lib/game/stamina';

export type ClaimInboxStaminaResult =
  | { ok: true; granted: number; stamina: GameStaminaState }
  | { ok: false; message: string };

/** 將收件匣體力包道具兌換為遊戲體力 */
export async function claimInboxStaminaPack(
  supabase: SupabaseClient,
  userId: string,
  messageId: string,
): Promise<ClaimInboxStaminaResult> {
  const { data: row, error: fetchError } = await supabase
    .from('profile_inbox_messages')
    .select('id, kind, payload, read_at, claimed_at')
    .eq('id', messageId)
    .eq('user_id', userId)
    .maybeSingle();

  if (fetchError || !row) {
    return { ok: false, message: '找不到此道具' };
  }

  if (row.kind !== 'stamina_pack' || row.claimed_at) {
    return { ok: false, message: '此道具已使用或無法領取' };
  }

  const payload = (row.payload ?? {}) as { stamina_amount?: number };
  const amount = Math.min(
    GAME_STAMINA_MAX,
    Math.max(1, Math.round(payload.stamina_amount ?? 0)),
  );

  const { data: grantData, error: grantError } = await supabase.rpc('grant_game_stamina', {
    p_amount: amount,
  });

  if (grantError) {
    return { ok: false, message: '體力回復失敗，請稍後再試' };
  }

  const grant = grantData as Record<string, unknown> | null;
  if (!grant || grant.ok !== true) {
    return {
      ok: false,
      message: typeof grant?.message === 'string' ? grant.message : '體力回復失敗',
    };
  }

  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from('profile_inbox_messages')
    .update({ claimed_at: now, read_at: row.read_at ?? now } as never)
    .eq('id', messageId)
    .eq('user_id', userId)
    .is('claimed_at', null);

  if (updateError) {
    return { ok: false, message: '體力已回復，但狀態更新失敗' };
  }

  return {
    ok: true,
    granted: amount,
    stamina: {
      stamina: typeof grant.stamina === 'number' ? grant.stamina : GAME_STAMINA_MAX,
      max: typeof grant.max === 'number' ? grant.max : GAME_STAMINA_MAX,
      isAdmin: false,
      nextRegenAt: null,
    },
  };
}
