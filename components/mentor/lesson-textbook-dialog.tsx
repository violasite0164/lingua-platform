'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2,
  Trash2,
  Upload,
} from 'lucide-react';

import {
  deleteLessonTextbookAction,
  listLessonTextbooksAction,
  reorderLessonTextbooksAction,
} from '@/lib/mentor/textbook-actions';
import { LESSON_TEXTBOOK_ACCEPT } from '@/lib/mentor/textbook-storage';
import { mentorFileInputClass } from '@/components/mentor/field-classes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { Tables } from '@/types/database.types';

type Textbook = Tables<'lesson_textbooks'>;

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function isPdfFile(file: File): boolean {
  if (file.type === 'application/pdf') return true;
  return file.name.toLowerCase().endsWith('.pdf');
}

function formatPageRange(tb: Textbook): string | null {
  if (tb.page_start != null && tb.page_end != null) {
    const src =
      tb.source_page_count != null ? ` / 原檔 ${tb.source_page_count} 頁` : '';
    return `第 ${tb.page_start}–${tb.page_end} 頁${src}`;
  }
  return null;
}

type Props = {
  lessonId: string;
  disabled?: boolean;
};

export function LessonTextbookDialog({ lessonId, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [textbooks, setTextbooks] = useState<Textbook[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [title, setTitle] = useState('');
  const [selectedPdf, setSelectedPdf] = useState(false);
  const [cropPdf, setCropPdf] = useState(false);
  const [pageStart, setPageStart] = useState('1');
  const [pageEnd, setPageEnd] = useState('1');
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const loadList = useCallback(async () => {
    setLoadingList(true);
    setMsg(null);
    const res = await listLessonTextbooksAction(lessonId);
    setLoadingList(false);
    if (res.error) {
      setMsg(res.error);
      setTextbooks([]);
      return;
    }
    setTextbooks(res.textbooks);
  }, [lessonId]);

  useEffect(() => {
    if (open) void loadList();
  }, [open, loadList]);

  function onFileChange() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setSelectedPdf(false);
      setCropPdf(false);
      return;
    }
    const pdf = isPdfFile(file);
    setSelectedPdf(pdf);
    if (!pdf) {
      setCropPdf(false);
      return;
    }
    setCropPdf(true);
    setPageStart('1');
    setPageEnd('1');
  }

  function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setMsg('請選擇檔案');
      return;
    }

    if (selectedPdf && cropPdf) {
      const start = Number.parseInt(pageStart, 10);
      const end = Number.parseInt(pageEnd, 10);
      if (!Number.isFinite(start) || !Number.isFinite(end) || start < 1 || end < 1) {
        setMsg('請輸入有效的 PDF 頁碼');
        return;
      }
      if (end < start) {
        setMsg('結束頁不可小於開始頁');
        return;
      }
    }

    const formData = new FormData();
    formData.set('lesson_id', lessonId);
    formData.set('file', file);
    if (title.trim()) formData.set('title', title.trim());
    if (selectedPdf && cropPdf) {
      formData.set('crop_pdf', '1');
      formData.set('page_start', pageStart.trim());
      formData.set('page_end', pageEnd.trim());
    }

    startTransition(async () => {
      let res: { success?: string; error?: string };
      try {
        const uploadRes = await fetch('/api/mentor/lesson-textbooks/upload', {
          method: 'POST',
          body: formData,
        });
        res = (await uploadRes.json()) as { success?: string; error?: string };
        if (!uploadRes.ok && !res.error) {
          res = { error: '上傳失敗' };
        }
      } catch {
        res = { error: '網路錯誤，請重試' };
      }
      setMsg(res.success ?? res.error ?? null);
      if (res.success) {
        setTitle('');
        setCropPdf(false);
        setPageStart('1');
        setPageEnd('1');
        setSelectedPdf(false);
        if (fileRef.current) fileRef.current.value = '';
        await loadList();
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm('確定刪除此課本檔案？')) return;
    startTransition(async () => {
      const res = await deleteLessonTextbookAction(id);
      setMsg(res.success ?? res.error ?? null);
      if (!res.error) await loadList();
    });
  }

  function moveItem(index: number, direction: -1 | 1) {
    const next = index + direction;
    if (next < 0 || next >= textbooks.length) return;

    const ordered = [...textbooks];
    const [item] = ordered.splice(index, 1);
    ordered.splice(next, 0, item);

    setTextbooks(ordered);

    startTransition(async () => {
      const res = await reorderLessonTextbooksAction(
        lessonId,
        ordered.map((t) => t.id),
      );
      if (res.error) {
        setMsg(res.error);
        await loadList();
      } else {
        setMsg(res.success ?? null);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled}
        >
          <BookOpen className="mr-1.5 h-3.5 w-3.5" />
          課本上傳
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] w-[min(calc(100vw-2rem),72rem)] max-w-none overflow-y-auto">
        <DialogHeader>
          <DialogTitle>課本教材</DialogTitle>
          <DialogDescription>
            上傳 PDF、Word、PowerPoint 或圖片。PDF 可指定頁碼，系統會裁切後再儲存。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-3 rounded-lg border border-dashed border-border bg-muted/30 p-4">
            <div className="space-y-1.5">
              <Label htmlFor={`textbook-title-${lessonId}`}>顯示名稱（選填）</Label>
              <Input
                id={`textbook-title-${lessonId}`}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例：第一課課本"
                disabled={pending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`textbook-file-${lessonId}`}>選擇檔案</Label>
              <Input
                ref={fileRef}
                id={`textbook-file-${lessonId}`}
                type="file"
                accept={LESSON_TEXTBOOK_ACCEPT}
                className={mentorFileInputClass}
                disabled={pending}
                onChange={onFileChange}
              />
              <p className="text-[11px] text-muted-foreground">
                PDF / Word / PPT / 圖片，單檔最大 50 MiB
              </p>
            </div>

            {selectedPdf && (
              <div className="space-y-3 rounded-md border border-border bg-background/80 p-3">
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={cropPdf}
                    onChange={(e) => setCropPdf(e.target.checked)}
                    disabled={pending}
                    className="mt-0.5 h-4 w-4 rounded border-input"
                  />
                  <span>
                    <span className="font-medium">僅上傳指定頁面</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      上傳時自動裁切 PDF，學員只會看到選定頁面
                    </span>
                  </span>
                </label>
                {cropPdf && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor={`page-start-${lessonId}`}>開始頁</Label>
                      <Input
                        id={`page-start-${lessonId}`}
                        type="number"
                        min={1}
                        value={pageStart}
                        onChange={(e) => setPageStart(e.target.value)}
                        disabled={pending}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`page-end-${lessonId}`}>結束頁</Label>
                      <Input
                        id={`page-end-${lessonId}`}
                        type="number"
                        min={1}
                        value={pageEnd}
                        onChange={(e) => setPageEnd(e.target.value)}
                        disabled={pending}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            <Button
              type="button"
              size="sm"
              className="w-full bg-emerald-600 text-white hover:bg-emerald-500"
              disabled={pending}
              onClick={handleUpload}
            >
              {pending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              上傳
            </Button>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">已上傳（{textbooks.length}）</p>
            {loadingList ? (
              <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                載入中…
              </div>
            ) : textbooks.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                尚無課本檔案
              </p>
            ) : (
              <ul className="space-y-2">
                {textbooks.map((tb, index) => {
                  const pageLabel = formatPageRange(tb);
                  return (
                    <li
                      key={tb.id}
                      className="flex items-start gap-2 rounded-lg border border-border bg-card p-3"
                    >
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded bg-muted text-xs font-medium text-muted-foreground">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{tb.title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {tb.file_name} · {formatBytes(Number(tb.file_size_bytes))}
                        </p>
                        {pageLabel && (
                          <p className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-400">
                            {pageLabel}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-col gap-0.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          disabled={pending || index === 0}
                          onClick={() => moveItem(index, -1)}
                          aria-label="上移"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          disabled={pending || index === textbooks.length - 1}
                          onClick={() => moveItem(index, 1)}
                          aria-label="下移"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex shrink-0 flex-col gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          asChild
                        >
                          <a href={tb.file_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          disabled={pending}
                          onClick={() => handleDelete(tb.id)}
                          aria-label="刪除"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {msg && (
            <p
              className={
                msg.includes('失敗') || msg.includes('請') || msg.includes('僅') || msg.includes('無法')
                  ? 'text-sm text-destructive'
                  : 'text-sm text-emerald-600 dark:text-emerald-400'
              }
              role="status"
            >
              {msg}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
