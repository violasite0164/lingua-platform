'use client';

/**
 * UploadVideoClient
 *
 * 功能：
 * - 選擇要附加影片的課堂（Lesson）
 * - 填寫單元標題（可選：建立新單元或直接選現有單元）
 * - 使用 VideoUploadZone 上傳影片至 Cloudflare Stream
 * - 上傳成功後呼叫 Server Action 寫入 lessons.cf_video_uid
 */

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { PlusCircle, Film } from 'lucide-react';

import { VideoUploadZone } from '@/components/mentor/video-upload-zone';
import { mentorTextareaClass } from '@/components/mentor/field-classes';
import {
  saveLessonVideoUidAction,
  createLessonAction,
} from '@/lib/mentor/actions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { Tables } from '@/types/database.types';

type Lesson = Tables<'lessons'>;

type Props = {
  lessons: Lesson[];
  courseId: string;
};

type Mode = 'pick' | 'new';

export function UploadVideoClient({ lessons, courseId }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [mode, setMode] = useState<Mode>(lessons.length > 0 ? 'pick' : 'new');

  const [selectedLessonId, setSelectedLessonId] = useState<string>(
    lessons[0]?.id ?? '',
  );

  const [newTitle,   setNewTitle]   = useState('');
  const [newDesc,    setNewDesc]    = useState('');
  const [createdId,  setCreatedId]  = useState<string | null>(null);

  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  const targetLessonId =
    mode === 'pick'
      ? selectedLessonId
      : createdId ?? '';

  function handleCreateLesson() {
    if (!newTitle.trim()) {
      setInfoMsg('請輸入單元標題');
      return;
    }
    setInfoMsg(null);

    startTransition(async () => {
      const res = await createLessonAction(courseId);
      if (res.error) {
        setInfoMsg(`建立失敗：${res.error}`);
        return;
      }
      const newId = res.data?.id as string | undefined;
      if (newId) {
        setCreatedId(newId);
        setInfoMsg('單元已建立，請在下方上傳影片。');
      } else {
        setInfoMsg('單元已建立，請重新整理頁面後選取單元再上傳。');
        router.refresh();
      }
    });
  }

  async function handleUploadComplete(uid: string) {
    if (!targetLessonId) {
      throw new Error('尚未選取單元，無法儲存影片');
    }

    const res = await saveLessonVideoUidAction(targetLessonId, uid);
    if (res.error) {
      throw new Error(res.error);
    }

    router.push(`/mentor/courses/${courseId}/edit`);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Film className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            步驟 1：選擇上傳目標單元
          </CardTitle>
          <CardDescription>
            影片上傳完成後會自動綁定到所選單元。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            {lessons.length > 0 && (
              <Button
                type="button"
                size="sm"
                variant={mode === 'pick' ? 'default' : 'outline'}
                className={
                  mode === 'pick'
                    ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                    : undefined
                }
                onClick={() => setMode('pick')}
              >
                選擇現有單元
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              variant={mode === 'new' ? 'default' : 'outline'}
              className={
                mode === 'new'
                  ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                  : undefined
              }
              onClick={() => setMode('new')}
            >
              <PlusCircle className="mr-1.5 h-4 w-4" />
              建立新單元
            </Button>
          </div>

          {mode === 'pick' && lessons.length > 0 && (
            <div className="space-y-2">
              <Label>選擇單元</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {lessons.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setSelectedLessonId(l.id)}
                    className={cn(
                      'flex flex-col items-start rounded-lg border px-4 py-3 text-left text-sm transition-colors',
                      selectedLessonId === l.id
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200'
                        : 'border-border bg-card text-foreground hover:border-emerald-500/50',
                    )}
                  >
                    <span className="font-medium">#{l.sort_order} {l.title}</span>
                    {l.cf_video_uid ? (
                      <span className="mt-0.5 text-xs text-amber-600 dark:text-amber-400">
                        ⚠ 已有影片（將被覆蓋）
                      </span>
                    ) : (
                      <span className="mt-0.5 text-xs text-muted-foreground">無影片</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {mode === 'new' && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="new-title">
                  單元標題 *
                </Label>
                <Input
                  id="new-title"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="例：第一課：自我介紹"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-desc">
                  說明（選填）
                </Label>
                <textarea
                  id="new-desc"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  rows={2}
                  className={mentorTextareaClass}
                />
              </div>

              {createdId ? (
                <p className="text-sm text-emerald-600 dark:text-emerald-400">
                  ✓ 單元已建立，請在下方上傳影片。
                </p>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  disabled={pending}
                  variant="secondary"
                  onClick={handleCreateLesson}
                >
                  {pending ? '建立中…' : '建立單元'}
                </Button>
              )}
            </div>
          )}

          {infoMsg && (
            <p className="text-sm text-amber-600 dark:text-amber-400">{infoMsg}</p>
          )}

          {targetLessonId && (
            <p className="text-xs text-muted-foreground">
              影片將綁定至：<span className="text-foreground">{
                lessons.find((l) => l.id === targetLessonId)?.title
                  ?? '新建單元'
              }</span>
            </p>
          )}
        </CardContent>
      </Card>

      <Card className={cn(
        'transition-opacity',
        !targetLessonId && 'pointer-events-none opacity-40',
      )}>
        <CardHeader>
          <CardTitle>
            步驟 2：上傳影片
          </CardTitle>
          <CardDescription>
            {!targetLessonId
              ? '請先完成步驟 1 選擇或建立單元'
              : '拖放或點選影片檔案，支援最大 10 GB。'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <VideoUploadZone
            onComplete={handleUploadComplete}
            disabled={!targetLessonId}
          />
        </CardContent>
      </Card>
    </div>
  );
}
