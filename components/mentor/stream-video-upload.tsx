'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Upload } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { saveLessonVideoUidAction } from '@/lib/mentor/actions';

type Props = {
  lessonId: string;
  disabled?: boolean;
};

export function StreamVideoUpload({ lessonId, disabled }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || disabled) return;

    setError(null);
    setUploading(true);

    try {
      const sessionRes = await fetch('/api/mentor/stream/direct-upload', {
        method: 'POST',
      });

      const sessionJson = (await sessionRes.json()) as {
        uid?: string;
        uploadURL?: string;
        error?: string;
      };

      if (!sessionRes.ok || !sessionJson.uploadURL || !sessionJson.uid) {
        throw new Error(sessionJson.error ?? '無法建立上傳工作階段');
      }

      const body = new FormData();
      body.append('file', file);

      const upRes = await fetch(sessionJson.uploadURL, {
        method: 'POST',
        body,
      });

      if (!upRes.ok) {
        throw new Error('上傳至 Cloudflare 失敗');
      }

      const saveResult = await saveLessonVideoUidAction(lessonId, sessionJson.uid);
      if (saveResult.error) {
        setError(saveResult.error);
      } else {
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '上傳失敗');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  const busy = uploading;

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={onFileChange}
        disabled={disabled || busy}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || busy}
        className="border-zinc-600 bg-zinc-900/80 text-zinc-100 hover:bg-zinc-800"
        onClick={() => inputRef.current?.click()}
      >
        {busy ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Upload className="mr-2 h-4 w-4" />
        )}
        {busy ? '處理中…' : '上傳影片（Cloudflare Stream）'}
      </Button>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <p className="text-[11px] text-zinc-500">
        上傳完成後會自動寫入 lessons.cf_video_uid，並嘗試同步長度與縮圖。
      </p>
    </div>
  );
}
