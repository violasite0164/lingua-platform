'use server';

import { createClient } from '@/lib/supabase/server';
import {
  GAME_STAMINA_MAX,
  type GameStaminaSpendResult,
  type GameStaminaState,
} from '@/lib/game/stamina';

const STAMINA_RPC_MIGRATION =
  'supabase/migrations/20260529120000_user_game_stamina.sql';

function parseStaminaRow(row: Record<string, unknown>): GameStaminaState {
  return {
    stamina: typeof row.stamina === 'number' ? row.stamina : GAME_STAMINA_MAX,
    max: typeof row.max === 'number' ? row.max : GAME_STAMINA_MAX,
    isAdmin: row.isAdmin === true,
    freePlay: row.freePlay === true,
    nextRegenAt: typeof row.nextRegenAt === 'string' ? row.nextRegenAt : null,
  };
}

function staminaRpcUnavailableMessage(rpcName: string): string {
  return `體力系統尚未就緒（缺少 ${rpcName}）。請套用資料庫 migration：${STAMINA_RPC_MIGRATION}`;
}

function isRpcNotFound(message: string): boolean {
  return (
    /Could not find the function/i.test(message) || /schema cache/i.test(message)
  );
}

export async function getGameStaminaState(): Promise<
  { ok: true; state: GameStaminaState } | { ok: false; message: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, message: '請先登入' };
  }

  const { data, error } = await supabase.rpc('get_game_stamina');
  if (error) {
    console.error('[getGameStaminaState]', error.message);
    if (isRpcNotFound(error.message)) {
      return { ok: false, message: staminaRpcUnavailableMessage('get_game_stamina') };
    }
    return { ok: false, message: '無法讀取體力' };
  }

  const row = data as Record<string, unknown> | null;
  if (!row || row.ok !== true) {
    return {
      ok: false,
      message: typeof row?.message === 'string' ? row.message : '無法讀取體力',
    };
  }

  return { ok: true, state: parseStaminaRow(row) };
}

export async function spendGameStamina(amount: number): Promise<GameStaminaSpendResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, message: '請先登入' };
  }

  const { data, error } = await supabase.rpc('spend_game_stamina', {
    p_amount: amount,
  });
  if (error) {
    console.error('[spendGameStamina]', error.message);
    if (isRpcNotFound(error.message)) {
      return { ok: false, message: staminaRpcUnavailableMessage('spend_game_stamina') };
    }
    return { ok: false, message: '體力扣除失敗' };
  }

  const row = data as Record<string, unknown> | null;
  if (!row) {
    return { ok: false, message: '體力扣除失敗' };
  }

  if (row.ok !== true) {
    return {
      ok: false,
      message: typeof row.message === 'string' ? row.message : '體力不足',
      stamina: typeof row.stamina === 'number' ? row.stamina : undefined,
      max: typeof row.max === 'number' ? row.max : GAME_STAMINA_MAX,
      nextRegenAt: typeof row.nextRegenAt === 'string' ? row.nextRegenAt : null,
    };
  }

  const state = parseStaminaRow(row);
  return {
    ok: true,
    spent: typeof row.spent === 'number' ? row.spent : amount,
    ...state,
  };
}
