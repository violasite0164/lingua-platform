'use server';

import { revalidatePath } from 'next/cache';

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

  const completedAt = new Date().toISOString();

  const { data: existing } = await supabase
    .from('user_progress')
    .select('id')
    .eq('user_id', user.id)
    .eq('lesson_id', lessonId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('user_progress')
      .update({ completed: true, completed_at: completedAt } as never)
      .eq('user_id', user.id)
      .eq('lesson_id', lessonId);
  } else {
    const done: TablesInsert<'user_progress'> = {
      user_id:      user.id,
      lesson_id:    lessonId,
      completed:    true,
      completed_at: completedAt,
      xp_granted:   false,
    };
    await supabase.from('user_progress').insert(done as never);
  }

  // Grant XP (DB function is idempotent via xp_granted flag)
  await supabase.rpc('grant_lesson_xp', {
    p_user_id:   user.id,
    p_lesson_id: lessonId,
  } as never);

  const { data: lesson } = await supabase
    .from('lessons')
    .select('course_id')
    .eq('id', lessonId)
    .maybeSingle();

  if (lesson?.course_id) {
    revalidatePath(`/courses/${lesson.course_id}`);
    revalidatePath(`/learn/${lesson.course_id}`);
  }
  revalidatePath('/dashboard');
}
