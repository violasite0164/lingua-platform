/**
 * 常用 Supabase 查詢封裝
 * 在 Server Components / Server Actions 中使用
 */
import { createClient } from './server';
import type {
  Profile,
  CourseWithTeacher,
  CourseWithLessons,
  LessonWithProgress,
  AssignmentWithStudent,
} from '@/types/database.types';

// ─── Auth helpers ─────────────────────────────────────────

/** 取得當前登入用戶，未登入回傳 null */
export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

/** 取得當前用戶的 profile，未登入回傳 null */
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return data;
}

// ─── Courses ──────────────────────────────────────────────

/** 取得所有已發布課程（公開頁面用） */
export async function getPublishedCourses(options?: {
  categorySlug?: string;
  limit?: number;
  offset?: number;
}) {
  const supabase = await createClient();

  let query = supabase
    .from('courses')
    .select(`
      *,
      teacher:profiles!courses_teacher_id_fkey(id, display_name, avatar_url),
      category:categories(id, name, slug)
    `)
    .eq('is_published', true)
    .order('created_at', { ascending: false });

  if (options?.categorySlug) {
    query = query.eq('categories.slug', options.categorySlug);
  }
  if (options?.limit)  query = query.limit(options.limit);
  if (options?.offset) query = query.range(options.offset, options.offset + (options.limit ?? 20) - 1);

  const { data, error } = await query;
  if (error) {
    console.error('[getPublishedCourses]', error.message);
    return [];
  }
  return data as CourseWithTeacher[];
}

/** 取得單一課程詳情（含課堂列表與學生進度） */
export async function getCourseWithLessons(
  courseId: string,
): Promise<CourseWithLessons | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 課程 + 老師 + 分類
  const { data: course, error: courseErr } = await supabase
    .from('courses')
    .select(`
      *,
      teacher:profiles!courses_teacher_id_fkey(id, display_name, avatar_url),
      category:categories(id, name, slug)
    `)
    .eq('id', courseId)
    .single();

  if (courseErr || !course) return null;

  // 課堂列表
  const { data: lessons } = await supabase
    .from('lessons')
    .select('*')
    .eq('course_id', courseId)
    .order('sort_order');

  // 如果有登入，一次取出所有進度
  let progressMap: Record<string, unknown> = {};
  if (user && lessons) {
    const lessonIds = lessons.map((l) => l.id);
    const { data: progressRows } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', user.id)
      .in('lesson_id', lessonIds);
    progressMap = Object.fromEntries(
      (progressRows ?? []).map((p) => [p.lesson_id, p]),
    );
  }

  // 是否已報名
  let isEnrolled = false;
  if (user) {
    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('id')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .maybeSingle();
    isEnrolled = !!enrollment;
  }

  const lessonsWithProgress: LessonWithProgress[] = (lessons ?? []).map((l) => ({
    ...l,
    progress: (progressMap[l.id] as LessonWithProgress['progress']) ?? null,
  }));

  return {
    ...(course as CourseWithTeacher),
    lessons: lessonsWithProgress,
    is_enrolled: isEnrolled,
  };
}

// ─── Assignments ──────────────────────────────────────────

/** 老師批改面板：取得某課程所有作業（含學生資料） */
export async function getCourseAssignments(
  courseId: string,
  status?: 'submitted' | 'grading' | 'graded' | 'returned',
): Promise<AssignmentWithStudent[]> {
  const supabase = await createClient();

  let query = supabase
    .from('assignments')
    .select(`
      *,
      student:profiles!assignments_student_id_fkey(id, display_name, avatar_url),
      lesson:lessons!assignments_lesson_id_fkey(id, title)
    `)
    .eq('lessons.course_id', courseId)
    .order('submitted_at', { ascending: false });

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) {
    console.error('[getCourseAssignments]', error.message);
    return [];
  }
  return (data ?? []) as AssignmentWithStudent[];
}

/** 學生：取得自己某課堂的作業 */
export async function getMyAssignment(lessonId: string, userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('assignments')
    .select('*')
    .eq('lesson_id', lessonId)
    .eq('student_id', userId)
    .maybeSingle();
  return data;
}

// ─── Leaderboard ──────────────────────────────────────────

/** 排行榜前 N 名 */
export async function getLeaderboard(limit = 20) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, exp, level, streak_days')
    .order('exp', { ascending: false })
    .limit(limit);
  if (error) {
    console.error('[getLeaderboard]', error.message);
    return [];
  }
  return data;
}
