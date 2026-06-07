import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Profile, TablesInsert } from '@/types/database.types';

import { prepareLessonTextbookUpload } from '@/lib/mentor/textbook-upload-payload';
import {
  removeLessonTextbookFile,
  uploadLessonTextbookPayload,
} from '@/lib/mentor/textbook-storage';

export type TextbookUploadResult = {
  error?: string;
  success?: string;
};

export type RegisterLessonTextbookInput = {
  lessonId: string;
  title: string;
  path: string;
  publicUrl: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  pageStart?: number | null;
  pageEnd?: number | null;
  sourcePageCount?: number | null;
};

function safeRevalidate(path: string) {
  if (process.env.NODE_ENV === 'development') return;
  revalidatePath(path);
}

export async function assertLessonOwner(
  lessonId: string,
  profile: { id: string; role: string },
): Promise<void> {
  if (profile.role === 'admin') return;

  const supabase = await createClient();
  const { data: lesson, error: lErr } = await supabase
    .from('lessons')
    .select('course_id')
    .eq('id', lessonId)
    .maybeSingle();

  if (lErr) throw lErr;
  if (!lesson) throw new Error('找不到單元');

  const { data: course, error: cErr } = await supabase
    .from('courses')
    .select('teacher_id')
    .eq('id', lesson.course_id)
    .maybeSingle();

  if (cErr) throw cErr;
  if (course?.teacher_id !== profile.id) {
    throw new Error('找不到單元或無權限');
  }
}

export async function getLessonCourseId(lessonId: string): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('lessons')
    .select('course_id')
    .eq('id', lessonId)
    .single();

  if (error || !data) throw new Error('找不到單元');
  return data.course_id;
}

/** Storage 上傳完成後寫入資料庫（請求體小，適用 Vercel 部署） */
export async function registerLessonTextbook(
  supabase: SupabaseClient<Database>,
  courseId: string,
  input: RegisterLessonTextbookInput,
): Promise<TextbookUploadResult> {
  const { data: maxRow } = await supabase
    .from('lesson_textbooks')
    .select('sort_order')
    .eq('lesson_id', input.lessonId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrder = (maxRow?.sort_order ?? -1) + 1;

  const insert: TablesInsert<'lesson_textbooks'> = {
    lesson_id: input.lessonId,
    title: input.title,
    file_name: input.fileName,
    file_url: input.publicUrl,
    storage_path: input.path,
    mime_type: input.mimeType,
    file_size_bytes: input.fileSizeBytes,
    sort_order: nextOrder,
    page_start: input.pageStart ?? null,
    page_end: input.pageEnd ?? null,
    source_page_count: input.sourcePageCount ?? null,
  };

  const { error: insErr } = await supabase.from('lesson_textbooks').insert(insert);
  if (insErr) {
    await removeLessonTextbookFile(supabase, input.path);
    return { error: insErr.message };
  }

  safeRevalidate(`/mentor/courses/${courseId}/edit`);
  const pageHint =
    input.pageStart != null && input.pageEnd != null
      ? `（第 ${input.pageStart}–${input.pageEnd} 頁）`
      : '';
  return { success: `已上傳課本${pageHint}` };
}

/** 經 API 轉傳整檔（本機可用；Vercel 等大檔請改瀏覽器直傳 Storage） */
export async function uploadLessonTextbookFromFormData(
  lessonId: string,
  formData: FormData,
  profile: Profile,
): Promise<TextbookUploadResult> {
  await assertLessonOwner(lessonId, profile);

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { error: '請選擇檔案' };
  }

  const titleRaw = String(formData.get('title') ?? '').trim();
  const title = titleRaw || file.name.replace(/\.[^.]+$/, '') || file.name;

  const cropPdf = formData.get('crop_pdf') === '1';
  const pageStartRaw = String(formData.get('page_start') ?? '');
  const pageEndRaw = String(formData.get('page_end') ?? '');

  try {
    const prepared = await prepareLessonTextbookUpload(file, {
      cropPdf,
      pageStartRaw,
      pageEndRaw,
    });
    if (!prepared.ok) return { error: prepared.error };

    const courseId = await getLessonCourseId(lessonId);
    const supabase = await createClient();
    const { payload } = prepared;

    const upload = await uploadLessonTextbookPayload(supabase, courseId, lessonId, {
      data: payload.blob,
      fileName: payload.fileName,
      mimeType: payload.mimeType,
      sizeBytes: payload.sizeBytes,
    });
    if (!upload.ok) return { error: upload.error };

    return registerLessonTextbook(supabase, courseId, {
      lessonId,
      title,
      path: upload.path,
      publicUrl: upload.publicUrl,
      fileName: payload.fileName,
      mimeType: payload.mimeType,
      fileSizeBytes: payload.sizeBytes,
      pageStart: payload.pageStart,
      pageEnd: payload.pageEnd,
      sourcePageCount: payload.sourcePageCount,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : '上傳失敗' };
  }
}
