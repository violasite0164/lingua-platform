'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';
import { requireMentor } from '@/lib/mentor/auth';
import {
  upsertLessonCueSchema,
  validateCuePayload,
} from '@/lib/mentor/cue-schemas';
import { assertLessonOwner, getLessonCourseId } from '@/lib/mentor/textbook-upload-core';
import type { LessonTimedCue } from '@/types/database.types';
import type { Json } from '@/types/database.types';

export type CueActionState = {
  error?: string;
  success?: string;
};

function safeRevalidate(path: string) {
  if (process.env.NODE_ENV === 'development') return;
  revalidatePath(path);
}

export async function listLessonTimedCuesAction(lessonId: string) {
  const profile = await requireMentor();
  await assertLessonOwner(lessonId, profile);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('lesson_timed_cues')
    .select('*')
    .eq('lesson_id', lessonId)
    .order('trigger_at_sec', { ascending: true })
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('[listLessonTimedCues]', error);
    return { error: error.message, cues: [] as LessonTimedCue[] };
  }

  return { cues: (data ?? []) as LessonTimedCue[] };
}

export async function createLessonTimedCueAction(
  input: unknown,
): Promise<CueActionState & { cue?: LessonTimedCue }> {
  const profile = await requireMentor();
  const parsed = upsertLessonCueSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? '資料格式錯誤' };
  }

  const { lesson_id, trigger_at_sec, cue_type, payload, is_enabled } = parsed.data;
  await assertLessonOwner(lesson_id, profile);

  const payloadResult = validateCuePayload(cue_type, payload);
  if (!payloadResult.success) {
    return { error: payloadResult.error.issues[0]?.message ?? '內容格式錯誤' };
  }

  const supabase = await createClient();
  const { data: maxRow } = await supabase
    .from('lesson_timed_cues')
    .select('sort_order')
    .eq('lesson_id', lesson_id)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  const sort_order = (maxRow?.sort_order ?? -1) + 1;

  const { data, error } = await supabase
    .from('lesson_timed_cues')
    .insert({
      lesson_id,
      trigger_at_sec,
      cue_type,
      payload: payloadResult.data as Json,
      sort_order,
      is_enabled: is_enabled ?? true,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  const courseId = await getLessonCourseId(lesson_id);
  safeRevalidate(`/mentor/courses/${courseId}/edit`);
  return { success: '已新增互動', cue: data as LessonTimedCue };
}

export async function updateLessonTimedCueAction(
  cueId: string,
  input: unknown,
): Promise<CueActionState> {
  const profile = await requireMentor();
  const parsed = upsertLessonCueSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? '資料格式錯誤' };
  }

  const supabase = await createClient();
  const { data: existing, error: fetchErr } = await supabase
    .from('lesson_timed_cues')
    .select('lesson_id')
    .eq('id', cueId)
    .maybeSingle();

  if (fetchErr || !existing) return { error: '找不到互動' };
  await assertLessonOwner(existing.lesson_id, profile);

  const { trigger_at_sec, cue_type, payload, is_enabled } = parsed.data;
  const payloadResult = validateCuePayload(cue_type, payload);
  if (!payloadResult.success) {
    return { error: payloadResult.error.issues[0]?.message ?? '內容格式錯誤' };
  }

  const { error } = await supabase
    .from('lesson_timed_cues')
    .update({
      trigger_at_sec,
      cue_type,
      payload: payloadResult.data as Json,
      ...(is_enabled !== undefined ? { is_enabled } : {}),
    })
    .eq('id', cueId);

  if (error) return { error: error.message };

  const courseId = await getLessonCourseId(existing.lesson_id);
  safeRevalidate(`/mentor/courses/${courseId}/edit`);
  return { success: '已儲存' };
}

export async function deleteLessonTimedCueAction(
  cueId: string,
): Promise<CueActionState> {
  const profile = await requireMentor();
  const supabase = await createClient();

  const { data: row, error: fetchErr } = await supabase
    .from('lesson_timed_cues')
    .select('lesson_id')
    .eq('id', cueId)
    .maybeSingle();

  if (fetchErr || !row) return { error: '找不到互動' };
  await assertLessonOwner(row.lesson_id, profile);

  const { error } = await supabase
    .from('lesson_timed_cues')
    .delete()
    .eq('id', cueId);

  if (error) return { error: error.message };

  const courseId = await getLessonCourseId(row.lesson_id);
  safeRevalidate(`/mentor/courses/${courseId}/edit`);
  return { success: '已刪除' };
}

export async function toggleLessonTimedCueAction(
  cueId: string,
  is_enabled: boolean,
): Promise<CueActionState> {
  const profile = await requireMentor();
  const supabase = await createClient();

  const { data: row, error: fetchErr } = await supabase
    .from('lesson_timed_cues')
    .select('lesson_id')
    .eq('id', cueId)
    .maybeSingle();

  if (fetchErr || !row) return { error: '找不到互動' };
  await assertLessonOwner(row.lesson_id, profile);

  const { error } = await supabase
    .from('lesson_timed_cues')
    .update({ is_enabled })
    .eq('id', cueId);

  if (error) return { error: error.message };

  const courseId = await getLessonCourseId(row.lesson_id);
  safeRevalidate(`/mentor/courses/${courseId}/edit`);
  return { success: is_enabled ? '已啟用' : '已停用' };
}
