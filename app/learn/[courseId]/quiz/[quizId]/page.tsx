export const dynamic = 'force-dynamic';

import { notFound, redirect } from 'next/navigation';

import { ClassroomQuizApp } from '@/components/classroom-quiz/classroom-quiz-app';
import { MobileLandscapeEnforcer } from '@/components/games/mobile-landscape-enforcer';
import { canAccessQuizInCourse, hasQuizWatchAccess } from '@/lib/course-quiz/access';
import { getCourseQuizForPlay } from '@/lib/course-quiz/queries';
import { getCourseWithLessons } from '@/lib/supabase/queries';
import { createClient } from '@/lib/supabase/server';

export default async function LearnCourseQuizPage({
  params,
}: {
  params: Promise<{ courseId: string; quizId: string }>;
}) {
  const { courseId, quizId } = await params;

  const course = await getCourseWithLessons(courseId);
  if (!course) notFound();

  const quiz = course.quizzes.find((q) => q.id === quizId);
  if (!quiz || !hasQuizWatchAccess(quiz, course)) {
    redirect(`/courses/${courseId}`);
  }

  if (!canAccessQuizInCourse(course, quizId)) {
    redirect(`/learn/${courseId}`);
  }

  const pack = await getCourseQuizForPlay(courseId, quizId);
  if (!pack) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let initialCompleted = false;
  let isAdmin = false;
  if (user) {
    const { data: progress } = await supabase
      .from('user_course_quiz_progress')
      .select('completed')
      .eq('user_id', user.id)
      .eq('quiz_id', quizId)
      .maybeSingle();
    initialCompleted = !!progress?.completed;

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    isAdmin = profile?.role === 'admin';
  }

  return (
    <MobileLandscapeEnforcer className="flex h-[calc(100dvh-3.5rem)] min-h-0 w-full flex-1 flex-col">
      <ClassroomQuizApp
        courseId={courseId}
        quiz={pack.quiz}
        questions={pack.questions}
        steps={pack.steps}
        initialCompleted={initialCompleted}
        isAdmin={isAdmin}
      />
    </MobileLandscapeEnforcer>
  );
}
