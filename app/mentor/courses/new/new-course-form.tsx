'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { createCourseFormAction, type ActionState } from '@/lib/mentor/actions';
import { PendingSubmitButton } from '@/components/mentor/pending-submit-button';
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
          <h1 className="text-2xl font-bold text-zinc-50">新增課程</h1>
          <p className="mt-1 text-sm text-zinc-400">
            建立後可至編輯頁新增單元與上傳影片。
          </p>
        </div>
        <Button
          asChild
          variant="ghost"
          className="text-zinc-400 hover:text-zinc-200"
        >
          <Link href="/mentor/courses">返回</Link>
        </Button>
      </div>

      {state.error && (
        <div className="rounded-lg border border-red-500/40 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {state.error}
        </div>
      )}

      <Card className="border-zinc-800 bg-zinc-900/80">
        <CardHeader>
          <CardTitle className="text-zinc-100">基本資料</CardTitle>
          <CardDescription className="text-zinc-500">
            標題、價格與公開設定。縮圖可選。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title" className="text-zinc-300">
              課程標題 *
            </Label>
            <Input
              id="title"
              name="title"
              required
              placeholder="例：商務英語實戰"
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
              placeholder="簡述課程內容與對象…"
              className="flex min-h-[100px] w-full rounded-md border border-zinc-700 bg-zinc-950/50 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/60"
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
                defaultValue=""
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
                defaultValue="beginner"
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

          <div className="flex flex-wrap items-center gap-6">
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                name="is_free"
                className="h-4 w-4 rounded border-zinc-600"
              />
              免費課程
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                name="is_published"
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
              defaultValue={0}
              className="border-zinc-700 bg-zinc-950/50 text-zinc-100"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="thumbnail" className="text-zinc-300">
              課程縮圖（選填）
            </Label>
            <Input
              id="thumbnail"
              name="thumbnail"
              type="file"
              accept="image/*"
              className="border-zinc-700 bg-zinc-950/50 text-sm text-zinc-300 file:mr-3 file:rounded file:border-0 file:bg-zinc-800 file:px-3 file:py-1 file:text-zinc-200"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          className="border-zinc-600 text-zinc-200"
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
