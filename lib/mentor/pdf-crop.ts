import { PDFDocument } from 'pdf-lib';

export function isPdfFile(file: File): boolean {
  const mime = file.type?.toLowerCase() ?? '';
  if (mime === 'application/pdf') return true;
  return file.name.toLowerCase().endsWith('.pdf');
}

export function parsePdfPageRange(
  pageStartRaw: string,
  pageEndRaw: string,
): { pageStart: number; pageEnd: number } | { error: string } {
  const pageStart = Number.parseInt(pageStartRaw.trim(), 10);
  const pageEnd = Number.parseInt(pageEndRaw.trim(), 10);

  if (!Number.isFinite(pageStart) || !Number.isFinite(pageEnd)) {
    return { error: '請輸入有效的起迄頁碼（正整數）' };
  }
  if (pageStart < 1 || pageEnd < 1) {
    return { error: '頁碼須大於或等於 1' };
  }
  if (pageEnd < pageStart) {
    return { error: '結束頁不可小於開始頁' };
  }

  return { pageStart, pageEnd };
}

export async function extractPdfPageRange(
  pdfBytes: Uint8Array,
  pageStart: number,
  pageEnd: number,
): Promise<
  | { ok: true; bytes: Uint8Array; totalPages: number }
  | { ok: false; error: string }
> {
  let src: PDFDocument;
  try {
    src = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  } catch {
    return { ok: false, error: '無法讀取 PDF，請確認檔案未損壞或已加密' };
  }

  const totalPages = src.getPageCount();
  if (totalPages === 0) {
    return { ok: false, error: 'PDF 沒有任何頁面' };
  }
  if (pageStart > totalPages || pageEnd > totalPages) {
    return { ok: false, error: `此 PDF 共 ${totalPages} 頁，請調整頁碼範圍` };
  }

  const out = await PDFDocument.create();
  const indices = Array.from(
    { length: pageEnd - pageStart + 1 },
    (_, i) => pageStart - 1 + i,
  );
  const copied = await out.copyPages(src, indices);
  copied.forEach((page) => out.addPage(page));

  const bytes = await out.save();
  return { ok: true, bytes, totalPages };
}

export function buildCroppedPdfFileName(originalName: string, pageStart: number, pageEnd: number): string {
  const base = originalName.replace(/\.pdf$/i, '') || 'textbook';
  return `${base}-p${pageStart}-${pageEnd}.pdf`;
}
