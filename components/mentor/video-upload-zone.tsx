'use client';

/**
 * VideoUploadZone
 *
 * 功能：
 * 1. 拖放或點選選取影片檔（最大 10 GB）
 * 2. 向 /api/mentor/stream/direct-upload 取得 Cloudflare Direct Upload session
 * 3. 用 XMLHttpRequest 上傳至 Cloudflare（可取得 upload.onprogress 事件）
 * 4. 完成後呼叫 onComplete(uid) 讓父元件儲存 uid
 */

import { useRef, useState, useCallback } from 'react';
import { Upload, Film, X, CheckCircle2 } from 'lucide-react';

import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ─── 型別 ────────────────────────────────────────────────────────────────────

type UploadPhase =
  | 'idle'        // 尚未選檔
  | 'selected'    // 已選檔，等待上傳
  | 'requesting'  // 向後端要求 upload session
  | 'uploading'   // 正在上傳至 Cloudflare
  | 'saving'      // 呼叫 onComplete 儲存 uid
  | 'done'        // 完成
  | 'error';      // 發生錯誤

type Props = {
  onComplete: (uid: string) => Promise<void>;
  disabled?: boolean;
  className?: string;
};

// ─── 工具 ────────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}

const ACCEPTED = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/mov'];
const MAX_SIZE = 10 * 1024 ** 3; // 10 GB

// ─── 元件 ────────────────────────────────────────────────────────────────────

export function VideoUploadZone({ onComplete, disabled, className }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const xhrRef   = useRef<XMLHttpRequest | null>(null);

  const [phase,    setPhase]    = useState<UploadPhase>('idle');
  const [file,     setFile]     = useState<File | null>(null);
  const [progress, setProgress] = useState(0);   // 0–100
  const [error,    setError]    = useState<string | null>(null);

  // ── 檔案驗證 ───────────────────────────────────────────────────────────────

  function validateFile(f: File): string | null {
    if (!ACCEPTED.includes(f.type) && !f.name.match(/\.(mp4|mov|avi|webm|mkv|m4v)$/i)) {
      return '請選擇影片檔（MP4、MOV、AVI、WebM 等）';
    }
    if (f.size > MAX_SIZE) {
      return `檔案大小不可超過 10 GB（目前 ${formatBytes(f.size)}）`;
    }
    return null;
  }

  function pickFile(f: File) {
    const err = validateFile(f);
    if (err) {
      setError(err);
      setPhase('error');
      return;
    }
    setFile(f);
    setPhase('selected');
    setError(null);
    setProgress(0);
  }

  // ── 拖放 ───────────────────────────────────────────────────────────────────

  const [dragging, setDragging] = useState(false);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const onDragLeave = useCallback(() => setDragging(false), []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) pickFile(f);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 上傳流程 ────────────────────────────────────────────────────────────────

  async function startUpload() {
    if (!file) return;
    setError(null);

    // 步驟 1：向後端取得 Cloudflare Direct Upload session
    setPhase('requesting');
    let uid: string;
    let uploadURL: string;

    try {
      const res = await fetch('/api/mentor/stream/direct-upload', { method: 'POST' });
      const json = (await res.json()) as {
        uid?: string;
        uploadURL?: string;
        error?: string;
      };
      if (!res.ok || !json.uid || !json.uploadURL) {
        throw new Error(json.error ?? '無法建立上傳工作階段');
      }
      uid = json.uid;
      uploadURL = json.uploadURL;
    } catch (err) {
      setError(err instanceof Error ? err.message : '取得上傳連結失敗');
      setPhase('error');
      return;
    }

    // 步驟 2：用 XMLHttpRequest 上傳（可取得進度）
    setPhase('uploading');
    setProgress(0);

    const uploadError = await new Promise<string | null>((resolve) => {
      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;

      const body = new FormData();
      body.append('file', file);

      xhr.upload.onprogress = (ev) => {
        if (ev.lengthComputable) {
          setProgress(Math.round((ev.loaded / ev.total) * 100));
        }
      };

      xhr.onload = () => {
        xhrRef.current = null;
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(null);
        } else {
          resolve(`上傳至 Cloudflare 失敗（HTTP ${xhr.status}）`);
        }
      };

      xhr.onerror = () => {
        xhrRef.current = null;
        resolve('網路錯誤，請重試');
      };

      xhr.onabort = () => {
        xhrRef.current = null;
        resolve('已取消上傳');
      };

      xhr.open('POST', uploadURL);
      xhr.send(body);
    });

    if (uploadError) {
      setError(uploadError);
      setPhase('error');
      return;
    }

    // 步驟 3：呼叫父元件 onComplete 儲存 uid 至資料庫
    setPhase('saving');
    setProgress(100);

    try {
      await onComplete(uid);
      setPhase('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : '儲存影片 UID 失敗');
      setPhase('error');
    }
  }

  function cancelUpload() {
    xhrRef.current?.abort();
    reset();
  }

  function reset() {
    xhrRef.current = null;
    setFile(null);
    setPhase('idle');
    setProgress(0);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  // ── 狀態文字 ───────────────────────────────────────────────────────────────

  const phaseLabel: Record<UploadPhase, string> = {
    idle:       '',
    selected:   '已選取，點「開始上傳」繼續',
    requesting: '正在建立上傳工作階段…',
    uploading:  `上傳中… ${progress}%`,
    saving:     '正在寫入資料庫…',
    done:       '上傳完成！',
    error:      error ?? '發生錯誤',
  };

  const isActive = ['requesting', 'uploading', 'saving'].includes(phase);
  const isDone   = phase === 'done';

  // ── 渲染 ───────────────────────────────────────────────────────────────────

  return (
    <div className={cn('space-y-3', className)}>
      {/* Drop zone */}
      <div
        role="button"
        tabIndex={disabled || isActive || isDone ? -1 : 0}
        aria-label="選取影片檔案"
        onDragOver={!disabled && !isActive ? onDragOver : undefined}
        onDragLeave={onDragLeave}
        onDrop={!disabled && !isActive ? onDrop : undefined}
        onClick={() => {
          if (!disabled && !isActive && !isDone) inputRef.current?.click();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
        }}
        className={cn(
          'relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 transition-colors select-none',
          dragging
            ? 'border-emerald-400 bg-emerald-950/30'
            : isDone
              ? 'border-emerald-600/60 bg-emerald-950/20'
              : phase === 'error'
                ? 'border-red-500/50 bg-red-950/20'
                : 'border-zinc-700 bg-zinc-900/50 hover:border-zinc-500 hover:bg-zinc-800/50',
          (disabled || isActive) && 'pointer-events-none opacity-70',
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="video/*"
          className="hidden"
          disabled={disabled || isActive}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) pickFile(f);
          }}
        />

        {isDone ? (
          <CheckCircle2 className="h-10 w-10 text-emerald-400" />
        ) : (
          <Film className={cn(
            'h-10 w-10',
            phase === 'error' ? 'text-red-400' : 'text-zinc-500',
          )} />
        )}

        <div className="text-center">
          {file ? (
            <>
              <p className="text-sm font-medium text-zinc-200">{file.name}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{formatBytes(file.size)}</p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-zinc-300">
                {dragging ? '放開以選取' : '拖放影片或點此選取'}
              </p>
              <p className="mt-0.5 text-xs text-zinc-500">
                MP4、MOV、AVI、WebM … 最大 10 GB
              </p>
            </>
          )}
        </div>

        {/* 進度條（上傳中才顯示） */}
        {(phase === 'uploading' || phase === 'saving') && (
          <div className="w-full max-w-xs space-y-1">
            <Progress
              value={progress}
              className="h-2 bg-zinc-800"
              indicatorClassName="bg-emerald-500"
            />
            <p className="text-center text-xs text-zinc-400">{phaseLabel[phase]}</p>
          </div>
        )}
      </div>

      {/* 狀態文字 / 錯誤訊息 */}
      {phase === 'error' && error && (
        <p className="flex items-center gap-1.5 text-sm text-red-400">
          <X className="h-4 w-4 shrink-0" />
          {error}
        </p>
      )}
      {isDone && (
        <p className="text-sm text-emerald-400">✓ 影片已上傳並連結到此單元</p>
      )}
      {phase === 'requesting' && (
        <p className="text-xs text-zinc-500">正在聯繫 Cloudflare Stream…</p>
      )}

      {/* 操作按鈕 */}
      <div className="flex flex-wrap gap-2">
        {phase === 'selected' && (
          <>
            <Button
              type="button"
              size="sm"
              className="bg-emerald-600 text-white hover:bg-emerald-500"
              onClick={startUpload}
            >
              <Upload className="mr-1.5 h-4 w-4" />
              開始上傳
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-zinc-400"
              onClick={reset}
            >
              取消選取
            </Button>
          </>
        )}

        {isActive && (
          <Button
            type="button"
            size="sm"
            variant="destructive"
            className="bg-red-900/60 hover:bg-red-800"
            onClick={cancelUpload}
          >
            取消上傳
          </Button>
        )}

        {(isDone || phase === 'error') && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-zinc-600 text-zinc-300"
            onClick={reset}
          >
            重新選取
          </Button>
        )}
      </div>
    </div>
  );
}
