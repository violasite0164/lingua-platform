'use client';

import { useActionState, useTransition, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Plus, ExternalLink, Trash2 } from 'lucide-react';

import { updateCourseFormAction, createLessonAction, deleteCourseAction, type ActionState } from '@/lib/mentor/actions';
import type { MentorCourseRow } from '@/lib/mentor/queries';
import {
  mentorFileInputClass,
  mentorSelectClass,
  mentorTextareaClass,
} from '@/components/mentor/field-classes';
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [lessonError, setLessonError] = useState<string | null>(null);
  const [updateState, updateAction] = useActionState(
    updateCourseFormAction,
    initialUpdateState,
  );

  function confirmDeleteCourse() {
    setDeleteError(null);
    startDelete(async () => {
      try {
        const res = await deleteCourseAction(course.id);
        if (res.error) {
          setDeleteError(res.error);
          return;
        }
        setDeleteDialogOpen(false);
        router.push(res.redirect ?? '/mentor/courses');
        router.refresh();
      } catch (err) {
        setDeleteError(err instanceof Error ? err.message : '刪除失敗');
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
          <h1 className="text-2xl font-bold text-foreground">編輯課程</h1>
          <p className="mt-1 text-sm text-muted-foreground">{course.title}</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/mentor/courses">返回列表</Link>
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={pendingDelete}
            onClick={() => {
              setDeleteError(null);
              setDeleteDialogOpen(true);
            }}
          >
            <Trash2 className="mr-1.5 h-4 w-4" />
            刪除課程
          </Button>
        </div>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>刪除課程</DialogTitle>
            <DialogDescription>
              確定要刪除「{course.title}」？此操作無法復原，課程下所有單元、教材與學員報名將一併刪除。
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
              onClick={confirmDeleteCourse}
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

      {updateState.error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {updateState.error}
        </div>
      )}
      {updateState.success && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
          {updateState.success}
        </div>
      )}

      <form action={updateAction} className="space-y-6">
        <input type="hidden" name="id" value={course.id} />

        <Card>
          <CardHeader>
            <CardTitle>課程資訊</CardTitle>
            <CardDescription>
              儲存後立即生效。縮圖可重新上傳。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title">
                標題 *
              </Label>
              <Input
                id="title"
                name="title"
                required
                defaultValue={course.title}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">
                描述
              </Label>
              <textarea
                id="description"
                name="description"
                rows={4}
                defaultValue={course.description ?? ''}
                className={mentorTextareaClass}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="category_id">
                  分類
                </Label>
                <select
                  id="category_id"
                  name="category_id"
                  defaultValue={course.category_id ?? ''}
                  className={mentorSelectClass}
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
                <Label htmlFor="level">
                  難度
                </Label>
                <select
                  id="level"
                  name="level"
                  defaultValue={course.level}
                  className={mentorSelectClass}
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
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="is_free"
                  defaultChecked={course.is_free}
                  className="h-4 w-4 rounded border-input"
                />
                免費課程
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="is_published"
                  defaultChecked={course.is_published}
                  className="h-4 w-4 rounded border-input"
                />
                公開上架
              </label>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="price">
                價格（HKD）
              </Label>
              <Input
                id="price"
                name="price"
                type="number"
                min={0}
                step={1}
                defaultValue={course.price}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="thumbnail">
                替換縮圖（選填）
              </Label>
              <Input
                id="thumbnail"
                name="thumbnail"
                type="file"
                accept="image/*"
                className={mentorFileInputClass}
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
          <h2 className="text-lg font-semibold text-foreground">課程單元</h2>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
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
              variant="secondary"
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
          <p className="text-sm text-destructive">{lessonError}</p>
        )}

        {lessons.length === 0 ? (
          <p className="text-sm text-muted-foreground">
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
