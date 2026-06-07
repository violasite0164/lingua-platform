'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';
import { canAccessQuizInCourse } from '@/lib/course-quiz/access';
import { getCourseWithLessons } from '@/lib/supabase/queries';
import type { TablesInsert } from '@/types/database.types';

export async function markCourseQuizComplete({
  quizId,
  courseId,
}: {
  quizId: string;
  courseId: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '請先登入' };

  const course = await getCourseWithLessons(courseId);
  if (!course) return { error: '找不到課程' };
  if (!canAccessQuizInCourse(course, quizId)) {
    return { error: '請先完成前面的單元或測驗' };
  }

  const { data: questions } = await supabase
    .from('course_quiz_questions')
    .select('id')
    .eq('quiz_id', quizId);

  if (!questions?.length) {
    return { error: '此測驗尚無題目' };
  }

  const completedAt = new Date().toISOString();

  const { data: existing } = await supabase
    .from('user_course_quiz_progress')
    .select('completed, xp_granted')
    .eq('user_id', user.id)
    .eq('quiz_id', quizId)
    .maybeSingle();

  const row: TablesInsert<'user_course_quiz_progress'> = {
    user_id: user.id,
    quiz_id: quizId,
    completed: true,
    completed_at: completedAt,
    xp_granted: existing?.xp_granted ?? false,
  };

  await supabase
    .from('user_course_quiz_progress')
    .upsert(row as never, { onConflict: 'user_id,quiz_id' });

  await supabase.rpc('grant_course_quiz_xp', {
    p_user_id: user.id,
    p_quiz_id: quizId,
  } as never);

  revalidatePath(`/learn/${courseId}`);
  revalidatePath(`/learn/${courseId}/quiz/${quizId}`);
  revalidatePath(`/courses/${courseId}`);

  return { success: true };
}
