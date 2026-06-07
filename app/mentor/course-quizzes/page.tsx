import Link from 'next/link';
import { ChevronRight, FileQuestion } from 'lucide-react';

import { requireMentor } from '@/lib/mentor/auth';
import { getMentorCoursesQuizSummary } from '@/lib/mentor/queries';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default async function MentorCourseQuizzesPage() {
  const profile = await requireMentor();
  const courses = await getMentorCoursesQuizSummary(profile.id);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">測驗管理</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          為課程建立三選一或四選一測驗、上傳題目影片，並設定插入單元或總測驗。
        </p>
      </div>

      {courses.length === 0 ? (
        <div className="rounded-xl border border-border bg-card px-4 py-12 text-center">
          <FileQuestion className="mx-auto h-10 w-10 text-muted-foreground/60" />
          <p className="mt-3 text-sm text-muted-foreground">尚無課程，請先建立課程。</p>
          <Button asChild className="mt-4" size="sm">
            <Link href="/mentor/courses/new">新增課程</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {courses.map((course) => (
            <Link
              key={course.id}
              href={`/mentor/course-quizzes/${course.id}`}
              className="block"
            >
              <Card className="transition-colors hover:border-emerald-500/40 hover:bg-muted/30">
                <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-2">
                  <div className="min-w-0">
                    <CardTitle className="text-base truncate">{course.title}</CardTitle>
                    <CardDescription className="mt-0.5">
                      {course.lesson_count} 個單元
                      {course.category ? ` · ${course.category.name}` : ''}
                    </CardDescription>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                </CardHeader>
                <CardContent className="flex flex-wrap items-center gap-2 pt-0">
                  <Badge variant="secondary">
                    {course.quiz_count} 個測驗
                  </Badge>
                  {course.draft_quiz_count > 0 ? (
                    <Badge variant="outline" className="text-amber-700 dark:text-amber-400">
                      {course.draft_quiz_count} 個草稿
                    </Badge>
                  ) : null}
                  {!course.is_published ? (
                    <Badge variant="outline">課程未發布</Badge>
                  ) : null}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
