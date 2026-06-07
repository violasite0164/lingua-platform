/**
 * 導師後台資料查詢（Server Components）
 */
import { createClient } from '@/lib/supabase/server';
import type {
  CourseQuiz,
  CourseQuizQuestion,
  CourseQuizStep,
  Tables,
} from '@/types/database.types';

export type MentorCourseRow = Tables<'courses'> & {
  category: { id: number; name: string; slug: string } | null;
};

export async function getMentorCourses(mentorId: string): Promise<MentorCourseRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('courses')
    .select(`
      *,
      category:categories(id, name, slug)
    `)
    .eq('teacher_id', mentorId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as MentorCourseRow[];
}

export async function getMentorDashboardStats(mentorId: string) {
  const supabase = await createClient();

  const { data: coursesRaw, error: cErr } = await supabase
    .from('courses')
    .select('id, student_count, lesson_count')
    .eq('teacher_id', mentorId);

  if (cErr) throw cErr;

  const courses = (coursesRaw ?? []) as Pick<
    Tables<'courses'>,
    'id' | 'student_count' | 'lesson_count'
  >[];

  const courseIds = courses.map((c) => c.id);
  let totalCourseQuizzes = 0;
  let draftCourseQuizzes = 0;

  if (courseIds.length > 0) {
    const { data: quizRows, error: qErr } = await supabase
      .from('course_quizzes')
      .select('id, is_published')
      .in('course_id', courseIds);

    if (qErr) throw qErr;

    const rows = quizRows ?? [];
    totalCourseQuizzes = rows.length;
    draftCourseQuizzes = rows.filter((q) => !q.is_published).length;
  }

  const totalCourses = courses.length;
  const totalStudents = courses.reduce((s, c) => s + (c.student_count ?? 0), 0);
  const totalLessons = courses.reduce((s, c) => s + (c.lesson_count ?? 0), 0);

  return {
    totalCourses,
    totalStudents,
    totalLessons,
    totalCourseQuizzes,
    draftCourseQuizzes,
  };
}

export type MentorCourseQuizSummary = MentorCourseRow & {
  quiz_count: number;
  draft_quiz_count: number;
};

export async function getMentorCoursesQuizSummary(
  mentorId: string,
): Promise<MentorCourseQuizSummary[]> {
  const courses = await getMentorCourses(mentorId);
  const courseIds = courses.map((c) => c.id);

  if (courseIds.length === 0) return [];

  const supabase = await createClient();
  const { data: quizRows, error } = await supabase
    .from('course_quizzes')
    .select('id, course_id, is_published')
    .in('course_id', courseIds);

  if (error) throw error;

  const countByCourse = new Map<string, { total: number; draft: number }>();
  for (const id of courseIds) {
    countByCourse.set(id, { total: 0, draft: 0 });
  }
  for (const q of quizRows ?? []) {
    const entry = countByCourse.get(q.course_id)!;
    entry.total += 1;
    if (!q.is_published) entry.draft += 1;
  }

  return courses.map((course) => {
    const counts = countByCourse.get(course.id) ?? { total: 0, draft: 0 };
    return {
      ...course,
      quiz_count: counts.total,
      draft_quiz_count: counts.draft,
    };
  });
}

export async function getMentorCourseForEdit(courseId: string, mentorId: string) {
  const supabase = await createClient();

  const { data: course, error: cErr } = await supabase
    .from('courses')
    .select(`
      *,
      category:categories(id, name, slug)
    `)
    .eq('id', courseId)
    .eq('teacher_id', mentorId)
    .maybeSingle();

  if (cErr) throw cErr;
  if (!course) return null;

  const { data: lessons, error: lErr } = await supabase
    .from('lessons')
    .select('*')
    .eq('course_id', courseId)
    .order('sort_order', { ascending: true });

  if (lErr) throw lErr;

  return {
    course: course as MentorCourseRow,
    lessons: lessons ?? [],
  };
}

export async function getMentorCourseQuizzesForEdit(
  courseId: string,
  mentorId: string,
) {
  const pack = await getMentorCourseForEdit(courseId, mentorId);
  if (!pack) return null;

  const supabase = await createClient();
  const { data: quizzes } = await supabase
    .from('course_quizzes')
    .select('*')
    .eq('course_id', courseId)
    .order('sort_order', { ascending: true });

  const quizIds = (quizzes ?? []).map((q) => q.id);
  let quizQuestions: CourseQuizQuestion[] = [];
  let quizSteps: CourseQuizStep[] = [];
  if (quizIds.length > 0) {
    const { data: qRows } = await supabase
      .from('course_quiz_questions')
      .select('*')
      .in('quiz_id', quizIds)
      .order('sort_order', { ascending: true });
    quizQuestions = (qRows ?? []) as CourseQuizQuestion[];

    const { data: sRows } = await supabase
      .from('course_quiz_steps')
      .select('*')
      .in('quiz_id', quizIds)
      .order('sort_order', { ascending: true });
    quizSteps = (sRows ?? []) as CourseQuizStep[];

    const { ensureCourseQuizQuestionSteps } = await import(
      '@/lib/course-quiz/ensure-quiz-steps'
    );
    for (const quiz of quizzes ?? []) {
      const qForQuiz = quizQuestions.filter((q) => q.quiz_id === quiz.id);
      await ensureCourseQuizQuestionSteps(supabase, quiz.id, qForQuiz);
    }

    const { data: sRowsAfter } = await supabase
      .from('course_quiz_steps')
      .select('*')
      .in('quiz_id', quizIds)
      .order('sort_order', { ascending: true });
    quizSteps = (sRowsAfter ?? []) as CourseQuizStep[];
  }

  return {
    ...pack,
    quizzes: (quizzes ?? []) as CourseQuiz[],
    quizQuestions,
    quizSteps,
  };
}

