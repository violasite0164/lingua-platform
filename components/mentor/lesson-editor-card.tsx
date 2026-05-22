'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Loader2, Trash2, RefreshCw, ExternalLink } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { mentorTextareaClass } from '@/components/mentor/field-classes';
import { LessonCueDialog } from '@/components/mentor/lesson-cue-dialog';
import { LessonTextbookDialog } from '@/components/mentor/lesson-textbook-dialog';
import { StreamVideoUpload } from '@/components/mentor/stream-video-upload';
import {
  deleteLessonAction,
  syncLessonStreamMetaAction,
  updateLessonAction,
} from '@/lib/mentor/actions';
import { cloudflareStreamIframeSrc } from '@/lib/stream/embed';
import type { Tables } from '@/types/database.types';

type Lesson = Tables<'lessons'>;

export function LessonEditorCard({
  lesson,
  courseId,
}: {
  lesson: Lesson;
  courseId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [pendingDelete, startDeleteTransition] = useTransition();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [title, setTitle] = useState(lesson.title);
  const [description, setDescription] = useState(lesson.description ?? '');
  const [isPreview, setIsPreview] = useState(lesson.is_preview);
  const [xpReward, setXpReward] = useState(String(lesson.xp_reward));
  const [msg, setMsg] = useState<string | null>(null);

  function refresh() {
    router.refresh();
  }

  function handleSave() {
    setMsg(null);
    startTransition(async () => {
      const res = await updateLessonAction(lesson.id, {
        title,
        description,
        is_preview: isPreview,
        xp_reward: Number(xpReward) || 0,
      });
      setMsg(res.success ?? res.error ?? null);
      refresh();
    });
  }

  function confirmDeleteLesson() {
    setDeleteError(null);
    startDeleteTransition(async () => {
      try {
        const res = await deleteLessonAction(lesson.id);
        if (res.error) {
          setDeleteError(res.error);
          return;
        }
        setDeleteDialogOpen(false);
        setMsg(res.success ?? '已刪除單元');
        refresh();
      } catch (err) {
        setDeleteError(err instanceof Error ? err.message : '刪除失敗');
      }
    });
  }

  function handleSyncMeta() {
    setMsg(null);
    startTransition(async () => {
      const res = await syncLessonStreamMetaAction(lesson.id);
      setMsg(res.success ?? res.error ?? null);
      refresh();
    });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">
              單元 #{lesson.sort_order}
            </CardTitle>
            <CardDescription>
              ID: {lesson.id.slice(0, 8)}…
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={handleSave}
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                '儲存單元'
              )}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={pending || pendingDelete}
              onClick={() => {
                setDeleteError(null);
                setDeleteDialogOpen(true);
              }}
              aria-label="刪除單元"
            >
              {pendingDelete ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>刪除單元</DialogTitle>
              <DialogDescription>
                確定要刪除「{title || lesson.title}」？此操作無法復原，相關影片、教材、即時互動與學員進度將一併刪除。
              </DialogDescription>
            </DialogHeader>
            {deleteError ? (
              <p className="text-sm text-destructive" role="alert">
                {deleteError}
              </p>
            ) : null}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                disabled={pendingDelete}
                onClick={() => setDeleteDialogOpen(false)}
              >
                取消
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={pendingDelete}
                onClick={confirmDeleteLesson}
              >
                {pendingDelete ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    刪除中…
                  </>
                ) : (
                  '確認刪除'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {msg && (
          <p
            className={
              msg.includes('失敗') || msg.includes('無法') || msg.includes('錯誤')
                ? 'text-sm text-destructive'
                : 'text-sm text-emerald-600 dark:text-emerald-400/90'
            }
            role="status"
          >
            {msg}
          </p>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>標題</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>XP 獎勵</Label>
            <Input
              type="number"
              min={0}
              max={1000}
              value={xpReward}
              onChange={(e) => setXpReward(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>說明</Label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className={mentorTextareaClass}
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isPreview}
            onChange={(e) => setIsPreview(e.target.checked)}
            className="h-4 w-4 rounded border-input"
          />
          開放為免費預覽單元
        </label>

        <div className="border-t border-border pt-4">
          <p className="mb-2 text-sm font-medium">影片（Cloudflare Stream）</p>
          {lesson.cf_video_uid ? (
            <div className="space-y-3">
              <div className="aspect-video w-full max-w-lg overflow-hidden rounded-md border border-border bg-black">
                <iframe
                  title="preview"
                  src={cloudflareStreamIframeSrc(lesson.cf_video_uid)}
                  className="h-full w-full"
                  allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                  allowFullScreen
                />
              </div>
              <p className="text-xs text-muted-foreground">
                UID: {lesson.cf_video_uid}
                {lesson.duration_sec > 0 && ` · 長度 ${lesson.duration_sec}s`}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  asChild
                >
                  <Link href={`/mentor/courses/${courseId}/upload-video`}>
                    <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                    上傳新影片
                  </Link>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={handleSyncMeta}
                >
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                  同步影片資訊
                </Button>
                <LessonTextbookDialog lessonId={lesson.id} disabled={pending} />
                <LessonCueDialog
                  lessonId={lesson.id}
                  lessonTitle={title}
                  disabled={pending}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <StreamVideoUpload lessonId={lesson.id} disabled={pending} />
                <LessonTextbookDialog lessonId={lesson.id} disabled={pending} />
                <LessonCueDialog
                  lessonId={lesson.id}
                  lessonTitle={title}
                  disabled={pending}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                或前往{' '}
                <Link
                  href={`/mentor/courses/${courseId}/upload-video`}
                  className="text-emerald-600 hover:underline dark:text-emerald-400"
                >
                  影片上傳頁
                </Link>
                {' '}使用拖放介面並查看進度。
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
