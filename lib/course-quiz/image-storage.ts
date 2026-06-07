import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/database.types';

export const COURSE_QUIZ_ASSETS_BUCKET = 'course-quiz-assets' as const;

const COURSE_QUIZ_ASSETS_BUCKET_MIGRATION =
  'supabase/migrations/20260604120100_course_quiz_assets_bucket.sql';

function formatCourseQuizStorageError(message: string): string {
  if (/bucket not found/i.test(message)) {
    return `儲存空間「${COURSE_QUIZ_ASSETS_BUCKET}」尚未建立。請在 Supabase 套用 migration：${COURSE_QUIZ_ASSETS_BUCKET_MIGRATION}`;
  }
  return message || '上傳失敗';
}

export function buildCourseQuizOptionImagePath(
  courseId: string,
  questionId: string,
  optionIndex: number,
  ext: string,
): string {
  return `${courseId}/${questionId}/option-${optionIndex}.${ext}`;
}

export function buildCourseQuizTypefacePath(courseId: string, quizId: string): string {
  return `${courseId}/${quizId}/shape-typeface.json`;
}

function extensionForMime(mime: string): string {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/gif') return 'gif';
  return 'jpg';
}

export async function uploadCourseQuizOptionImage(
  supabase: SupabaseClient<Database>,
  courseId: string,
  questionId: string,
  optionIndex: number,
  file: Blob,
  contentType: string,
): Promise<{ ok: true; publicUrl: string } | { ok: false; error: string }> {
  const ext = extensionForMime(contentType);
  const path = buildCourseQuizOptionImagePath(courseId, questionId, optionIndex, ext);

  const { error } = await supabase.storage.from(COURSE_QUIZ_ASSETS_BUCKET).upload(path, file, {
    contentType,
    upsert: true,
  });

  if (error) {
    console.error('[uploadCourseQuizOptionImage]', error.message);
    return { ok: false, error: formatCourseQuizStorageError(error.message) };
  }

  const { data } = supabase.storage.from(COURSE_QUIZ_ASSETS_BUCKET).getPublicUrl(path);
  const cacheBust = `v=${Date.now()}`;
  const publicUrl = data.publicUrl.includes('?')
    ? `${data.publicUrl}&${cacheBust}`
    : `${data.publicUrl}?${cacheBust}`;

  return { ok: true, publicUrl };
}

export async function uploadCourseQuizShapeTypefaceJson(
  supabase: SupabaseClient<Database>,
  courseId: string,
  quizId: string,
  jsonText: string,
): Promise<{ ok: true; publicUrl: string } | { ok: false; error: string }> {
  const path = buildCourseQuizTypefacePath(courseId, quizId);
  const body = new Blob([jsonText], { type: 'application/json' });

  const { error } = await supabase.storage.from(COURSE_QUIZ_ASSETS_BUCKET).upload(path, body, {
    contentType: 'application/json',
    upsert: true,
  });

  if (error) {
    console.error('[uploadCourseQuizShapeTypefaceJson]', error.message);
    return { ok: false, error: formatCourseQuizStorageError(error.message) };
  }

  const { data } = supabase.storage.from(COURSE_QUIZ_ASSETS_BUCKET).getPublicUrl(path);
  const cacheBust = `v=${Date.now()}`;
  const publicUrl = data.publicUrl.includes('?')
    ? `${data.publicUrl}&${cacheBust}`
    : `${data.publicUrl}?${cacheBust}`;

  return { ok: true, publicUrl };
}
