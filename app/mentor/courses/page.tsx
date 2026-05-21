import Link from 'next/link';
import Image from 'next/image';
import { Plus, Pencil } from 'lucide-react';

import { requireMentor } from '@/lib/mentor/auth';
import { getMentorCourses } from '@/lib/mentor/queries';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const GRADIENTS = [
  'from-violet-600 to-indigo-500',
  'from-emerald-500 to-teal-400',
  'from-rose-500 to-pink-400',
  'from-amber-500 to-orange-400',
  'from-sky-500 to-cyan-400',
  'from-fuchsia-600 to-purple-500',
];

function CoursePlaceholderThumbnail({ title }: { title: string }) {
  const idx = title.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % GRADIENTS.length;
  const initials = title.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  return (
    <div className={`flex h-full w-full flex-col items-center justify-center gap-1.5 bg-gradient-to-br ${GRADIENTS[idx]}`}>
      <span className="text-2xl font-bold text-white/90 drop-shadow">{initials}</span>
      <span className="text-[9px] font-medium uppercase tracking-widest text-white/50">尚無封面</span>
    </div>
  );
}

export default async function MentorCoursesPage() {
  const profile = await requireMentor();
  const courses = await getMentorCourses(profile.id);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-50">課程管理</h1>
          <p className="mt-1 text-sm text-zinc-400">
            檢視、編輯課程與影片單元。
          </p>
        </div>
        <Button
          asChild
          className="bg-emerald-600 text-white hover:bg-emerald-500"
        >
          <Link href="/mentor/courses/new">
            <Plus className="mr-2 h-4 w-4" />
            新增課程
          </Link>
        </Button>
      </div>

      {courses.length === 0 ? (
        <Card className="border-zinc-800 bg-zinc-900/70">
          <CardHeader>
            <CardTitle className="text-zinc-200">尚無課程</CardTitle>
            <CardDescription className="text-zinc-500">
              建立第一門課程，開始上傳影片與教材。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="border-zinc-700 text-zinc-200">
              <Link href="/mentor/courses/new">建立課程</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {courses.map((c) => (
            <Card
              key={c.id}
              className="overflow-hidden border-zinc-800 bg-zinc-900/80"
            >
              <div className="flex h-36 bg-zinc-800 relative">
                {c.thumbnail_url ? (
                  <Image
                    src={c.thumbnail_url}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="(max-width:768px) 100vw, 400px"
                  />
                ) : (
                  <CoursePlaceholderThumbnail title={c.title} />
                )}
              </div>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="line-clamp-2 text-lg text-zinc-50">
                    {c.title}
                  </CardTitle>
                  <Badge
                    variant={c.is_published ? 'default' : 'secondary'}
                    className={
                      c.is_published
                        ? 'bg-emerald-600/90 text-white'
                        : 'bg-zinc-700 text-zinc-300'
                    }
                  >
                    {c.is_published ? '公開' : '草稿'}
                  </Badge>
                </div>
                <CardDescription className="line-clamp-2 text-zinc-500">
                  {c.category?.name ?? '未分類'} · {c.lesson_count} 單元 ·{' '}
                  {c.student_count} 學員
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-between pt-0">
                <span className="text-sm text-zinc-400">
                  {c.is_free ? '免費' : `HK$ ${Number(c.price).toFixed(0)}`}
                </span>
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="border-zinc-600 text-zinc-100 hover:bg-zinc-800"
                >
                  <Link href={`/mentor/courses/${c.id}/edit`}>
                    <Pencil className="mr-1.5 h-3.5 w-3.5" />
                    編輯
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
