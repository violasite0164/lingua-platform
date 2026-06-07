'use server';

import { createClient } from '@/lib/supabase/server';
import type { StaminaChargeKind } from '@/lib/game/stamina';
import type { QuizDifficultyLevel } from '@/types/database.types';

const PLAY_SESSION_MIGRATION =
  'supabase/migrations/20260531120100_game_play_sessions.sql';

export type BeginGamePlaySessionResult =
  | { ok: true; sessionId: string }
  | { ok: false; message: string };

function rpcUnavailableMessage(fn: string): string {
  return `遊戲局次系統尚未就緒（缺少 ${fn}）。請套用 migration：${PLAY_SESSION_MIGRATION}`;
}

function isRpcNotFound(message: string): boolean {
  return (
    /Could not find the function/i.test(message) || /schema cache/i.test(message)
  );
}

export async function beginGamePlaySession(
  difficulty: QuizDifficultyLevel,
  chargeKind: StaminaChargeKind,
): Promise<BeginGamePlaySessionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, message: '請先登入' };
  }

  const { data, error } = await supabase.rpc('begin_game_play_session', {
    p_difficulty: difficulty,
    p_charge_kind: chargeKind,
  });

  if (error) {
    console.error('[beginGamePlaySession]', error.message);
    if (isRpcNotFound(error.message)) {
      return { ok: false, message: rpcUnavailableMessage('begin_game_play_session') };
    }
    return { ok: false, message: error.message };
  }

  const row = data as Record<string, unknown> | null;
  if (!row || row.ok !== true || typeof row.sessionId !== 'string') {
    return {
      ok: false,
      message:
        typeof row?.message === 'string' ? row.message : '無法開始遊戲，請稍後再試',
    };
  }

  return { ok: true, sessionId: row.sessionId };
}

export async function assertGamePlaySession(
  sessionId: string,
  difficulty: QuizDifficultyLevel,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('assert_game_play_session', {
    p_session_id: sessionId,
    p_difficulty: difficulty,
  });

  if (error) {
    console.error('[assertGamePlaySession]', error.message);
    if (isRpcNotFound(error.message)) {
      return { ok: false, message: rpcUnavailableMessage('assert_game_play_session') };
    }
    return { ok: false, message: error.message };
  }

  const row = data as Record<string, unknown> | null;
  if (!row || row.ok !== true) {
    return {
      ok: false,
      message:
        typeof row?.message === 'string' ? row.message : '遊戲局次憑證無效',
    };
  }

  return { ok: true };
}

export async function consumeGamePlaySession(
  sessionId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('consume_game_play_session', {
    p_session_id: sessionId,
  });

  if (error) {
    console.error('[consumeGamePlaySession]', error.message);
    if (isRpcNotFound(error.message)) {
      return { ok: false, message: rpcUnavailableMessage('consume_game_play_session') };
    }
    return { ok: false, message: error.message };
  }

  const row = data as Record<string, unknown> | null;
  if (!row || row.ok !== true) {
    return {
      ok: false,
      message:
        typeof row?.message === 'string' ? row.message : '無法完成局次結算',
    };
  }

  return { ok: true };
}

export async function issueGameAdvanceGrant(
  targetDifficulty: QuizDifficultyLevel,
  sourceDifficulty?: QuizDifficultyLevel,
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('issue_game_advance_grant', {
    p_target_difficulty: targetDifficulty,
    p_source_difficulty: sourceDifficulty ?? null,
  });
  if (error && !isRpcNotFound(error.message)) {
    console.error('[issueGameAdvanceGrant]', error.message);
  }
}
