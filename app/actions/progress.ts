'use server';

import { createClient } from '@/lib/supabase/server';
import type { TablesInsert } from '@/types/database.types';

// ─── saveVideoProgress ────────────────────────────────────────────────────────
/**
 * Upsert watched_seconds in user_progress.
 * Called from VideoPlayer ~every 5 s via debounce.
 */
export async function saveVideoProgress({
  lessonId,
  watchedSeconds,
}: {
  lessonId: string;
  watchedSeconds: number;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const row: TablesInsert<'user_progress'> = {
    user_id:         user.id,
    lesson_id:       lessonId,
    watched_seconds: watchedSeconds,
    last_watched_at: new Date().toISOString(),
  };
  /* postgrest-js：自訂 Database 未完全貼合 GenericSchema 時，upsert 的 payload 偶發被推成 `never` */
  await supabase
    .from('user_progress')
    .upsert(row as never, { onConflict: 'user_id,lesson_id' });
}

// ─── markLessonComplete ───────────────────────────────────────────────────────
/**
 * Mark a lesson as completed and trigger XP grant via DB function.
 * Idempotent – safe to call multiple times (DB function guards against double XP).
 */
export async function markLessonComplete({
  lessonId,
}: {
  lessonId: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // 1. Mark progress row as completed
  const done: TablesInsert<'user_progress'> = {
    user_id:      user.id,
    lesson_id:    lessonId,
    completed:    true,
    completed_at: new Date().toISOString(),
  };
  await supabase
    .from('user_progress')
    .upsert(done as never, { onConflict: 'user_id,lesson_id' });

  // 2. Grant XP (DB function is idempotent via xp_granted flag)
  await supabase.rpc('grant_lesson_xp', {
    p_user_id:   user.id,
    p_lesson_id: lessonId,
  } as never);
}
