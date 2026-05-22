'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';

import { requireMentor } from '@/lib/mentor/auth';
import { removeLessonTextbookFile } from '@/lib/mentor/textbook-storage';
import {
  assertLessonOwner,
  getLessonCourseId,
  uploadLessonTextbookFromFormData,
} from '@/lib/mentor/textbook-upload-core';

export type TextbookActionState = {
  error?: string;
  success?: string;
};

function safeRevalidate(path: string) {
  if (process.env.NODE_ENV === 'development') return;
  revalidatePath(path);
}

export async function listLessonTextbooksAction(lessonId: string) {
  const profile = await requireMentor();
  await assertLessonOwner(lessonId, profile);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('lesson_textbooks')
    .select('*')
    .eq('lesson_id', lessonId)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('[listLessonTextbooks]', error);
    return { error: error.message, textbooks: [] };
  }

  return { textbooks: data ?? [] };
}

/** @deprecated 請改用 POST /api/mentor/lesson-textbooks/upload */
export async function uploadLessonTextbookAction(
  lessonId: string,
  formData: FormData,
): Promise<TextbookActionState> {
  const profile = await requireMentor();
  return uploadLessonTextbookFromFormData(lessonId, formData, profile);
}

export async function deleteLessonTextbookAction(
  textbookId: string,
): Promise<TextbookActionState> {
  const profile = await requireMentor();
  const supabase = await createClient();

  const { data: row, error: fetchErr } = await supabase
    .from('lesson_textbooks')
    .select('lesson_id, storage_path')
    .eq('id', textbookId)
    .maybeSingle();

  if (fetchErr || !row) return { error: '找不到檔案' };

  await assertLessonOwner(row.lesson_id, profile);

  await removeLessonTextbookFile(supabase, row.storage_path);

  const { error: delErr } = await supabase
    .from('lesson_textbooks')
    .delete()
    .eq('id', textbookId);

  if (delErr) return { error: delErr.message };

  const courseId = await getLessonCourseId(row.lesson_id);
  safeRevalidate(`/mentor/courses/${courseId}/edit`);
  return { success: '已刪除' };
}

export async function reorderLessonTextbooksAction(
  lessonId: string,
  orderedIds: string[],
): Promise<TextbookActionState> {
  const profile = await requireMentor();
  await assertLessonOwner(lessonId, profile);

  if (orderedIds.length === 0) return { success: '已更新排序' };

  const supabase = await createClient();

  const { data: existing, error: listErr } = await supabase
    .from('lesson_textbooks')
    .select('id')
    .eq('lesson_id', lessonId);

  if (listErr) return { error: listErr.message };

  const existingIds = new Set((existing ?? []).map((r) => r.id));
  if (
    orderedIds.length !== existingIds.size ||
    orderedIds.some((id) => !existingIds.has(id))
  ) {
    return { error: '排序資料不一致，請重新整理' };
  }

  const updates = orderedIds.map((id, index) =>
    supabase.from('lesson_textbooks').update({ sort_order: index }).eq('id', id),
  );

  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed?.error) return { error: failed.error.message };

  const courseId = await getLessonCourseId(lessonId);
  safeRevalidate(`/mentor/courses/${courseId}/edit`);
  return { success: '已更新排序' };
}
