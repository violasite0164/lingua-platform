export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import {
  BookOpen, Clock, GraduationCap, Star, Users, Zap,
} from 'lucide-react';

import { getCourseWithLessons } from '@/lib/supabase/queries';
import { VideoPlayer } from '@/components/courses/video-player';
import { LessonList } from '@/components/courses/lesson-list';
import { EnrollButton } from '@/components/courses/enroll-button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDuration, formatPrice, calcCompletionRate } from '@/lib/utils';
import { getMentorSpecialtyLabel } from '@/lib/mentor-specialty';

const LEVEL_LABELS: Record<string, string> = {
  beginner:     '初級',
  intermediate: '中級',
  advanced:     '進階',
};

// ─── Metadata ─────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const course = await getCourseWithLessons(id);
  if (!course) return { title: '課程不存在' };
  return {
    title: course.title,
    description: course.description ?? undefined,
    openGraph: {
      images: course.thumbnail_url ? [course.thumbnail_url] : [],
    },
  };
}

// ─── Page ─────────────────────────────────────────────────

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let course: Awaited<ReturnType<typeof getCourseWithLessons>> = null;
  try {
    course = await getCourseWithLessons(id);
  } catch {
    notFound();
  }
  if (!course) notFound();

  const { lessons, teacher, is_enrolled } = course;

  // 計算課程總時長
  const totalSeconds = lessons.reduce((s, l) => s + l.duration_sec, 0);

  // 完成進度（已報名才有意義）
  const completedCount = lessons.filter((l) => l.progress?.completed).length;
  const completionRate = calcCompletionRate(completedCount, lessons.length);

  // 找第一個未完成的課堂（「繼續學習」按鈕用）
  const nextLesson = is_enrolled
    ? lessons.find((l) => !l.progress?.completed)
    : null;

  // 預覽影片：找第一個 is_preview 的課堂，或第一堂
  const previewLesson = lessons.find((l) => l.is_preview) ?? lessons[0] ?? null;

  return (
    <div className="min-h-screen bg-background">
      {/* ── Hero section ─────────────────────────────────── */}
      <section className="bg-muted/40 border-b">
        <div className="container mx-auto px-4 py-8 lg:py-12">
          <div className="grid lg:grid-cols-5 gap-8 items-start">

            {/* Left: video + info (lg: 3 cols) */}
            <div className="lg:col-span-3 space-y-5">
              {/* Video player */}
              <VideoPlayer
                videoUid={previewLesson?.cf_video_uid ?? null}
                locked={!is_enrolled && !previewLesson?.is_preview}
              />

              {/* Title & badges */}
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {course.category && (
                    <Badge variant="secondary">{course.category.name}</Badge>
                  )}
                  <Badge variant="outline">
                    {LEVEL_LABELS[course.level] ?? course.level}
                  </Badge>
                  {course.is_free && <Badge variant="xp">免費</Badge>}
                </div>

                <h1 className="text-2xl lg:text-3xl font-bold leading-tight">
                  {course.title}
                </h1>

                {course.description && (
                  <p className="text-muted-foreground leading-relaxed">
                    {course.description}
                  </p>
                )}

                {/* Stats row */}
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="h-4 w-4" />
                    {lessons.length} 堂課
                  </span>
                  {totalSeconds > 0 && (
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4" />
                      {formatDuration(totalSeconds)}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Users className="h-4 w-4" />
                    {course.student_count} 名學生
                  </span>
                  <span className="flex items-center gap-1.5">
                    <GraduationCap className="h-4 w-4" />
                    {LEVEL_LABELS[course.level]}
                  </span>
                </div>

                {/* Teacher */}
                <div className="flex items-center gap-2 pt-1">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={teacher.avatar_url ?? undefined} />
                    <AvatarFallback className="text-xs">
                      {teacher.display_name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-muted-foreground">
                    由 <span className="text-foreground font-medium">{teacher.display_name}</span> 教授
                  </span>
                </div>
              </div>
            </div>

            {/* Right: purchase card (lg: 2 cols) */}
            <div className="lg:col-span-2">
              <Card className="sticky top-20">
                <CardHeader className="pb-4">
                  {/* Price */}
                  <div className="text-3xl font-bold">
                    {formatPrice(course.price)}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Progress (enrolled users) */}
                  {is_enrolled && lessons.length > 0 && (
                    <div className="space-y-2 p-3 rounded-lg bg-muted/50">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">學習進度</span>
                        <span className="text-muted-foreground">
                          {completedCount}/{lessons.length} 堂 · {completionRate}%
                        </span>
                      </div>
                      <Progress
                        value={completionRate}
                        className="h-2"
                        indicatorClassName="bg-green-500"
                      />
                    </div>
                  )}

                  {/* CTA button */}
                  <EnrollButton
                    courseId={course.id}
                    price={course.price}
                    isFree={course.is_free}
                    isEnrolled={is_enrolled}
                    nextLessonId={nextLesson?.id}
                  />

                  <Separator />

                  {/* Course includes */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium">課程包含</p>
                    <ul className="space-y-1.5 text-sm text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <BookOpen className="h-3.5 w-3.5 shrink-0" />
                        {lessons.length} 堂教學影片
                      </li>
                      {totalSeconds > 0 && (
                        <li className="flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5 shrink-0" />
                          共 {formatDuration(totalSeconds)} 課程內容
                        </li>
                      )}
                      <li className="flex items-center gap-2">
                        <Zap className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                        完課可獲得 XP 經驗值
                      </li>
                      <li className="flex items-center gap-2">
                        <Star className="h-3.5 w-3.5 shrink-0" />
                        AI 輔助練習 + 線上互動教學
                      </li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* ── Tabs section ──────────────────────────────────── */}
      <section className="container mx-auto px-4 py-8">
        <Tabs defaultValue="lessons">
          <TabsList className="mb-6">
            <TabsTrigger value="lessons">課程大綱</TabsTrigger>
            <TabsTrigger value="about">關於課程</TabsTrigger>
            <TabsTrigger value="teacher">講師介紹</TabsTrigger>
          </TabsList>

          {/* ── Lessons tab ── */}
          <TabsContent value="lessons">
            <div className="max-w-2xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">
                  課程大綱 · {lessons.length} 堂課
                </h2>
                {is_enrolled && nextLesson && (
                  <Link
                    href={`/learn/${course.id}/${nextLesson.id}`}
                    className="text-sm text-primary hover:underline font-medium"
                  >
                    繼續學習 →
                  </Link>
                )}
              </div>
              <LessonList
                courseId={course.id}
                lessons={lessons}
                isEnrolled={is_enrolled}
              />
            </div>
          </TabsContent>

          {/* ── About tab ── */}
          <TabsContent value="about">
            <div className="max-w-2xl prose prose-sm dark:prose-invert">
              {course.description ? (
                <div className="whitespace-pre-wrap text-muted-foreground leading-relaxed">
                  {course.description}
                </div>
              ) : (
                <p className="text-muted-foreground">老師尚未新增課程描述。</p>
              )}
            </div>
          </TabsContent>

          {/* ── Teacher tab ── */}
          <TabsContent value="teacher">
            <div className="max-w-2xl flex items-start gap-4">
              <Avatar className="h-16 w-16 shrink-0">
                <AvatarImage src={teacher.avatar_url ?? undefined} />
                <AvatarFallback>
                  {teacher.display_name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 space-y-2">
                <div>
                  <h3 className="text-lg font-semibold">{teacher.display_name}</h3>
                  {getMentorSpecialtyLabel(teacher.mentor_specialty) && (
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {getMentorSpecialtyLabel(teacher.mentor_specialty)}
                    </p>
                  )}
                </div>
                {teacher.bio?.trim() ? (
                  <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                    {teacher.bio.trim()}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    講師尚未填寫介紹。
                  </p>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
}
