'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { createCourseFormAction, type ActionState } from '@/lib/mentor/actions';
import { PendingSubmitButton } from '@/components/mentor/pending-submit-button';
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

const LEVELS = [
  { value: 'beginner', label: '初級' },
  { value: 'intermediate', label: '中級' },
  { value: 'advanced', label: '進階' },
] as const;

type Props = {
  categories: { id: number; name: string }[];
};

const initialState: ActionState = {};

export function NewCourseForm({ categories }: Props) {
  const router = useRouter();
  const [state, formAction] = useActionState(createCourseFormAction, initialState);

  useEffect(() => {
    if (state.redirect) router.push(state.redirect);
  }, [state.redirect, router]);

  return (
    <form action={formAction} className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">新增課程</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            建立後可至編輯頁新增單元與上傳影片。
          </p>
        </div>
        <Button asChild variant="ghost">
          <Link href="/mentor/courses">返回</Link>
        </Button>
      </div>

      {state.error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>基本資料</CardTitle>
          <CardDescription>
            標題、價格與公開設定。縮圖可選。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">
              課程標題 *
            </Label>
            <Input
              id="title"
              name="title"
              required
              placeholder="例：商務英語實戰"
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
              placeholder="簡述課程內容與對象…"
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
                defaultValue=""
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
                defaultValue="beginner"
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

          <div className="flex flex-wrap items-center gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="is_free"
                className="h-4 w-4 rounded border-input"
              />
              免費課程
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="is_published"
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
              defaultValue={0}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="thumbnail">
              課程縮圖（選填）
            </Label>
            <Input
              id="thumbnail"
              name="thumbnail"
              type="file"
              accept="image/*"
              className={mentorFileInputClass}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          asChild
        >
          <Link href="/mentor/courses">取消</Link>
        </Button>
        <PendingSubmitButton className="bg-emerald-600 text-white hover:bg-emerald-500">
          建立並前往編輯
        </PendingSubmitButton>
      </div>
    </form>
  );
}
