import type { SupabaseClient } from '@supabase/supabase-js';

export type FulfillCourseEnrollmentResult =
  | { ok: true; alreadyEnrolled: boolean }
  | { ok: false; message: string };

/** 付款成功後將使用者加入課程報名（webhook / 付款確認頁補送） */
export async function fulfillCourseEnrollment(
  supabase: SupabaseClient,
  input: {
    userId: string;
    courseId: string;
    stripePaymentId?: string | null;
  },
): Promise<FulfillCourseEnrollmentResult> {
  const { data: course } = await supabase
    .from('courses')
    .select('id, is_published')
    .eq('id', input.courseId)
    .maybeSingle();

  if (!course?.id || !course.is_published) {
    return { ok: false, message: '課程不存在或未上架' };
  }

  const { data: existing } = await supabase
    .from('enrollments')
    .select('id')
    .eq('user_id', input.userId)
    .eq('course_id', input.courseId)
    .maybeSingle();

  if (existing?.id) {
    return { ok: true, alreadyEnrolled: true };
  }

  const { error } = await supabase.from('enrollments').insert({
    user_id: input.userId,
    course_id: input.courseId,
    stripe_payment_id: input.stripePaymentId?.trim() || null,
  } as never);

  if (error) {
    if (/duplicate|unique/i.test(error.message)) {
      return { ok: true, alreadyEnrolled: true };
    }
    return { ok: false, message: error.message };
  }

  return { ok: true, alreadyEnrolled: false };
}
