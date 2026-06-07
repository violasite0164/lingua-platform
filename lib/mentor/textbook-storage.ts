import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/database.types';

export const LESSON_TEXTBOOK_BUCKET = 'lesson-textbooks' as const;

export const LESSON_TEXTBOOK_ACCEPT =
  'application/pdf,image/jpeg,image/png,image/webp,image/gif,.pdf,.doc,.docx,.ppt,.pptx';

export const MAX_LESSON_TEXTBOOK_BYTES = 50 * 1024 * 1024; // 50 MiB

const ALLOWED_MIME_PREFIXES = ['application/pdf', 'image/'] as const;
const ALLOWED_MIME_EXACT = new Set([
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);

export function isAllowedTextbookMime(mime: string): boolean {
  if (ALLOWED_MIME_EXACT.has(mime)) return true;
  return ALLOWED_MIME_PREFIXES.some((p) => mime.startsWith(p));
}

function sanitizeFileName(name: string): string {
  const base = name.replace(/[/\\]/g, '_').trim() || 'file';
  return base.slice(0, 120);
}

export function buildLessonTextbookStoragePath(
  courseId: string,
  lessonId: string,
  fileName: string,
): string {
  const id =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().slice(0, 10)
      : String(Date.now());
  return `${courseId}/${lessonId}/${Date.now()}-${id}-${sanitizeFileName(fileName)}`;
}

export type TextbookUploadPayload = {
  data: Blob;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

export async function uploadLessonTextbookPayload(
  supabase: SupabaseClient<Database>,
  courseId: string,
  lessonId: string,
  payload: TextbookUploadPayload,
): Promise<{ ok: true; path: string; publicUrl: string } | { ok: false; error: string }> {
  if (payload.sizeBytes > MAX_LESSON_TEXTBOOK_BYTES) {
    return { ok: false, error: '檔案請勿超過 50 MiB' };
  }

  const mime = payload.mimeType || 'application/octet-stream';
  if (!isAllowedTextbookMime(mime)) {
    return {
      ok: false,
      error: '僅支援 PDF、Word、PowerPoint 或圖片',
    };
  }

  const path = buildLessonTextbookStoragePath(courseId, lessonId, payload.fileName);
  const { error } = await supabase.storage.from(LESSON_TEXTBOOK_BUCKET).upload(path, payload.data, {
    contentType: mime,
    upsert: false,
  });

  if (error) {
    console.error('[uploadLessonTextbookPayload]', error.message);
    return { ok: false, error: error.message || '上傳失敗' };
  }

  const { data } = supabase.storage.from(LESSON_TEXTBOOK_BUCKET).getPublicUrl(path);
  return { ok: true, path, publicUrl: data.publicUrl };
}

/** @deprecated 請改用 uploadLessonTextbookPayload */
export async function uploadLessonTextbookFile(
  supabase: SupabaseClient<Database>,
  courseId: string,
  lessonId: string,
  file: File,
): Promise<{ ok: true; path: string; publicUrl: string } | { ok: false; error: string }> {
  return uploadLessonTextbookPayload(supabase, courseId, lessonId, {
    data: file,
    fileName: file.name,
    mimeType: file.type || 'application/octet-stream',
    sizeBytes: file.size,
  });
}

export async function removeLessonTextbookFile(
  supabase: SupabaseClient<Database>,
  storagePath: string,
): Promise<void> {
  const { error } = await supabase.storage.from(LESSON_TEXTBOOK_BUCKET).remove([storagePath]);
  if (error) console.error('[removeLessonTextbookFile]', error.message);
}
