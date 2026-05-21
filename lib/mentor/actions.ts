'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';
import type { TablesInsert, TablesUpdate } from '@/types/database.types';

import { requireMentor } from '@/lib/mentor/auth';
import {
  createCourseFormSchema,
  DEFAULT_LESSON_XP_REWARD,
  lessonFormSchema,
  updateCourseFormSchema,
  type LessonFormValues,
} from '@/lib/mentor/schemas';

export type ActionState = {
  error?: string;
  success?: string;
  /** redirect path after success */
  redirect?: string;
  /** returned data (e.g. newly created record id) */
  data?: Record<string, unknown>;
};

function fieldError(state: ActionState, msg: string): ActionState {
  return { ...state, error: msg };
}

/**
 * In dev mode, calling revalidatePath makes Turbopack invalidate and recompile
 * those routes. During the brief recompilation window, the Turbopack runtime
 * becomes unavailable and any incoming request crashes with MODULE_NOT_FOUND.
 * Dev mode has no page cache anyway, so revalidation is a no-op for data
 * freshness — skip it to prevent the race condition.
 */
function safeRevalidate(...paths: string[]) {
  if (process.env.NODE_ENV === 'development') return;
  paths.forEach((p) => revalidatePath(p));
}

/** Admin 可存取任何課程；mentor 只能存取自己的 */
async function assertCourseOwner(courseId: string, profile: { id: string; role: string }) {
  if (profile.role === 'admin') return; // admin 免檢查

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('courses')
    .select('id')
    .eq('id', courseId)
    .eq('teacher_id', profile.id)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('找不到課程或無權限');
}

/** Admin 可存取任何單元；mentor 只能存取自己課程的單元 */
async function assertLessonOwner(lessonId: string, profile: { id: string; role: string }) {
  if (profile.role === 'admin') return; // admin 免檢查

  const supabase = await createClient();
  const { data: lesson, error: lErr } = await supabase
    .from('lessons')
    .select('course_id')
    .eq('id', lessonId)
    .maybeSingle();

  if (lErr) throw lErr;
  if (!lesson) throw new Error('找不到單元');

  const { data: course, error: cErr } = await supabase
    .from('courses')
    .select('teacher_id')
    .eq('id', lesson.course_id)
    .maybeSingle();

  if (cErr) throw cErr;
  if (course?.teacher_id !== profile.id) {
    throw new Error('找不到單元或無權限');
  }
}

export async function createCourseFormAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireMentor();

  const catRaw = formData.get('category_id');
  const category_id =
    catRaw === null || catRaw === ''
      ? null
      : Number(catRaw);

  const raw = {
    title: String(formData.get('title') ?? ''),
    description: String(formData.get('description') ?? '') || undefined,
    price: formData.get('price'),
    level: formData.get('level'),
    category_id: Number.isFinite(category_id) ? category_id : null,
    is_free: formData.get('is_free') === 'on',
    is_published: formData.get('is_published') === 'on',
  };

  const parsed = createCourseFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors.title?.[0] ?? '表單資料不正確' };
  }

  const v = parsed.data;
  const supabase = await createClient();

  const insert: TablesInsert<'courses'> = {
    teacher_id: profile.id,
    title: v.title,
    description: v.description ?? null,
    price: v.is_free ? 0 : v.price,
    is_free: v.is_free,
    is_published: v.is_published,
    level: v.level,
    category_id: v.category_id ?? null,
  };

  const { data: course, error } = await supabase
    .from('courses')
    .insert(insert)
    .select('id')
    .single();

  if (error) {
    console.error('[createCourse]', error);
    return { error: error.message };
  }

  const thumb = formData.get('thumbnail');
  if (thumb instanceof File && thumb.size > 0 && thumb.type.startsWith('image/')) {
    const ext = thumb.name.split('.').pop() || 'jpg';
    const path = `${profile.id}/${course.id}.${ext}`;
    const { error: upErr } = await supabase.storage.from('thumbnails').upload(path, thumb, {
      upsert: true,
      contentType: thumb.type,
    });

    if (!upErr) {
      const { data: pub } = supabase.storage.from('thumbnails').getPublicUrl(path);
      await supabase.from('courses').update({ thumbnail_url: pub.publicUrl }).eq('id', course.id);
    }
  }

  safeRevalidate('/mentor', '/mentor/courses');
  return { redirect: `/mentor/courses/${course.id}/edit` };
}

export async function updateCourseFormAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireMentor();

  const catRaw = formData.get('category_id');
  const category_id =
    catRaw === null || catRaw === ''
      ? null
      : Number(catRaw);

  const raw = {
    id: String(formData.get('id') ?? ''),
    title: String(formData.get('title') ?? ''),
    description: String(formData.get('description') ?? '') || undefined,
    price: formData.get('price'),
    level: formData.get('level'),
    category_id: Number.isFinite(category_id) ? category_id : null,
    is_free: formData.get('is_free') === 'on',
    is_published: formData.get('is_published') === 'on',
  };

  const parsed = updateCourseFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: '請檢查表單欄位' };
  }

  const v = parsed.data;
  await assertCourseOwner(v.id, profile);

  const supabase = await createClient();

  const upd: TablesUpdate<'courses'> = {
    title: v.title,
    description: v.description ?? null,
    price: v.is_free ? 0 : v.price,
    is_free: v.is_free,
    is_published: v.is_published,
    level: v.level,
    category_id: v.category_id ?? null,
  };

  const { error } = await supabase.from('courses').update(upd).eq('id', v.id);

  if (error) {
    console.error('[updateCourse]', error);
    return { error: error.message };
  }

  const thumb = formData.get('thumbnail');
  if (thumb instanceof File && thumb.size > 0 && thumb.type.startsWith('image/')) {
    const ext = thumb.name.split('.').pop() || 'jpg';
    const path = `${profile.id}/${v.id}.${ext}`;
    const { error: upErr } = await supabase.storage.from('thumbnails').upload(path, thumb, {
      upsert: true,
      contentType: thumb.type,
    });

    if (!upErr) {
      const { data: pub } = supabase.storage.from('thumbnails').getPublicUrl(path);
      await supabase.from('courses').update({ thumbnail_url: pub.publicUrl }).eq('id', v.id);
    }
  }

  safeRevalidate('/mentor/courses', `/mentor/courses/${v.id}/edit`);
  return { success: '課程已更新' };
}

export async function createLessonAction(courseId: string): Promise<ActionState> {
  const profile = await requireMentor();
  await assertCourseOwner(courseId, profile);

  const supabase = await createClient();

  const { count } = await supabase
    .from('lessons')
    .select('*', { count: 'exact', head: true })
    .eq('course_id', courseId);

  const sortOrder = (count ?? 0) + 1;

  const insert: TablesInsert<'lessons'> = {
    course_id: courseId,
    title: `單元 ${sortOrder}`,
    sort_order: sortOrder,
    is_preview: sortOrder === 1,
    xp_reward: DEFAULT_LESSON_XP_REWARD,
  };

  const { data: newLesson, error } = await supabase
    .from('lessons')
    .insert(insert)
    .select('id')
    .single();

  if (error) {
    console.error('[createLesson]', error);
    return { error: error.message };
  }

  safeRevalidate(`/mentor/courses/${courseId}/edit`);
  return { success: '已新增單元', data: { id: newLesson.id } };
}

export async function updateLessonAction(
  lessonId: string,
  values: LessonFormValues,
): Promise<ActionState> {
  const profile = await requireMentor();
  await assertLessonOwner(lessonId, profile);

  const parsed = lessonFormSchema.safeParse(values);
  if (!parsed.success) {
    return { error: '單元資料不正確' };
  }

  const supabase = await createClient();
  const v = parsed.data;

  const upd: TablesUpdate<'lessons'> = {
    title: v.title,
    description: v.description ?? null,
    is_preview: v.is_preview,
    xp_reward: v.xp_reward,
  };

  const { data: lesson } = await supabase
    .from('lessons')
    .select('course_id')
    .eq('id', lessonId)
    .single();

  const { error } = await supabase.from('lessons').update(upd).eq('id', lessonId);

  if (error) {
    console.error('[updateLesson]', error);
    return { error: error.message };
  }

  if (lesson?.course_id) {
    safeRevalidate(`/mentor/courses/${lesson.course_id}/edit`);
  }
  return { success: '單元已儲存' };
}

export async function deleteCourseAction(courseId: string): Promise<ActionState> {
  const profile = await requireMentor();
  await assertCourseOwner(courseId, profile);

  const supabase = await createClient();

  // Delete all lessons first (cascade may not be set)
  await supabase.from('lessons').delete().eq('course_id', courseId);

  const { error } = await supabase.from('courses').delete().eq('id', courseId);

  if (error) {
    console.error('[deleteCourse]', error);
    return { error: error.message };
  }

  safeRevalidate('/mentor', '/mentor/courses');
  return { success: '已刪除課程', redirect: '/mentor/courses' };
}

export async function deleteLessonAction(lessonId: string): Promise<ActionState> {
  const profile = await requireMentor();
  await assertLessonOwner(lessonId, profile);

  const supabase = await createClient();
  const { data: lesson } = await supabase
    .from('lessons')
    .select('course_id')
    .eq('id', lessonId)
    .single();

  const { error } = await supabase.from('lessons').delete().eq('id', lessonId);

  if (error) {
    console.error('[deleteLesson]', error);
    return { error: error.message };
  }

  if (lesson?.course_id) {
    safeRevalidate(`/mentor/courses/${lesson.course_id}/edit`);
  }
  return { success: '已刪除單元' };
}

export async function saveLessonVideoUidAction(
  lessonId: string,
  cfVideoUid: string,
): Promise<ActionState> {
  const profile = await requireMentor();
  await assertLessonOwner(lessonId, profile);

  if (!cfVideoUid || cfVideoUid.length < 8) {
    return { error: '無效的影片 UID' };
  }

  const supabase = await createClient();

  const { data: lesson } = await supabase
    .from('lessons')
    .select('course_id')
    .eq('id', lessonId)
    .single();

  const { error } = await supabase
    .from('lessons')
    .update({
      cf_video_uid: cfVideoUid,
    })
    .eq('id', lessonId);

  if (error) {
    console.error('[saveLessonVideo]', error);
    return { error: error.message };
  }

  await syncLessonStreamMetaInternal(lessonId);

  if (lesson?.course_id) {
    safeRevalidate(`/mentor/courses/${lesson.course_id}/edit`);
  }
  return { success: '影片已連結到此單元' };
}

async function syncLessonStreamMetaInternal(lessonId: string) {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_STREAM_API_TOKEN;
  if (!accountId || !token) return;

  const supabase = await createClient();
  const { data: lesson } = await supabase
    .from('lessons')
    .select('cf_video_uid, course_id, sort_order')
    .eq('id', lessonId)
    .single();

  if (!lesson?.cf_video_uid) return;

  // ── Fetch metadata from Cloudflare Stream API ──────────────
  let duration = 0;
  let cfThumb: string | null = null;

  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${lesson.cf_video_uid}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    const json = (await res.json()) as {
      success?: boolean;
      result?: { duration?: number; thumbnail?: string; preview?: string };
    };

    if (json.success && json.result) {
      duration = Math.round(json.result.duration ?? 0);
      cfThumb   = json.result.thumbnail ?? json.result.preview ?? null;
    }
  } catch {
    // Non-fatal: video may still be processing — skip duration/thumb sync.
  }

  // If Stream API didn't return a thumbnail, build the URL directly.
  // Cloudflare thumbnail URLs work immediately after upload.
  if (!cfThumb) {
    const subdomain = process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN;
    cfThumb = subdomain
      ? `https://${subdomain}/${lesson.cf_video_uid}/thumbnails/thumbnail.jpg?time=5s&fit=crop&width=640`
      : `https://videodelivery.net/${lesson.cf_video_uid}/thumbnails/thumbnail.jpg?time=5s&fit=crop&width=640`;
  }

  // ── Update lesson ──────────────────────────────────────────
  await supabase
    .from('lessons')
    .update({
      duration_sec:     duration > 0 ? duration : undefined,
      cf_thumbnail_url: cfThumb,
    })
    .eq('id', lessonId);

  // ── Auto-set course thumbnail if not already set ───────────
  // Only use the first lesson (lowest sort_order) as the course thumbnail.
  if (lesson.course_id && cfThumb) {
    const { data: course } = await supabase
      .from('courses')
      .select('thumbnail_url')
      .eq('id', lesson.course_id)
      .single();

    if (course && !course.thumbnail_url) {
      // Check this is the first (or only) lesson in the course.
      const { data: firstLesson } = await supabase
        .from('lessons')
        .select('id')
        .eq('course_id', lesson.course_id)
        .order('sort_order', { ascending: true })
        .limit(1)
        .single();

      if (!firstLesson || firstLesson.id === lessonId) {
        await supabase
          .from('courses')
          .update({ thumbnail_url: cfThumb })
          .eq('id', lesson.course_id);
      }
    }
  }
}

export async function syncLessonStreamMetaAction(lessonId: string): Promise<ActionState> {
  const profile = await requireMentor();
  await assertLessonOwner(lessonId, profile);

  await syncLessonStreamMetaInternal(lessonId);

  const supabase = await createClient();
  const { data: lesson } = await supabase
    .from('lessons')
    .select('course_id')
    .eq('id', lessonId)
    .single();

  if (lesson?.course_id) {
    safeRevalidate(`/mentor/courses/${lesson.course_id}/edit`);
  }
  return { success: '已同步 Stream 影片資訊' };
}

export async function gradeAssignmentAction(
  assignmentId: string,
  grade: number,
  feedback: string,
): Promise<ActionState> {
  const profile = await requireMentor();

  const supabase = await createClient();

  const { data: asg, error: aErr } = await supabase
    .from('assignments')
    .select('lesson_id')
    .eq('id', assignmentId)
    .maybeSingle();

  if (aErr || !asg?.lesson_id) {
    return { error: '找不到作業' };
  }

  const { data: lesson } = await supabase
    .from('lessons')
    .select('course_id')
    .eq('id', asg.lesson_id)
    .maybeSingle();

  if (!lesson?.course_id) {
    return { error: '找不到作業單元' };
  }

  const { data: course } = await supabase
    .from('courses')
    .select('teacher_id')
    .eq('id', lesson.course_id)
    .maybeSingle();

  if (course?.teacher_id !== profile.id) {
    return { error: '無權批改此作業' };
  }

  if (grade < 0 || grade > 100) {
    return { error: '分數需介於 0–100' };
  }

  const { error } = await supabase
    .from('assignments')
    .update({
      grade,
      feedback: feedback || null,
      status: 'graded',
      graded_by: profile.id,
      graded_at: new Date().toISOString(),
    })
    .eq('id', assignmentId);

  if (error) {
    console.error('[gradeAssignment]', error);
    return { error: error.message };
  }

  safeRevalidate('/mentor', '/mentor/assignments');
  return { success: '已送出批改' };
}
