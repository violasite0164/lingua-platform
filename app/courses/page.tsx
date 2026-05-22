import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { BookOpen, Users } from 'lucide-react';

import { parseCourseCatalogSearchParams } from '@/lib/courses/catalog';
import { getPublicCategories, getPublishedCourses } from '@/lib/supabase/queries';
import { CoursesCatalogToolbar } from '@/components/courses/courses-catalog-toolbar';
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
  beginner:     'bg-emerald-600/20 text-emerald-700 dark:text-emerald-400',
  intermediate: 'bg-amber-600/20 text-amber-800 dark:text-amber-400',
  advanced:     'bg-rose-600/20 text-rose-800 dark:text-rose-400',
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

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CoursesPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const filters = parseCourseCatalogSearchParams(sp);

  const [courses, categories] = await Promise.all([
    getPublishedCourses({
      sort: filters.sort,
      level: filters.level,
      categorySlug: filters.categorySlug,
      limit: 60,
    }),
    getPublicCategories(),
  ]);

  const hasFilters = Boolean(filters.level || filters.categorySlug);

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

      <div className="mx-auto max-w-6xl space-y-6 px-4 pt-10">
        <Suspense fallback={null}>
          <CoursesCatalogToolbar
            categories={categories}
            filters={filters}
            resultCount={courses.length}
          />
        </Suspense>

        {courses.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>
                {hasFilters ? '沒有符合條件的課程' : '暫無課程'}
              </CardTitle>
              <CardDescription>
                {hasFilters
                  ? '請調整級數、類型或排序後再試。'
                  : '目前尚無公開課程，請稍後再試。'}
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <Link key={course.id} href={`/courses/${course.id}`} className="group">
                <Card className="h-full overflow-hidden transition-colors hover:border-primary/40">
                  <div className="relative h-40 bg-muted">
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
                      className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-xs font-medium ${LEVEL_COLORS[course.level] ?? 'bg-muted text-muted-foreground'}`}
                    >
                      {LEVEL_LABELS[course.level] ?? course.level}
                    </span>
                  </div>

                  <CardHeader className="pb-2">
                    <CardTitle className="line-clamp-2 text-base transition-colors group-hover:text-primary">
                      {course.title}
                    </CardTitle>
                    {course.description && (
                      <CardDescription className="line-clamp-2">
                        {course.description}
                      </CardDescription>
                    )}
                  </CardHeader>

                  <CardContent className="flex flex-col gap-3 pt-0">
                    {course.teacher && (
                      <p className="text-xs text-muted-foreground">
                        導師：{course.teacher.display_name}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <BookOpen className="h-3.5 w-3.5" />
                        {course.lesson_count ?? 0} 單元
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {course.student_count ?? 0} 學員
                      </span>
                      {course.category && (
                        <Badge variant="secondary" className="text-xs py-0">
                          {course.category.name}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-primary">
                      {course.is_free ? '免費' : `HK$ ${Number(course.price).toFixed(0)}`}
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
