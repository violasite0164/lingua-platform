'use server';

import { revalidatePath } from 'next/cache';

import { requireAdmin } from '@/lib/admin/auth';
import {
  normalizeQuizGameAudioMix,
  parseQuizGameAudioMixFromRow,
  type QuizGameAudioMix,
} from '@/lib/quiz/game-audio-settings';
import { createClient } from '@/lib/supabase/server';

export async function getQuizGameAudioSettings(): Promise<QuizGameAudioMix> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('homepage_config')
    .select('quiz_game_bgm_volume_pct, quiz_game_sfx_volume_pct')
    .eq('id', 1)
    .maybeSingle();

  if (error) {
    console.error('[getQuizGameAudioSettings]', error.message);
    return parseQuizGameAudioMixFromRow(null);
  }

  return parseQuizGameAudioMixFromRow(data);
}

export type UpdateQuizGameAudioSettingsResult =
  | { ok: true; mix: QuizGameAudioMix }
  | { ok: false; error: string };

export async function updateQuizGameAudioSettings(
  mix: QuizGameAudioMix,
): Promise<UpdateQuizGameAudioSettingsResult> {
  await requireAdmin();

  const normalized = normalizeQuizGameAudioMix(mix);
  const supabase = await createClient();
  const { error } = await supabase
    .from('homepage_config')
    .update({
      quiz_game_bgm_volume_pct: normalized.bgmVolumePct,
      quiz_game_sfx_volume_pct: normalized.sfxVolumePct,
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id', 1);

  if (error) {
    console.error('[updateQuizGameAudioSettings]', error.message);
    const needsMigration =
      error.message.includes('quiz_game_bgm_volume_pct') ||
      error.message.includes('column');
    return {
      ok: false,
      error: needsMigration
        ? '資料庫尚未加入遊戲音量欄位，請執行 supabase/migrations/20260531140000_homepage_quiz_game_audio_mix.sql'
        : error.message || '儲存失敗',
    };
  }

  revalidatePath('/games');
  revalidatePath('/quiz');

  return { ok: true, mix: normalized };
}
