'use client';

import { useActionState, useTransition, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Plus, ExternalLink, Trash2 } from 'lucide-react';

import { updateCourseFormAction, createLessonAction, deleteCourseAction, type ActionState } from '@/lib/mentor/actions';
import type { MentorCourseRow } from '@/lib/mentor/queries';
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
import { LessonEditorCard } from '@/components/mentor/lesson-editor-card';
import { PendingSubmitButton } from '@/components/mentor/pending-submit-button';
import type { Tables } from '@/types/database.types';

const LEVELS = [
  { value: 'beginner', label: '初級' },
  { value: 'intermediate', label: '中級' },
  { value: 'advanced', label: '進階' },
] as const;

type Props = {
  course: MentorCourseRow;
  lessons: Tables<'lessons'>[];
  categories: { id: number; name: string }[];
};

const initialUpdateState: ActionState = {};

export function MentorCourseEditForm({ course, lessons, categories }: Props) {
  const router = useRouter();
  const [pendingLesson, startLesson] = useTransition();
  const [pendingDelete, startDelete] = useTransition();
  const [lessonError, setLessonError] = useState<string | null>(null);
  const [updateState, updateAction] = useActionState(
    updateCourseFormAction,
    initialUpdateState,
  );

  function handleDeleteCourse() {
    if (!confirm(`確定要刪除「${course.title}」？\n此操作無法復原，課程下所有單元將一併刪除。`)) return;
    startDelete(async () => {
      try {
        const res = await deleteCourseAction(course.id);
        if (res.error) {
          alert(res.error);
          return;
        }
        router.push('/mentor/courses');
      } catch (err) {
        alert(err instanceof Error ? err.message : '刪除失敗');
      }
    });
  }

  function addLesson() {
    setLessonError(null);
    startLesson(async () => {
      try {
        const res = await createLessonAction(course.id);
        if (res.error) {
          setLessonError(res.error);
          return;
        }
        router.refresh();
      } catch (err) {
        setLessonError(err instanceof Error ? err.message : '新增失敗');
      }
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-50">編輯課程</h1>
          <p className="mt-1 text-sm text-zinc-400">{course.title}</p>
        </div>
        <div className="flex gap-2">
          <Button
            asChild
            variant="outline"
            className="border-zinc-600 text-zinc-200"
          >
            <Link href="/mentor/courses">返回列表</Link>
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={pendingDelete}
            className="bg-red-900/70 hover:bg-red-800"
            onClick={handleDeleteCourse}
          >
            {pendingDelete ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-1.5 h-4 w-4" />
            )}
            刪除課程
          </Button>
        </div>
      </div>

      {updateState.error && (
        <div className="rounded-lg border border-red-500/40 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {updateState.error}
        </div>
      )}
      {updateState.success && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-300">
          {updateState.success}
        </div>
      )}

      <form action={updateAction} className="space-y-6">
        <input type="hidden" name="id" value={course.id} />

        <Card className="border-zinc-800 bg-zinc-900/80">
          <CardHeader>
            <CardTitle className="text-zinc-100">課程資訊</CardTitle>
            <CardDescription className="text-zinc-500">
              儲存後立即生效。縮圖可重新上傳。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-zinc-300">
                標題 *
              </Label>
              <Input
                id="title"
                name="title"
                required
                defaultValue={course.title}
                className="border-zinc-700 bg-zinc-950/50 text-zinc-100"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-zinc-300">
                描述
              </Label>
              <textarea
                id="description"
                name="description"
                rows={4}
                defaultValue={course.description ?? ''}
                className="flex min-h-[100px] w-full rounded-md border border-zinc-700 bg-zinc-950/50 px-3 py-2 text-sm text-zinc-100"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="category_id" className="text-zinc-300">
                  分類
                </Label>
                <select
                  id="category_id"
                  name="category_id"
                  defaultValue={course.category_id ?? ''}
                  className="flex h-9 w-full rounded-md border border-zinc-700 bg-zinc-950/50 px-3 text-sm text-zinc-100"
                >
                  <option value="">未指定</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="level" className="text-zinc-300">
                  難度
                </Label>
                <select
                  id="level"
                  name="level"
                  defaultValue={course.level}
                  className="flex h-9 w-full rounded-md border border-zinc-700 bg-zinc-950/50 px-3 text-sm text-zinc-100"
                >
                  {LEVELS.map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  name="is_free"
                  defaultChecked={course.is_free}
                  className="h-4 w-4 rounded border-zinc-600"
                />
                免費課程
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  name="is_published"
                  defaultChecked={course.is_published}
                  className="h-4 w-4 rounded border-zinc-600"
                />
                公開上架
              </label>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="price" className="text-zinc-300">
                價格（HKD）
              </Label>
              <Input
                id="price"
                name="price"
                type="number"
                min={0}
                step={1}
                defaultValue={course.price}
                className="border-zinc-700 bg-zinc-950/50 text-zinc-100"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="thumbnail" className="text-zinc-300">
                替換縮圖（選填）
              </Label>
              <Input
                id="thumbnail"
                name="thumbnail"
                type="file"
                accept="image/*"
                className="border-zinc-700 bg-zinc-950/50 text-sm text-zinc-300 file:mr-3 file:rounded file:border-0 file:bg-zinc-800 file:px-3 file:py-1 file:text-zinc-200"
              />
            </div>

            <div className="flex justify-end">
              <PendingSubmitButton className="bg-emerald-600 text-white hover:bg-emerald-500">
                儲存課程
              </PendingSubmitButton>
            </div>
          </CardContent>
        </Card>
      </form>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-zinc-100">課程單元</h2>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="border-zinc-600 text-zinc-300"
              asChild
            >
              <Link href={`/mentor/courses/${course.id}/upload-video`}>
                <ExternalLink className="mr-1.5 h-4 w-4" />
                上傳影片
              </Link>
            </Button>
            <Button
              type="button"
              onClick={addLesson}
              disabled={pendingLesson}
              className="bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
            >
              {pendingLesson ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              新增單元
            </Button>
          </div>
        </div>

        {lessonError && (
          <p className="text-sm text-red-400">{lessonError}</p>
        )}

        {lessons.length === 0 ? (
          <p className="text-sm text-zinc-500">
            尚無單元，點「新增單元」開始建立，然後上傳影片。
          </p>
        ) : (
          <div className="space-y-6">
            {lessons.map((lesson) => (
              <LessonEditorCard key={lesson.id} lesson={lesson} courseId={course.id} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
