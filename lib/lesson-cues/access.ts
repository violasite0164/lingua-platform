import type { SupabaseClient } from '@supabase/supabase-js';

import { fetchUserSubscriptionTier } from '@/lib/billing/user-subscription-tier';
import {
  hasLessonSubscriptionAccess,
} from '@/lib/billing/subscription-access';
import type { Database } from '@/types/database.types';

/** 學員／試看／訂閱／導師／管理員是否可學習此單元 */
export async function canAccessLessonForLearning(
  supabase: SupabaseClient<Database>,
  userId: string,
  lessonId: string,
): Promise<boolean> {
  const { data: lesson } = await supabase
    .from('lessons')
    .select('course_id, is_preview, sub_basic_free, sub_pro_free')
    .eq('id', lessonId)
    .maybeSingle();

  if (!lesson) return false;
  if (lesson.is_preview) return true;

  const { data: course } = await supabase
    .from('courses')
    .select('teacher_id, sub_basic_free, sub_pro_free')
    .eq('id', lesson.course_id)
    .maybeSingle();

  if (course?.teacher_id === userId) return true;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();

  if (profile?.role === 'admin') return true;

  const tier = await fetchUserSubscriptionTier(supabase, userId);
  if (
    course &&
    hasLessonSubscriptionAccess(
      {
        sub_basic_free: lesson.sub_basic_free,
        sub_pro_free: lesson.sub_pro_free,
      },
      course,
      tier,
    )
  ) {
    return true;
  }

  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id')
    .eq('user_id', userId)
    .eq('course_id', lesson.course_id)
    .maybeSingle();

  return !!enrollment;
}
