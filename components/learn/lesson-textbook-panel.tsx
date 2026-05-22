'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  BookOpen,
  Download,
  ExternalLink,
  FileImage,
  FileText,
  Loader2,
  Printer,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { LessonTextbook } from '@/types/database.types';

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function formatPageRange(tb: LessonTextbook): string | null {
  if (tb.page_start != null && tb.page_end != null) {
    const src =
      tb.source_page_count != null ? ` / 原檔 ${tb.source_page_count} 頁` : '';
    return `第 ${tb.page_start}–${tb.page_end} 頁${src}`;
  }
  return null;
}

function TextbookIcon({ mime }: { mime: string | null }) {
  if (mime?.startsWith('image/')) {
    return <FileImage className="h-4 w-4 shrink-0 text-muted-foreground" />;
  }
  return <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />;
}

type PreviewKind = 'pdf' | 'image' | 'office' | 'other';

function getPreviewKind(tb: LessonTextbook): PreviewKind {
  const mime = (tb.mime_type ?? '').toLowerCase();
  const name = tb.file_name.toLowerCase();

  if (mime === 'application/pdf' || name.endsWith('.pdf')) return 'pdf';
  if (mime.startsWith('image/')) return 'image';
  if (
    mime.includes('word') ||
    mime.includes('powerpoint') ||
    mime.includes('presentation') ||
    mime === 'application/msword' ||
    name.endsWith('.doc') ||
    name.endsWith('.docx') ||
    name.endsWith('.ppt') ||
    name.endsWith('.pptx')
  ) {
    return 'office';
  }
  return 'other';
}

function officeEmbedUrl(fileUrl: string): string {
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`;
}

function pdfPreviewUrl(fileUrl: string): string {
  const base = fileUrl.split('#')[0];
  return `${base}#view=Fit&toolbar=0&navpanes=0`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function fetchTextbookBlob(tb: LessonTextbook): Promise<Blob> {
  const res = await fetch(tb.file_url, { mode: 'cors' });
  if (!res.ok) throw new Error('無法取得檔案');
  return res.blob();
}

async function downloadTextbook(tb: LessonTextbook): Promise<void> {
  try {
    const blob = await fetchTextbookBlob(tb);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = tb.file_name || 'textbook';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  } catch {
    const anchor = document.createElement('a');
    anchor.href = tb.file_url;
    anchor.download = tb.file_name || 'textbook';
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }
}

const PRINT_LOADING_HTML = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>準備列印</title>
<style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;color:#666;}</style>
</head><body><p>載入中，請稍候…</p></body></html>`;

function openPrintWindow(): Window | null {
  const win = window.open('', '_blank');
  if (!win) return null;
  win.document.open();
  win.document.write(PRINT_LOADING_HTML);
  win.document.close();
  return win;
}

async function printTextbook(tb: LessonTextbook, printWin: Window): Promise<void> {
  const kind = getPreviewKind(tb);

  try {
    const blob = await fetchTextbookBlob(tb);
    const blobUrl = URL.createObjectURL(blob);

    if (kind === 'image') {
      const title = escapeHtml(tb.title);
      printWin.document.open();
      printWin.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${title}</title>
<style>
  @page { size: A4 portrait; margin: 12mm; }
  html, body { margin: 0; height: 100%; }
  body { display: flex; align-items: center; justify-content: center; }
  img { max-width: 100%; max-height: 100%; object-fit: contain; }
</style></head>
<body><img src="${blobUrl}" alt="${title}" onload="window.focus();window.print();" /></body></html>`);
      printWin.document.close();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
      return;
    }

    const triggerPrint = () => {
      try {
        printWin.focus();
        printWin.print();
      } catch {
        /* ignore */
      }
    };
    printWin.addEventListener('load', triggerPrint);
    printWin.location.href = blobUrl;
    setTimeout(triggerPrint, 1500);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
  } catch {
    printWin.location.href = tb.file_url;
    printWin.addEventListener('load', () => {
      setTimeout(() => {
        printWin.focus();
        printWin.print();
      }, 500);
    });
  }
}

function TextbookToolbar({
  textbook,
  busy,
  onDownload,
  onPrint,
}: {
  textbook: LessonTextbook;
  busy: boolean;
  onDownload: () => void;
  onPrint: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <Button variant="ghost" size="sm" className="h-8 px-2" asChild>
        <a href={textbook.file_url} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
          在新分頁開啟
        </a>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 px-2"
        disabled={busy}
        onClick={onDownload}
      >
        {busy ? (
          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
        ) : (
          <Download className="mr-1.5 h-3.5 w-3.5" />
        )}
        下載
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 px-2"
        disabled={busy}
        onClick={onPrint}
      >
        {busy ? (
          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
        ) : (
          <Printer className="mr-1.5 h-3.5 w-3.5" />
        )}
        列印
      </Button>
    </div>
  );
}

const A4_WIDTH_RATIO = 210 / 297;

type PageSize = { width: number; height: number };

function fitA4InBox(boxWidth: number, boxHeight: number): PageSize {
  if (boxWidth <= 0 || boxHeight <= 0) return { width: 0, height: 0 };

  let width = boxWidth;
  let height = width / A4_WIDTH_RATIO;
  if (height > boxHeight) {
    height = boxHeight;
    width = height * A4_WIDTH_RATIO;
  }

  return {
    width: Math.max(1, Math.floor(width)),
    height: Math.max(1, Math.floor(height)),
  };
}

function TextbookPreviewViewport({ children }: { children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pageSize, setPageSize] = useState<PageSize>({ width: 0, height: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const styles = getComputedStyle(el);
      const paddingX =
        parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight);
      const paddingY =
        parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom);
      const innerWidth = Math.max(0, el.clientWidth - paddingX);
      const innerHeight = Math.max(0, el.clientHeight - paddingY);
      setPageSize(fitA4InBox(innerWidth, innerHeight));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="flex min-h-0 w-full flex-1 items-center justify-center overflow-auto bg-muted/40 p-2"
    >
      <div
        className={cn(
          'relative shrink-0 overflow-hidden',
          'rounded-sm border border-border bg-background shadow-sm',
          pageSize.width === 0 && 'min-h-[320px] w-full max-w-full',
        )}
        style={
          pageSize.width > 0
            ? { width: pageSize.width, height: pageSize.height }
            : { aspectRatio: '210 / 297', width: '100%' }
        }
      >
        <div className="absolute inset-0">{children}</div>
      </div>
    </div>
  );
}

function TextbookPreviewContent({ textbook }: { textbook: LessonTextbook }) {
  const kind = getPreviewKind(textbook);

  if (kind === 'image') {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={textbook.file_url}
        alt={textbook.title}
        className="h-full w-full object-contain"
      />
    );
  }

  if (kind === 'pdf') {
    return (
      <iframe
        title={textbook.title}
        src={pdfPreviewUrl(textbook.file_url)}
        className="h-full w-full border-0 bg-background"
      />
    );
  }

  if (kind === 'office') {
    return (
      <iframe
        title={textbook.title}
        src={officeEmbedUrl(textbook.file_url)}
        className="h-full w-full border-0 bg-background"
      />
    );
  }

  return (
    <div className="flex h-full min-h-[12rem] flex-col items-center justify-center gap-3 px-4 text-center text-sm text-muted-foreground">
      <p>此檔案類型無法在視窗內預覽，請在新分頁開啟。</p>
      <Button variant="outline" size="sm" asChild>
        <a href={textbook.file_url} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="mr-2 h-4 w-4" />
          在新分頁開啟
        </a>
      </Button>
    </div>
  );
}

/** 覆蓋右側欄的課本預覽彈窗（定位在課程大綱欄位內，不遮擋影片） */
export function LessonTextbookPreviewPopup({
  textbook,
  onClose,
}: {
  textbook: LessonTextbook;
  onClose: () => void;
}) {
  const [actionBusy, setActionBusy] = useState(false);
  const pageLabel = formatPageRange(textbook);

  async function runTextbookAction(action: 'download' | 'print') {
    if (actionBusy) return;

    if (action === 'print') {
      const printWin = openPrintWindow();
      if (!printWin) {
        window.alert(
          '瀏覽器已阻擋彈出視窗。請在 Safari「設定 → 網站 → 彈出式視窗」允許本網站，或改用「在新分頁開啟」後自行列印。',
        );
        return;
      }
      setActionBusy(true);
      try {
        await printTextbook(textbook, printWin);
      } finally {
        setActionBusy(false);
      }
      return;
    }

    setActionBusy(true);
    try {
      await downloadTextbook(textbook);
    } finally {
      setActionBusy(false);
    }
  }

  return (
    <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] bg-background text-foreground">
      <div className="border-b border-border bg-background px-3 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-sm font-semibold leading-snug">{textbook.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {textbook.file_name} · {formatBytes(Number(textbook.file_size_bytes))}
              {pageLabel ? ` · ${pageLabel}` : ''}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            aria-label="關閉預覽"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <TextbookToolbar
          textbook={textbook}
          busy={actionBusy}
          onDownload={() => void runTextbookAction('download')}
          onPrint={() => void runTextbookAction('print')}
        />
      </div>
      <TextbookPreviewViewport>
        <TextbookPreviewContent textbook={textbook} />
      </TextbookPreviewViewport>
    </div>
  );
}

type PanelProps = {
  textbooks: LessonTextbook[];
  activeId: string | null;
  onSelect: (textbook: LessonTextbook) => void;
};

export function LessonTextbookPanel({ textbooks, activeId, onSelect }: PanelProps) {
  if (textbooks.length === 0) return null;

  return (
    <div className="mt-4 border-t border-border pt-4">
      <div className="mb-2 flex items-center gap-1.5">
        <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
        <h3 className="text-sm font-semibold">課本教材</h3>
        <span className="text-xs text-muted-foreground">（{textbooks.length}）</span>
      </div>

      <ul className="space-y-2">
        {textbooks.map((tb, index) => {
          const label = formatPageRange(tb);
          const isActive = activeId === tb.id;
          return (
            <li key={tb.id}>
              <button
                type="button"
                onClick={() => onSelect(tb)}
                className={cn(
                  'flex w-full items-start gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors',
                  isActive
                    ? 'border-primary/40 bg-primary/10'
                    : 'border-border bg-muted/30 hover:bg-muted/60',
                )}
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-background text-[10px] font-medium text-muted-foreground">
                  {index + 1}
                </span>
                <TextbookIcon mime={tb.mime_type} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium leading-snug">{tb.title}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {tb.file_name} · {formatBytes(Number(tb.file_size_bytes))}
                  </p>
                  {label ? (
                    <p className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-400">
                      {label}
                    </p>
                  ) : null}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
