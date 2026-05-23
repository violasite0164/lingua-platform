import {
  buildCroppedPdfFileName,
  extractPdfPageRange,
  isPdfFile,
  parsePdfPageRange,
} from '@/lib/mentor/pdf-crop';
import {
  isAllowedTextbookMime,
  MAX_LESSON_TEXTBOOK_BYTES,
} from '@/lib/mentor/textbook-storage';

export type PreparedTextbookUpload = {
  blob: Blob;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  pageStart: number | null;
  pageEnd: number | null;
  sourcePageCount: number | null;
};

export type PrepareTextbookOptions = {
  cropPdf?: boolean;
  pageStartRaw?: string;
  pageEndRaw?: string;
};

export async function prepareLessonTextbookUpload(
  file: File,
  options: PrepareTextbookOptions = {},
): Promise<{ ok: true; payload: PreparedTextbookUpload } | { ok: false; error: string }> {
  if (file.size === 0) {
    return { ok: false, error: '請選擇檔案' };
  }

  const mime = file.type || 'application/octet-stream';
  if (!isAllowedTextbookMime(mime)) {
    return { ok: false, error: '僅支援 PDF、Word、PowerPoint 或圖片' };
  }

  let blob: Blob = file;
  let fileName = file.name;
  let mimeType = mime;
  let sizeBytes = file.size;
  let pageStart: number | null = null;
  let pageEnd: number | null = null;
  let sourcePageCount: number | null = null;

  if (isPdfFile(file) && options.cropPdf) {
    const parsed = parsePdfPageRange(
      options.pageStartRaw ?? '',
      options.pageEndRaw ?? '',
    );
    if ('error' in parsed) return { ok: false, error: parsed.error };

    const bytes = new Uint8Array(await file.arrayBuffer());
    const cropped = await extractPdfPageRange(bytes, parsed.pageStart, parsed.pageEnd);
    if (!cropped.ok) return { ok: false, error: cropped.error };

    blob = new Blob([cropped.bytes], { type: 'application/pdf' });
    fileName = buildCroppedPdfFileName(file.name, parsed.pageStart, parsed.pageEnd);
    mimeType = 'application/pdf';
    sizeBytes = blob.size;
    pageStart = parsed.pageStart;
    pageEnd = parsed.pageEnd;
    sourcePageCount = cropped.totalPages;
  }

  if (sizeBytes > MAX_LESSON_TEXTBOOK_BYTES) {
    return { ok: false, error: '檔案請勿超過 50 MiB' };
  }

  return {
    ok: true,
    payload: {
      blob,
      fileName,
      mimeType,
      sizeBytes,
      pageStart,
      pageEnd,
      sourcePageCount,
    },
  };
}
