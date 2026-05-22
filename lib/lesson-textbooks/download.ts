import type { SupabaseClient } from '@supabase/supabase-js';

import { LESSON_TEXTBOOK_BUCKET } from '@/lib/mentor/textbook-storage';
import type { Database } from '@/types/database.types';

export type TextbookDownloadRow = {
  file_name: string;
  mime_type: string | null;
  storage_path: string;
};

function contentDispositionAttachment(fileName: string): string {
  const ascii = fileName.replace(/[^\x20-\x7E]/g, '_') || 'download';
  const encoded = encodeURIComponent(fileName);
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

/**
 * 依 RLS 讀取課本列，並從 Storage 下載檔案（避開瀏覽器對 Supabase 公開 URL 的 CORS／download 限制）。
 */
export async function loadLessonTextbookFile(
  supabase: SupabaseClient<Database>,
  textbookId: string,
): Promise<
  | { ok: true; row: TextbookDownloadRow; blob: Blob }
  | { ok: false; status: number; message: string }
> {
  const { data: row, error: rowErr } = await supabase
    .from('lesson_textbooks')
    .select('file_name, mime_type, storage_path')
    .eq('id', textbookId)
    .maybeSingle();

  if (rowErr) {
    console.error('[loadLessonTextbookFile] select', rowErr.message);
    return { ok: false, status: 500, message: '無法讀取教材資料' };
  }
  if (!row) {
    return { ok: false, status: 404, message: '找不到教材' };
  }

  const { data: blob, error: dlErr } = await supabase.storage
    .from(LESSON_TEXTBOOK_BUCKET)
    .download(row.storage_path);

  if (dlErr || !blob) {
    console.error('[loadLessonTextbookFile] storage', dlErr?.message);
    return { ok: false, status: 500, message: '無法取得檔案' };
  }

  return { ok: true, row, blob };
}

export function textbookDownloadResponse(
  row: TextbookDownloadRow,
  blob: Blob,
): Response {
  const mime = row.mime_type || 'application/octet-stream';
  return new Response(blob, {
    status: 200,
    headers: {
      'Content-Type': mime,
      'Content-Disposition': contentDispositionAttachment(row.file_name),
      'Cache-Control': 'private, no-cache',
    },
  });
}
