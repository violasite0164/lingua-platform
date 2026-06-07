import { createClient } from '@/lib/supabase/client';
import { GAME_STAMINA_MAX } from '@/lib/game/stamina';
import type { GameStaminaState } from '@/lib/game/stamina';
import {
  type ProfileInboxMessage,
  type ProfileInboxStaminaPayload,
} from '@/lib/profile/inbox-types';

type InboxRow = {
  id: string;
  kind: string;
  title: string;
  body: string;
  payload: unknown;
  read_at: string | null;
  claimed_at: string | null;
  created_at: string;
};

function mapInboxRow(row: InboxRow): ProfileInboxMessage {
  const payload =
    row.payload && typeof row.payload === 'object' && !Array.isArray(row.payload)
      ? (row.payload as ProfileInboxStaminaPayload)
      : {};
  return {
    id: row.id,
    kind: row.kind === 'stamina_pack' ? 'stamina_pack' : 'system',
    title: row.title,
    body: row.body ?? '',
    payload,
    read_at: row.read_at,
    claimed_at: row.claimed_at,
    created_at: row.created_at,
  };
}

function inboxTableMissing(message: string): boolean {
  return /profile_inbox_messages|42P01|does not exist/i.test(message);
}

export async function fetchProfileInboxMessagesClient(): Promise<
  { ok: true; messages: ProfileInboxMessage[] } | { ok: false; message: string }
> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: '請先登入' };

  const { data, error } = await supabase
    .from('profile_inbox_messages')
    .select('id, kind, title, body, payload, read_at, claimed_at, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(80);

  if (error) {
    if (inboxTableMissing(error.message) || error.code === '42P01') {
      return {
        ok: false,
        message:
          '收件匣尚未就緒，請套用 migration：supabase/migrations/20260605140000_profile_inbox.sql',
      };
    }
    return { ok: false, message: '無法載入收件匣' };
  }

  return { ok: true, messages: (data ?? []).map((row) => mapInboxRow(row as InboxRow)) };
}

export async function fetchProfileInboxUnreadCountClient(): Promise<number> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count, error } = await supabase
    .from('profile_inbox_messages')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .is('read_at', null);

  if (error) {
    if (inboxTableMissing(error.message) || error.code === '42P01') return 0;
    return 0;
  }
  return count ?? 0;
}

export async function markProfileInboxReadClient(): Promise<
  { ok: true } | { ok: false; message: string }
> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: '請先登入' };

  const now = new Date().toISOString();
  const { error } = await supabase
    .from('profile_inbox_messages')
    .update({ read_at: now } as never)
    .eq('user_id', user.id)
    .is('read_at', null);

  if (error) return { ok: false, message: '無法更新已讀狀態' };
  return { ok: true };
}

export async function claimProfileInboxStaminaPackClient(messageId: string): Promise<
  | { ok: true; stamina: GameStaminaState; granted: number }
  | { ok: false; message: string }
> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: '請先登入' };

  const { data: row, error: fetchError } = await supabase
    .from('profile_inbox_messages')
    .select('id, kind, title, body, payload, read_at, claimed_at, created_at')
    .eq('id', messageId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (fetchError || !row) {
    return { ok: false, message: '找不到此訊息' };
  }

  const message = mapInboxRow(row as InboxRow);
  if (message.kind !== 'stamina_pack' || message.claimed_at) {
    return { ok: false, message: '此道具已使用或無法領取' };
  }

  const amount = Math.min(
    GAME_STAMINA_MAX,
    Math.max(1, Math.round(message.payload.stamina_amount ?? 0)),
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
    .update({ claimed_at: now, read_at: message.read_at ?? now } as never)
    .eq('id', messageId)
    .eq('user_id', user.id)
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
