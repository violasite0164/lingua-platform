import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { BookOpen, Users } from 'lucide-react';

import { getPublishedCourses } from '@/lib/supabase/queries';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '課程總覽',
  description: '探索所有公開課程',
};

const GRADIENTS = [
  'from-violet-600 to-indigo-500',
  'from-emerald-500 to-teal-400',
  'from-rose-500 to-pink-400',
  'from-amber-500 to-orange-400',
  'from-sky-500 to-cyan-400',
  'from-fuchsia-600 to-purple-500',
];

const LEVEL_LABELS: Record<string, string> = {
  beginner:     '初級',
  intermediate: '中級',
  advanced:     '進階',
};

const LEVEL_COLORS: Record<string, string> = {
  beginner:     'bg-emerald-600/20 text-emerald-400',
  intermediate: 'bg-amber-600/20 text-amber-400',
  advanced:     'bg-rose-600/20 text-rose-400',
};

function CoursePlaceholderThumbnail({ title }: { title: string }) {
  const idx = title.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % GRADIENTS.length;
  const gradient = GRADIENTS[idx];
  const initials = title
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <div className={`flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br ${gradient}`}>
      <span className="text-3xl font-bold text-white/90 drop-shadow">{initials}</span>
      <span className="text-[10px] font-medium uppercase tracking-widest text-white/60">
        課程影片
      </span>
    </div>
  );
}

export default async function CoursesPage() {
  const courses = await getPublishedCourses({ limit: 60 });

  return (
    <div className="pb-10">
      <header className="border-b border-primary/15 bg-marketing-page-header-bg">
        <div className="mx-auto max-w-6xl px-4 py-10 md:py-12">
          <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            課程總覽
          </h1>
          <p className="mt-2 text-base text-marketing-muted md:text-lg">
            探索所有公開課程，開始你的語言學習之旅。
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-8 px-4 pt-10">
      {courses.length === 0 ? (
        <Card className="border-zinc-800 bg-zinc-900/70">
          <CardHeader>
            <CardTitle className="text-zinc-200">暫無課程</CardTitle>
            <CardDescription className="text-zinc-500">
              目前尚無公開課程，請稍後再試。
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <Link key={course.id} href={`/courses/${course.id}`} className="group">
              <Card className="h-full overflow-hidden border-zinc-800 bg-zinc-900/80 transition-colors hover:border-zinc-600">
                <div className="relative h-40 bg-zinc-800">
                  {course.thumbnail_url ? (
                    <Image
                      src={course.thumbnail_url}
                      alt={course.title}
                      fill
                      className="object-cover transition-opacity group-hover:opacity-90"
                      sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw"
                    />
                  ) : (
                    <CoursePlaceholderThumbnail title={course.title} />
                  )}
                  <span
                    className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-xs font-medium ${LEVEL_COLORS[course.level] ?? 'bg-zinc-700 text-zinc-300'}`}
                  >
                    {LEVEL_LABELS[course.level] ?? course.level}
                  </span>
                </div>

                <CardHeader className="pb-2">
                  <CardTitle className="line-clamp-2 text-base text-zinc-50 group-hover:text-emerald-400 transition-colors">
                    {course.title}
                  </CardTitle>
                  {course.description && (
                    <CardDescription className="line-clamp-2 text-zinc-500">
                      {course.description}
                    </CardDescription>
                  )}
                </CardHeader>

                <CardContent className="flex flex-col gap-3 pt-0">
                  {course.teacher && (
                    <p className="text-xs text-zinc-400">
                      導師：{course.teacher.display_name}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-zinc-500">
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-3.5 w-3.5" />
                      {(course as unknown as { lesson_count?: number }).lesson_count ?? 0} 單元
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {(course as unknown as { student_count?: number }).student_count ?? 0} 學員
                    </span>
                    {course.category && (
                      <Badge variant="outline" className="border-zinc-700 text-zinc-400 text-xs py-0">
                        {course.category.name}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-emerald-400">
                    {(course as unknown as { is_free?: boolean }).is_free ? '免費' : `HK$ ${Number(course.price).toFixed(0)}`}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
