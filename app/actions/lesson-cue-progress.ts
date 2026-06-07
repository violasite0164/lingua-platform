'use server';

import { revalidatePath } from 'next/cache';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { canAccessLessonForLearning } from '@/lib/lesson-cues/access';
import {
  allRequiredCuesAnswered,
  getRequiredCueIds,
} from '@/lib/lesson-cues/completion';
import { getLessonTimedCues } from '@/lib/supabase/queries';
import { markLessonComplete } from '@/app/actions/progress';

async function fetchAnsweredCueIds(
  lessonId: string,
  userId: string,
): Promise<{ ids: string[]; error?: string }> {
  try {
    const admin = await createAdminClient();
    const { data, error } = await admin
      .from('lesson_cue_answers')
      .select('cue_id')
      .eq('user_id', userId)
      .eq('lesson_id', lessonId);

    if (error) {
      const missingTable =
        error.code === '42P01' ||
        (error.message ?? '').includes('lesson_cue_answers');
      if (missingTable) {
        return {
          ids: [],
          error:
            '作答紀錄資料表尚未建立，請在 Supabase 執行 migration：20260525120000_lesson_cue_answers.sql',
        };
      }
      return { ids: [], error: error.message };
    }

    return { ids: (data ?? []).map((r) => r.cue_id) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : '無法讀取作答紀錄';
    if (msg.includes('SUPABASE_SERVICE_ROLE')) {
      return {
        ids: [],
        error: '伺服器缺少 SUPABASE_SERVICE_ROLE_KEY，無法儲存互動題進度',
      };
    }
    return { ids: [], error: msg };
  }
}

export async function getAnsweredCueIdsForLesson(
  lessonId: string,
): Promise<string[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { ids, error } = await fetchAnsweredCueIds(lessonId, user.id);
  if (error) console.error('[getAnsweredCueIdsForLesson]', error);
  return ids;
}

async function tryMarkLessonCompleteIfCuesDone(
  lessonId: string,
  userId: string,
): Promise<boolean> {
  const cues = await getLessonTimedCues(lessonId);
  const requiredIds = getRequiredCueIds(cues);
  if (requiredIds.length === 0) return false;

  const { ids: answered } = await fetchAnsweredCueIds(lessonId, userId);
  if (!allRequiredCuesAnswered(requiredIds, answered)) return false;

  await markLessonComplete({ lessonId });
  return true;
}

/**
 * 記錄學員已答對的選擇題／文字輸入；全部答對時標記單元完成（XP 僅首次發放）。
 */
export async function recordLessonCueAnswer({
  lessonId,
  cueId,
  courseId,
}: {
  lessonId: string;
  cueId: string;
  courseId: string;
}): Promise<{
  error?: string;
  answeredCueIds?: string[];
  lessonCompleted?: boolean;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '請先登入' };

  if (!(await canAccessLessonForLearning(supabase, user.id, lessonId))) {
    return { error: '您尚未報名此課程，無法儲存作答' };
  }

  const { data: cue } = await supabase
    .from('lesson_timed_cues')
    .select('id, lesson_id, cue_type, is_enabled')
    .eq('id', cueId)
    .eq('lesson_id', lessonId)
    .maybeSingle();

  if (
    !cue ||
    !cue.is_enabled ||
    (cue.cue_type !== 'multiple_choice' && cue.cue_type !== 'text_input')
  ) {
    return { error: '無效的互動題' };
  }

  try {
    const admin = await createAdminClient();
    const { error: insertErr } = await admin.from('lesson_cue_answers').upsert(
      {
        user_id: user.id,
        lesson_id: lessonId,
        cue_id: cueId,
        answered_at: new Date().toISOString(),
      } as never,
      { onConflict: 'user_id,cue_id' },
    );

    if (insertErr) {
      console.error('[recordLessonCueAnswer]', insertErr);
      const missingTable =
        insertErr.code === '42P01' ||
        (insertErr.message ?? '').includes('lesson_cue_answers');
      if (missingTable) {
        return {
          error:
            '作答紀錄資料表尚未建立，請在 Supabase 執行 migration：20260525120000_lesson_cue_answers.sql',
        };
      }
      return { error: insertErr.message };
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : '儲存作答失敗';
    if (msg.includes('SERVICE_ROLE') || msg.includes('SUPABASE_SERVICE_ROLE')) {
      return {
        error: '伺服器缺少 SUPABASE_SERVICE_ROLE_KEY，無法儲存互動題進度',
      };
    }
    return { error: msg };
  }

  const { ids: answeredCueIds, error: readErr } = await fetchAnsweredCueIds(
    lessonId,
    user.id,
  );
  if (readErr) {
    return { error: readErr, answeredCueIds };
  }

  const lessonCompleted = await tryMarkLessonCompleteIfCuesDone(
    lessonId,
    user.id,
  );

  revalidatePath(`/learn/${courseId}/${lessonId}`);
  revalidatePath(`/learn/${courseId}`);
  revalidatePath(`/courses/${courseId}`);
  if (lessonCompleted) revalidatePath('/dashboard');

  return { answeredCueIds, lessonCompleted };
}

/** 客戶端進度已滿時，向伺服器確認是否可標記完成（補救漏標記） */
export async function syncLessonCompletionIfReady({
  lessonId,
  courseId,
}: {
  lessonId: string;
  courseId: string;
}): Promise<{ lessonCompleted?: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '請先登入' };

  const lessonCompleted = await tryMarkLessonCompleteIfCuesDone(
    lessonId,
    user.id,
  );

  if (lessonCompleted) {
    revalidatePath(`/learn/${courseId}/${lessonId}`);
    revalidatePath(`/learn/${courseId}`);
    revalidatePath(`/courses/${courseId}`);
    revalidatePath('/dashboard');
  }

  return { lessonCompleted };
}

/** 重新學習：清除互動作答與完成狀態，保留 XP 發放紀錄 */
export async function resetLessonLearning({
  lessonId,
  courseId,
}: {
  lessonId: string;
  courseId: string;
}): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '請先登入' };

  try {
    const admin = await createAdminClient();
    const { error: delErr } = await admin
      .from('lesson_cue_answers')
      .delete()
      .eq('user_id', user.id)
      .eq('lesson_id', lessonId);

    if (delErr) {
      console.error('[resetLessonLearning] answers', delErr);
      const msg = delErr.message ?? '';
      if (msg.includes('lesson_cue_answers') || delErr.code === '42P01') {
        return {
          error:
            '資料表尚未建立，請在 Supabase 執行 migration：20260525120000_lesson_cue_answers.sql',
        };
      }
      return { error: delErr.message };
    }
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : '重置失敗',
    };
  }

  const { data: progressRow } = await supabase
    .from('user_progress')
    .select('id')
    .eq('user_id', user.id)
    .eq('lesson_id', lessonId)
    .maybeSingle();

  if (progressRow) {
    const { error: progErr } = await supabase
      .from('user_progress')
      .update({
        completed: false,
        completed_at: null,
        watched_seconds: 0,
      } as never)
      .eq('user_id', user.id)
      .eq('lesson_id', lessonId);

    if (progErr) {
      console.error('[resetLessonLearning] progress', progErr);
      return { error: progErr.message };
    }
  }

  revalidatePath(`/learn/${courseId}/${lessonId}`);
  revalidatePath(`/learn/${courseId}`);
  revalidatePath(`/courses/${courseId}`);
  revalidatePath('/dashboard');

  return {};
}
