import { createClient } from '@/lib/supabase/server';
import type { CourseQuiz, CourseQuizQuestion, CourseQuizStep } from '@/types/database.types';

export type CourseQuizPlayPack = {
  quiz: CourseQuiz;
  questions: CourseQuizQuestion[];
  steps: CourseQuizStep[];
};

export async function getCourseQuizForPlay(
  courseId: string,
  quizId: string,
): Promise<CourseQuizPlayPack | null> {
  const supabase = await createClient();

  const { data: quiz } = await supabase
    .from('course_quizzes')
    .select('*')
    .eq('id', quizId)
    .eq('course_id', courseId)
    .eq('is_published', true)
    .maybeSingle();

  if (!quiz) return null;

  const { data: questions } = await supabase
    .from('course_quiz_questions')
    .select('*')
    .eq('quiz_id', quizId)
    .order('sort_order');

  const { data: steps } = await supabase
    .from('course_quiz_steps')
    .select('*')
    .eq('quiz_id', quizId)
    .order('sort_order');

  return {
    quiz: quiz as CourseQuiz,
    questions: (questions ?? []) as CourseQuizQuestion[],
    steps: (steps ?? []) as CourseQuizStep[],
  };
}
