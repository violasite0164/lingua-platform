import { isPdfFile } from '@/lib/mentor/pdf-crop';
import { isAllowedTextbookMime } from '@/lib/mentor/textbook-storage';

/** 依副檔名補正 MIME（Safari／部分環境上傳 PDF 時 type 常為空） */
export function resolveTextbookMime(file: File): string {
  const raw = (file.type ?? '').trim().toLowerCase();
  if (raw && raw !== 'application/octet-stream') return raw;

  const name = file.name.toLowerCase();
  if (isPdfFile(file) || name.endsWith('.pdf')) return 'application/pdf';
  if (name.endsWith('.doc')) return 'application/msword';
  if (name.endsWith('.docx')) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }
  if (name.endsWith('.ppt')) return 'application/vnd.ms-powerpoint';
  if (name.endsWith('.pptx')) {
    return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
  }
  if (name.endsWith('.png')) return 'image/png';
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg';
  if (name.endsWith('.webp')) return 'image/webp';
  if (name.endsWith('.gif')) return 'image/gif';

  return raw || 'application/octet-stream';
}

export function validateTextbookMime(mime: string): string | null {
  if (!isAllowedTextbookMime(mime)) {
    return '僅支援 PDF、Word、PowerPoint 或圖片';
  }
  return null;
}
