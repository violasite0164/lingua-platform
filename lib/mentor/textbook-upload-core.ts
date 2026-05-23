import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';
import type { Profile, TablesInsert } from '@/types/database.types';

import {
  buildCroppedPdfFileName,
  extractPdfPageRange,
  isPdfFile,
  parsePdfPageRange,
} from '@/lib/mentor/pdf-crop';
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
  pageStart: number | null;
  pageEnd: number | null;
  sourcePageCount: number | null;
};

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

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

/** 瀏覽器直傳 Storage 後，寫入 lesson_textbooks 資料列 */
export async function registerLessonTextbook(
  supabase: SupabaseServerClient,
  courseId: string,
  input: RegisterLessonTextbookInput,
): Promise<TextbookUploadResult> {
  const { lessonId } = input;
  const title =
    input.title.trim() || input.fileName.replace(/\.[^.]+$/, '') || input.fileName;

  const { data: maxRow } = await supabase
    .from('lesson_textbooks')
    .select('sort_order')
    .eq('lesson_id', lessonId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrder = (maxRow?.sort_order ?? -1) + 1;

  const insert: TablesInsert<'lesson_textbooks'> = {
    lesson_id: lessonId,
    title,
    file_name: input.fileName,
    file_url: input.publicUrl,
    storage_path: input.path,
    mime_type: input.mimeType,
    file_size_bytes: input.fileSizeBytes,
    sort_order: nextOrder,
    page_start: input.pageStart,
    page_end: input.pageEnd,
    source_page_count: input.sourcePageCount,
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

/** 課本上傳核心邏輯（API Route 與 Server Action 共用） */
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
    const courseId = await getLessonCourseId(lessonId);
    const supabase = await createClient();

    let uploadBlob: Blob = file;
    let uploadName = file.name;
    let uploadMime = file.type || 'application/octet-stream';
    let uploadSize = file.size;
    let pageStart: number | null = null;
    let pageEnd: number | null = null;
    let sourcePageCount: number | null = null;

    if (isPdfFile(file) && cropPdf) {
      const parsed = parsePdfPageRange(pageStartRaw, pageEndRaw);
      if ('error' in parsed) return { error: parsed.error };

      const bytes = new Uint8Array(await file.arrayBuffer());
      const cropped = await extractPdfPageRange(bytes, parsed.pageStart, parsed.pageEnd);
      if (!cropped.ok) return { error: cropped.error };

      uploadBlob = new Blob([Buffer.from(cropped.bytes)], { type: 'application/pdf' });
      uploadName = buildCroppedPdfFileName(file.name, parsed.pageStart, parsed.pageEnd);
      uploadMime = 'application/pdf';
      uploadSize = uploadBlob.size;
      pageStart = parsed.pageStart;
      pageEnd = parsed.pageEnd;
      sourcePageCount = cropped.totalPages;
    }

    const upload = await uploadLessonTextbookPayload(supabase, courseId, lessonId, {
      data: uploadBlob,
      fileName: uploadName,
      mimeType: uploadMime,
      sizeBytes: uploadSize,
    });
    if (!upload.ok) return { error: upload.error };

    const { data: maxRow } = await supabase
      .from('lesson_textbooks')
      .select('sort_order')
      .eq('lesson_id', lessonId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextOrder = (maxRow?.sort_order ?? -1) + 1;

    const insert: TablesInsert<'lesson_textbooks'> = {
      lesson_id: lessonId,
      title,
      file_name: uploadName,
      file_url: upload.publicUrl,
      storage_path: upload.path,
      mime_type: uploadMime,
      file_size_bytes: uploadSize,
      sort_order: nextOrder,
      page_start: pageStart,
      page_end: pageEnd,
      source_page_count: sourcePageCount,
    };

    const { error: insErr } = await supabase.from('lesson_textbooks').insert(insert);
    if (insErr) {
      await removeLessonTextbookFile(supabase, upload.path);
      return { error: insErr.message };
    }

    safeRevalidate(`/mentor/courses/${courseId}/edit`);
    const pageHint =
      pageStart != null && pageEnd != null
        ? `（第 ${pageStart}–${pageEnd} 頁）`
        : '';
    return { success: `已上傳課本${pageHint}` };
  } catch (err) {
    return { error: err instanceof Error ? err.message : '上傳失敗' };
  }
}
