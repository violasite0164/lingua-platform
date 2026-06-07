'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Upload } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  saveCourseQuizQuestionOutcomeVideoAction,
  saveCourseQuizQuestionVideoAction,
} from '@/lib/mentor/course-quiz-actions';

const ACCEPTED = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/mov'];
const MAX_SIZE = 10 * 1024 ** 3;

function validateVideoFile(file: File): string | null {
  if (!ACCEPTED.includes(file.type) && !file.name.match(/\.(mp4|mov|avi|webm|mkv|m4v)$/i)) {
    return '請選擇影片檔（MP4、MOV、AVI、WebM 等）';
  }
  if (file.size > MAX_SIZE) {
    return '檔案大小不可超過 10 GB';
  }
  return null;
}

function uploadToCloudflare(uploadURL: string, file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    const body = new FormData();
    body.append('file', file);

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(null);
        return;
      }
      resolve(`上傳至 Cloudflare 失敗（HTTP ${xhr.status}）`);
    };
    xhr.onerror = () => resolve('網路錯誤，無法上傳至 Cloudflare');
    xhr.onabort = () => resolve('上傳已取消');

    xhr.open('POST', uploadURL);
    xhr.send(body);
  });
}

export function CourseQuizQuestionVideoUpload({
  questionId,
  kind = 'question',
  label,
  disabled,
  onSaved,
}: {
  questionId: string;
  kind?: 'question' | 'correct' | 'wrong';
  label?: string;
  disabled?: boolean;
  onSaved?: (uid: string) => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || disabled) return;

    const validationError = validateVideoFile(file);
    if (validationError) {
      setError(validationError);
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

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

      const uploadError = await uploadToCloudflare(sessionJson.uploadURL, file);
      if (uploadError) {
        throw new Error(uploadError);
      }

      const saveResult =
        kind === 'question'
          ? await saveCourseQuizQuestionVideoAction(questionId, sessionJson.uid)
          : await saveCourseQuizQuestionOutcomeVideoAction(
              questionId,
              kind === 'correct' ? 'correct' : 'wrong',
              sessionJson.uid,
            );
      if (saveResult.error) {
        setError(saveResult.error);
      } else {
        onSaved?.(sessionJson.uid);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '上傳失敗');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/quicktime,video/webm,video/x-msvideo,.mp4,.mov,.webm,.avi,.mkv,.m4v"
        className="hidden"
        onChange={onFileChange}
        disabled={disabled || uploading}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Upload className="mr-2 h-4 w-4" />
        )}
        {uploading ? '處理中…' : label ?? '上傳影片'}
      </Button>
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
      <p className="text-[11px] text-muted-foreground">
        上傳完成後會寫入 Cloudflare Stream，並連結至此題。儲存題目文字不會影響已上傳影片。
      </p>
    </div>
  );
}
