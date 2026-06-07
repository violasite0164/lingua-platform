'use client';

import { useRef, useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { DEFAULT_SHAPE_TYPEFACE_URL } from '@/lib/course-quiz/shape-glyphs';
import {
  clearCourseQuizShapeTypefaceAction,
  uploadCourseQuizShapeTypefaceAction,
} from '@/lib/mentor/course-quiz-visual-actions';

export function CourseQuizShapeTypefaceUpload({
  quizId,
  currentUrl,
  disabled,
  onMessage,
  onDone,
}: {
  quizId: string;
  currentUrl: string | null;
  disabled?: boolean;
  onMessage: (m: string | null) => void;
  onDone: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();

  function upload(file: File) {
    const fd = new FormData();
    fd.set('file', file);
    onMessage(null);
    startTransition(async () => {
      const res = await uploadCourseQuizShapeTypefaceAction(quizId, fd);
      onMessage(res.success ?? res.error ?? null);
      if (res.success) onDone();
    });
  }

  function clearCustom() {
    onMessage(null);
    startTransition(async () => {
      const res = await clearCourseQuizShapeTypefaceAction(quizId);
      onMessage(res.success ?? res.error ?? null);
      if (res.success) onDone();
    });
  }

  return (
    <div className="space-y-2 rounded-md border border-dashed border-border p-3">
      <p className="text-xs text-muted-foreground">
        一般題目請在「各選項視覺」選擇三角、圓、星形等內建圖形即可。此處為進階：上傳
        Three.js typeface JSON（須含 <code className="text-[11px]">glyphs</code>），目前預設圖形已不再依賴此檔。
      </p>
      {currentUrl ? (
        <p className="break-all text-xs text-muted-foreground">目前：{currentUrl}</p>
      ) : (
        <p className="text-xs text-muted-foreground">目前：使用內建 3D 圖形（無自訂字型檔）</p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
          e.target.value = '';
        }}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled || pending}
          onClick={() => inputRef.current?.click()}
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : '上傳自訂字型 JSON'}
        </Button>
        {currentUrl ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={disabled || pending}
            onClick={() => void clearCustom()}
          >
            改回內建字型
          </Button>
        ) : null}
      </div>
    </div>
  );
}
