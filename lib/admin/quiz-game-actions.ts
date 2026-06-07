'use server';

import { revalidatePath } from 'next/cache';

import { requireAdmin } from '@/lib/admin/auth';
import {
  QUIZ_CINEMA_FORM_FIELDS,
  QUIZ_CINEMA_LEVEL_META,
} from '@/lib/quiz-game-config';
import { createClient } from '@/lib/supabase/server';

function parseOptionalUrl(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  try {
    const u = new URL(s);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return '';
    return s;
  } catch {
    return '';
  }
}

export type QuizGameVideosActionResult = { ok: true } | { ok: false; error: string };

export async function updateQuizGameVideos(
  formData: FormData,
): Promise<QuizGameVideosActionResult> {
  await requireAdmin();

  const payload: Record<string, string | null> = {
    updated_at: new Date().toISOString(),
  };

  for (const { id, label } of QUIZ_CINEMA_LEVEL_META) {
    const fields = QUIZ_CINEMA_FORM_FIELDS[id];
    const startRaw = String(formData.get(fields.start) ?? '');
    const completeRaw = String(formData.get(fields.complete) ?? '');

    const startUrl = parseOptionalUrl(startRaw);
    const completeUrl = parseOptionalUrl(completeRaw);

    if (startUrl === '' || completeUrl === '') {
      return {
        ok: false,
        error: `${label}：影片網址請使用有效的 http(s) 連結，或留空。`,
      };
    }

    payload[fields.start] = startUrl;
    payload[fields.complete] = completeUrl;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('homepage_config')
    .update(payload as never)
    .eq('id', 1);

  if (error) {
    console.error('[updateQuizGameVideos]', error.message);
    const needsMigration =
      error.message.includes('quiz_elementary_start_video_url') ||
      error.message.includes('column');
    return {
      ok: false,
      error: needsMigration
        ? '資料庫尚未加入各難度影片欄位，請執行 supabase/migrations/20260525200000_homepage_quiz_videos_by_difficulty.sql'
        : error.message || '儲存失敗',
    };
  }

  revalidatePath('/admin/quiz-videos');
  revalidatePath('/quiz');
  revalidatePath('/games');

  return { ok: true };
}
