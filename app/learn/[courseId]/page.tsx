export const dynamic = 'force-dynamic';

import { notFound, redirect } from 'next/navigation';

import { getCourseWithLessons } from '@/lib/supabase/queries';

/** 進入課程學習：導向第一個可觀看（或下一個未完成）的單元 */
export default async function LearnCoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;

  const course = await getCourseWithLessons(courseId);
  if (!course) notFound();

  const accessible = course.lessons.filter(
    (l) => course.is_enrolled || l.is_preview,
  );

  if (accessible.length === 0) {
    redirect(`/courses/${courseId}`);
  }

  const target = course.is_enrolled
    ? accessible.find((l) => !l.progress?.completed) ?? accessible[0]
    : accessible[0];

  redirect(`/learn/${courseId}/${target.id}`);
}
