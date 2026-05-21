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
        description: description || null,
        is_preview: isPreview,
        xp_reward: Number(xpReward) || 0,
      });
      setMsg(res.success ?? res.error ?? null);
      if (res.success) refresh();
    });
  }

  function handleDelete() {
    if (!confirm('確定刪除此單元？')) return;
    startTransition(async () => {
      const res = await deleteLessonAction(lesson.id);
      setMsg(res.success ?? res.error ?? null);
      refresh();
    });
  }

  function handleSyncMeta() {
    startTransition(async () => {
      const res = await syncLessonStreamMetaAction(lesson.id);
      setMsg(res.success ?? res.error ?? null);
      refresh();
    });
  }

  return (
    <Card className="border-zinc-800 bg-zinc-900/70">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base text-zinc-100">
              單元 #{lesson.sort_order}
            </CardTitle>
            <CardDescription className="text-zinc-500">
              ID: {lesson.id.slice(0, 8)}…
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              className="border-zinc-600 text-zinc-200"
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
              disabled={pending}
              className="bg-red-900/60 hover:bg-red-800"
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {msg && (
          <p className="text-sm text-emerald-400/90" role="status">
            {msg}
          </p>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-zinc-300">標題</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="border-zinc-700 bg-zinc-950/50 text-zinc-100"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-zinc-300">XP 獎勵</Label>
            <Input
              type="number"
              min={0}
              max={1000}
              value={xpReward}
              onChange={(e) => setXpReward(e.target.value)}
              className="border-zinc-700 bg-zinc-950/50 text-zinc-100"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-zinc-300">說明</Label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="flex min-h-[72px] w-full rounded-md border border-zinc-700 bg-zinc-950/50 px-3 py-2 text-sm text-zinc-100"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={isPreview}
            onChange={(e) => setIsPreview(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-600"
          />
          開放為免費預覽單元
        </label>

        <div className="border-t border-zinc-800 pt-4">
          <p className="mb-2 text-sm font-medium text-zinc-300">影片（Cloudflare Stream）</p>
          {lesson.cf_video_uid ? (
            <div className="space-y-3">
              <div className="aspect-video w-full max-w-lg overflow-hidden rounded-md border border-zinc-700 bg-black">
                <iframe
                  title="preview"
                  src={cloudflareStreamIframeSrc(lesson.cf_video_uid)}
                  className="h-full w-full"
                  allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                  allowFullScreen
                />
              </div>
              <p className="text-xs text-zinc-500">
                UID: {lesson.cf_video_uid}
                {lesson.duration_sec > 0 && ` · 長度 ${lesson.duration_sec}s`}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  className="border-zinc-600 text-zinc-200"
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
                  className="border-zinc-600 text-zinc-200"
                  onClick={handleSyncMeta}
                >
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                  同步影片資訊
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <StreamVideoUpload lessonId={lesson.id} disabled={pending} />
              <p className="text-xs text-zinc-500">
                或前往{' '}
                <Link
                  href={`/mentor/courses/${courseId}/upload-video`}
                  className="text-emerald-400 hover:underline"
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
