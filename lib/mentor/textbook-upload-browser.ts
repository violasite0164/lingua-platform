import { createClient } from '@/lib/supabase/client';
import { prepareLessonTextbookUpload } from '@/lib/mentor/textbook-upload-payload';
import type { PrepareTextbookOptions } from '@/lib/mentor/textbook-upload-payload';
import {
  buildLessonTextbookStoragePath,
  isAllowedTextbookMime,
  LESSON_TEXTBOOK_BUCKET,
  MAX_LESSON_TEXTBOOK_BYTES,
} from '@/lib/mentor/textbook-storage';

export type BrowserTextbookUploadResult = {
  error?: string;
  success?: string;
  registerBody?: {
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
};

/**
 * 瀏覽器直傳 Supabase Storage（避開 Vercel / 反向代理約 4.5MB 的請求體上限）。
 * 成功後須再呼叫 POST /api/mentor/lesson-textbooks/register 寫入資料列。
 */
export async function uploadLessonTextbookViaBrowser(
  courseId: string,
  lessonId: string,
  file: File,
  title: string,
  options: PrepareTextbookOptions = {},
): Promise<BrowserTextbookUploadResult> {
  const prepared = await prepareLessonTextbookUpload(file, options);
  if (!prepared.ok) return { error: prepared.error };

  const { payload } = prepared;
  const supabase = createClient();
  const path = buildLessonTextbookStoragePath(courseId, lessonId, payload.fileName);

  const { error: uploadErr } = await supabase.storage
    .from(LESSON_TEXTBOOK_BUCKET)
    .upload(path, payload.blob, {
      contentType: payload.mimeType,
      upsert: false,
    });

  if (uploadErr) {
    console.error('[uploadLessonTextbookViaBrowser]', uploadErr.message);
    if (uploadErr.message.toLowerCase().includes('payload') || uploadErr.message.includes('size')) {
      return { error: `檔案請勿超過 ${MAX_LESSON_TEXTBOOK_BYTES / (1024 * 1024)} MiB` };
    }
    return { error: uploadErr.message || '儲存空間上傳失敗' };
  }

  const { data: urlData } = supabase.storage.from(LESSON_TEXTBOOK_BUCKET).getPublicUrl(path);
  const displayTitle = title.trim() || file.name.replace(/\.[^.]+$/, '') || file.name;

  return {
    registerBody: {
      lessonId,
      title: displayTitle,
      path,
      publicUrl: urlData.publicUrl,
      fileName: payload.fileName,
      mimeType: payload.mimeType,
      fileSizeBytes: payload.sizeBytes,
      pageStart: payload.pageStart,
      pageEnd: payload.pageEnd,
      sourcePageCount: payload.sourcePageCount,
    },
  };
}

/** 上傳前快速檢查（避免大檔讀入記憶體後才失敗） */
export function validateTextbookFileBeforeUpload(file: File): string | null {
  if (file.size === 0) return '請選擇檔案';
  if (file.size > MAX_LESSON_TEXTBOOK_BYTES) {
    return `檔案請勿超過 ${MAX_LESSON_TEXTBOOK_BYTES / (1024 * 1024)} MiB`;
  }
  const mime = file.type || 'application/octet-stream';
  if (!isAllowedTextbookMime(mime)) {
    return '僅支援 PDF、Word、PowerPoint 或圖片';
  }
  return null;
}
