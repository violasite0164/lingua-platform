/**
 * 導師後台資料查詢（Server Components）
 */
import { createClient } from '@/lib/supabase/server';
import type { Tables } from '@/types/database.types';

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
  let pendingAssignments = 0;

  if (courseIds.length > 0) {
    const { data: lessonRowsRaw } = await supabase
      .from('lessons')
      .select('id')
      .in('course_id', courseIds);

    const lessonRows = (lessonRowsRaw ?? []) as Pick<Tables<'lessons'>, 'id'>[];

    const lessonIds = lessonRows.map((l) => l.id);

    if (lessonIds.length > 0) {
      const { count, error: aErr } = await supabase
        .from('assignments')
        .select('*', { count: 'exact', head: true })
        .in('lesson_id', lessonIds)
        .in('status', ['submitted', 'grading']);

      if (aErr) throw aErr;
      pendingAssignments = count ?? 0;
    }
  }

  const totalCourses = courses.length;
  const totalStudents = courses.reduce((s, c) => s + (c.student_count ?? 0), 0);
  const totalLessons = courses.reduce((s, c) => s + (c.lesson_count ?? 0), 0);

  return {
    totalCourses,
    totalStudents,
    totalLessons,
    pendingAssignments,
  };
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

export type MentorAssignmentRow = Tables<'assignments'> & {
  student: Pick<Tables<'profiles'>, 'id' | 'display_name' | 'avatar_url'> | null;
  lesson:
    | (Pick<Tables<'lessons'>, 'id' | 'title'> & {
        course: Pick<Tables<'courses'>, 'id' | 'title' | 'teacher_id'>;
      })
    | null;
};

export async function getMentorAssignmentsQueue(mentorId: string): Promise<MentorAssignmentRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('assignments')
    .select(`
      *,
      student:profiles!assignments_student_id_fkey(id, display_name, avatar_url),
      lesson:lessons(
        id,
        title,
        course:courses(id, title, teacher_id)
      )
    `)
    .in('status', ['submitted', 'grading'])
    .order('submitted_at', { ascending: true });

  if (error) throw error;

  const rows = (data ?? []) as MentorAssignmentRow[];
  return rows.filter((r) => r.lesson?.course?.teacher_id === mentorId);
}
