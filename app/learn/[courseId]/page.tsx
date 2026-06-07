export const dynamic = 'force-dynamic';

import { notFound, redirect } from 'next/navigation';

import { buildCourseRoadmap } from '@/lib/course-quiz/roadmap';
import { isRoadmapItemAccessible } from '@/lib/course-quiz/access';
import { getCourseWithLessons } from '@/lib/supabase/queries';
import type { CourseRoadmapItem } from '@/types/database.types';

/** 進入課程學習：導向第一個可觀看（或下一個未完成）的單元 */
export default async function LearnCoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;

  const course = await getCourseWithLessons(courseId);
  if (!course) notFound();

  const items = buildCourseRoadmap(course.lessons, course.quizzes ?? []);

  const firstAccessible = items.find((_, i) =>
    isRoadmapItemAccessible(items, i, course),
  );

  if (!firstAccessible) {
    redirect(`/courses/${courseId}`);
  }

  const hasLearningAccess =
    course.is_enrolled || course.subscription_tier !== 'free';

  const target =
    hasLearningAccess
      ? items.find(
          (item, i) =>
            isRoadmapItemAccessible(items, i, course) &&
            (item.kind === 'lesson'
              ? !item.lesson.progress?.completed
              : !item.quiz.progress?.completed),
        ) ?? firstAccessible
      : firstAccessible;

  redirect(roadmapItemHref(courseId, target));
}

function roadmapItemHref(courseId: string, item: CourseRoadmapItem): string {
  if (item.kind === 'lesson') {
    return `/learn/${courseId}/${item.lesson.id}`;
  }
  return `/learn/${courseId}/quiz/${item.quiz.id}`;
}
