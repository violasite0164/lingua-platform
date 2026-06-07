'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { Loader2, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  VOCABULARY_SHAPE_KINDS,
  VOCABULARY_SHAPE_PRESETS,
  isVocabularyShapeKind,
  normalizeVocabularyShapeKind,
} from '@/lib/course-quiz/vocabulary-shape-presets';
import {
  clearCourseQuizOptionImageAction,
  updateCourseQuizOptionShapeGlyphsAction,
} from '@/lib/mentor/course-quiz-visual-actions';

export function CourseQuizOptionVisualFields({
  questionId,
  optionLabels,
  imageUrls,
  shapeGlyphs,
  disabled,
  onMessage,
  onDone,
}: {
  questionId: string;
  optionLabels: readonly string[];
  imageUrls: string[];
  shapeGlyphs: string[];
  disabled?: boolean;
  onMessage: (m: string | null) => void;
  onDone: () => void;
}) {
  const [glyphDraft, setGlyphDraft] = useState(() =>
    shapeGlyphs.map((g) => normalizeVocabularyShapeKind(g)),
  );
  const [imageDraft, setImageDraft] = useState(() => [...imageUrls]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileRefs = useRef<(HTMLInputElement | null)[]>([]);
  const imageUrlsKey = JSON.stringify(imageUrls);

  // 僅在題目切換或伺服器 URL 內容變更時同步；勿用陣列參考比對（父層每次 render 都會產生新陣列）
  useEffect(() => {
    setImageDraft(JSON.parse(imageUrlsKey) as string[]);
  }, [questionId, imageUrlsKey]);

  function saveGlyphs() {
    onMessage(null);
    startTransition(async () => {
      const res = await updateCourseQuizOptionShapeGlyphsAction(questionId, glyphDraft);
      onMessage(res.success ?? res.error ?? null);
      if (res.success) onDone();
    });
  }

  function uploadImage(optionIndex: number, file: File) {
    const fd = new FormData();
    fd.set('questionId', questionId);
    fd.set('optionIndex', String(optionIndex));
    fd.set('file', file);
    onMessage(null);
    setUploadError(null);
    startTransition(async () => {
      try {
        const res = await fetch('/api/mentor/course-quiz/option-image', {
          method: 'POST',
          body: fd,
        });
        const json = (await res.json()) as {
          success?: string;
          error?: string;
          publicUrl?: string;
        };
        if (!res.ok || json.error) {
          const msg = json.error ?? '上傳失敗';
          setUploadError(msg);
          onMessage(msg);
          return;
        }
        onMessage(json.success ?? '選項圖片已上傳');
        if (json.publicUrl) {
          setImageDraft((prev) => {
            const next = [...prev];
            next[optionIndex] = json.publicUrl!;
            return next;
          });
          // 已更新本地預覽，略過 router.refresh（dev 編譯空窗常觸發 500）
        } else {
          onDone();
        }
      } catch {
        const msg = '上傳失敗，請稍後再試';
        setUploadError(msg);
        onMessage(msg);
      }
    });
  }

  function clearImage(optionIndex: number) {
    onMessage(null);
    startTransition(async () => {
      const res = await clearCourseQuizOptionImageAction(questionId, optionIndex);
      onMessage(res.success ?? res.error ?? null);
      if (res.success) {
        setImageDraft((prev) => {
          const next = [...prev];
          next[optionIndex] = '';
          return next;
        });
      }
    });
  }

  return (
    <div className="space-y-3 rounded-md border border-border bg-muted/20 p-3">
      <p className="text-xs font-medium text-foreground">圖形模式 · 各選項視覺</p>
      <p className="text-[11px] text-muted-foreground">
        為每個選項選擇內建立體圖形；已上傳圖片時優先顯示圖片。
      </p>
      {optionLabels.map((label, i) => {
        const kind = glyphDraft[i] ?? 'circle';

        return (
          <div key={label} className="space-y-2 rounded border border-border/80 bg-background p-2">
            <p className="text-xs font-semibold">選項 {label}</p>
            <div>
              <Label className="text-[11px]">立體圖形</Label>
              <select
                className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                value={kind}
                disabled={disabled || pending}
                onChange={(e) => {
                  const v = e.target.value;
                  setGlyphDraft((prev) => {
                    const next = [...prev];
                    next[i] = isVocabularyShapeKind(v) ? v : 'circle';
                    return next;
                  });
                }}
              >
                {VOCABULARY_SHAPE_KINDS.map((id) => (
                  <option key={id} value={id}>
                    {VOCABULARY_SHAPE_PRESETS[id].label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {VOCABULARY_SHAPE_PRESETS[kind].description}
              </p>
            </div>
            <div>
              <Label className="text-[11px]">選項圖片（優先）</Label>
              {imageDraft[i] ? (
                <div className="mt-1 flex items-center gap-2">
                  <div className="flex h-20 max-w-32 items-center justify-center rounded border bg-muted/20 p-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageDraft[i]!}
                      alt={`選項 ${label} 圖片`}
                      className="max-h-20 max-w-full object-contain"
                    />
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    disabled={disabled || pending}
                    onClick={() => clearImage(i)}
                    aria-label="移除圖片"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <p className="mt-1 text-[11px] text-muted-foreground">尚未上傳</p>
              )}
              <input
                ref={(el) => {
                  fileRefs.current[i] = el;
                }}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadImage(i, f);
                  e.target.value = '';
                }}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-1"
                disabled={disabled || pending}
                onClick={() => fileRefs.current[i]?.click()}
              >
                上傳圖片
              </Button>
            </div>
          </div>
        );
      })}
      {uploadError ? (
        <p className="text-xs text-red-500" role="alert">
          {uploadError}
        </p>
      ) : null}
      <Button type="button" size="sm" disabled={disabled || pending} onClick={() => saveGlyphs()}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : '儲存圖形設定'}
      </Button>
    </div>
  );
}
