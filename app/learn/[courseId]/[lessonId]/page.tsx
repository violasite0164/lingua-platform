export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';

import { getAnsweredCueIdsForLesson } from '@/app/actions/lesson-cue-progress';
import {
  getCourseWithLessons,
  getLessonTextbooks,
  getLessonTimedCues,
} from '@/lib/supabase/queries';
import { LessonWorkspace } from '@/components/learn/lesson-workspace';

export default async function LearnLessonPage({
  params,
}: {
  params: Promise<{ courseId: string; lessonId: string }>;
}) {
  const { courseId, lessonId } = await params;

  const course = await getCourseWithLessons(courseId);
  if (!course) notFound();

  const lesson = course.lessons.find((l) => l.id === lessonId);
  if (!lesson) notFound();

  const canAccess = course.is_enrolled || lesson.is_preview;
  if (!canAccess) {
    redirect(`/courses/${courseId}`);
  }

  const [textbooks, timedCues, answeredCueIds] = await Promise.all([
    getLessonTextbooks(lessonId),
    getLessonTimedCues(lessonId),
    getAnsweredCueIdsForLesson(lessonId),
  ]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <div className="border-b bg-muted/30">
        <div className="container mx-auto flex max-w-full items-center gap-2 px-3 py-3 sm:gap-3 sm:px-4 sm:py-4">
          <Link
            href={`/courses/${courseId}`}
            className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground hover:text-foreground sm:text-sm"
          >
            <ChevronLeft className="h-4 w-4" />
            返回課程
          </Link>
          <span className="shrink-0 text-muted-foreground">/</span>
          <span className="min-w-0 truncate text-xs font-medium sm:text-sm">{course.title}</span>
        </div>
      </div>

      <div className="container mx-auto max-w-full px-3 py-4 sm:px-4 sm:py-8">
        <LessonWorkspace
          course={course}
          lesson={lesson}
          textbooks={textbooks}
          timedCues={timedCues}
          answeredCueIds={answeredCueIds}
        />
      </div>
    </div>
  );
}
