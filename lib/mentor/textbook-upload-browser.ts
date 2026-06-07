import { createClient } from '@/lib/supabase/client';
import { resolveTextbookMime, validateTextbookMime } from '@/lib/mentor/textbook-mime';
import { prepareLessonTextbookUpload } from '@/lib/mentor/textbook-upload-payload';
import type { PrepareTextbookOptions } from '@/lib/mentor/textbook-upload-payload';
import {
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

type UploadSessionResponse = {
  path?: string;
  token?: string;
  publicUrl?: string;
  error?: string;
};

async function parseJsonResponse<T>(res: Response): Promise<T & { error?: string }> {
  const text = await res.text();
  if (!text) {
    return { error: res.ok ? '伺服器回傳空白' : `請求失敗 (${res.status})` } as T & {
      error?: string;
    };
  }
  try {
    return JSON.parse(text) as T & { error?: string };
  } catch {
    return { error: `請求失敗 (${res.status})` } as T & { error?: string };
  }
}

/**
 * 瀏覽器直傳 Supabase Storage（signed upload，適合大檔與 Vercel 部署）。
 */
export async function uploadLessonTextbookViaBrowser(
  courseId: string,
  lessonId: string,
  file: File,
  title: string,
  options: PrepareTextbookOptions = {},
): Promise<BrowserTextbookUploadResult> {
  void courseId;

  let prepared;
  try {
    prepared = await prepareLessonTextbookUpload(file, options);
  } catch (err) {
    const message = err instanceof Error ? err.message : '無法處理檔案';
    return {
      error: message.includes('memory') || message.includes('Memory')
        ? '檔案過大，請關閉 PDF 裁切或改用較小檔案'
        : message,
    };
  }

  if (!prepared.ok) return { error: prepared.error };

  const { payload } = prepared;
  const mimeType = resolveTextbookMime(file);
  const mimeErr = validateTextbookMime(mimeType);
  if (mimeErr) return { error: mimeErr };

  if (payload.sizeBytes > MAX_LESSON_TEXTBOOK_BYTES) {
    return { error: `檔案請勿超過 ${MAX_LESSON_TEXTBOOK_BYTES / (1024 * 1024)} MiB` };
  }

  const sessionRes = await fetch('/api/mentor/lesson-textbooks/upload-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      lessonId,
      fileName: payload.fileName,
      mimeType: payload.mimeType || mimeType,
      fileSizeBytes: payload.sizeBytes,
    }),
  });

  const session = await parseJsonResponse<UploadSessionResponse>(sessionRes);
  if (!sessionRes.ok || session.error) {
    return { error: session.error ?? `無法建立上傳 (${sessionRes.status})` };
  }
  if (!session.path || !session.token || !session.publicUrl) {
    return { error: '上傳連線資料不完整' };
  }

  const supabase = createClient();
  const { error: uploadErr } = await supabase.storage
    .from(LESSON_TEXTBOOK_BUCKET)
    .uploadToSignedUrl(session.path, session.token, payload.blob, {
      contentType: payload.mimeType || mimeType,
      upsert: false,
    });

  if (uploadErr) {
    console.error('[uploadLessonTextbookViaBrowser]', uploadErr.message);
    const msg = uploadErr.message ?? '';
    if (msg.toLowerCase().includes('mime') || msg.includes('not allowed')) {
      return { error: '此檔案類型不被允許，請確認為 PDF／圖片或 Office 文件' };
    }
    if (msg.toLowerCase().includes('policy') || msg.includes('403')) {
      return { error: '沒有上傳權限，請確認已以導師身分登入' };
    }
    if (msg.includes('size') || msg.toLowerCase().includes('payload')) {
      return { error: `檔案請勿超過 ${MAX_LESSON_TEXTBOOK_BYTES / (1024 * 1024)} MiB` };
    }
    return { error: msg || '儲存空間上傳失敗' };
  }

  const displayTitle = title.trim() || file.name.replace(/\.[^.]+$/, '') || file.name;

  return {
    registerBody: {
      lessonId,
      title: displayTitle,
      path: session.path,
      publicUrl: session.publicUrl,
      fileName: payload.fileName,
      mimeType: payload.mimeType || mimeType,
      fileSizeBytes: payload.sizeBytes,
      pageStart: payload.pageStart,
      pageEnd: payload.pageEnd,
      sourcePageCount: payload.sourcePageCount,
    },
  };
}

/** 上傳前快速檢查 */
export function validateTextbookFileBeforeUpload(file: File): string | null {
  if (file.size === 0) return '請選擇檔案';
  if (file.size > MAX_LESSON_TEXTBOOK_BYTES) {
    return `檔案請勿超過 ${MAX_LESSON_TEXTBOOK_BYTES / (1024 * 1024)} MiB`;
  }
  return validateTextbookMime(resolveTextbookMime(file));
}
