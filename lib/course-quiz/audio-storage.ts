import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/database.types';

export const COURSE_QUIZ_AUDIO_BUCKET = 'course-quiz-audio' as const;

export function buildCourseQuizAudioPath(
  courseId: string,
  questionId: string,
  fileName: string,
): string {
  return `${courseId}/${questionId}/${fileName}`;
}

export async function uploadCourseQuizAudioMp3(
  supabase: SupabaseClient<Database>,
  courseId: string,
  questionId: string,
  fileName: string,
  mp3: ArrayBuffer,
): Promise<{ ok: true; publicUrl: string } | { ok: false; error: string }> {
  const path = buildCourseQuizAudioPath(courseId, questionId, fileName);

  const body = mp3 instanceof Blob ? mp3 : new Blob([mp3], { type: 'audio/mpeg' });

  const { error } = await supabase.storage.from(COURSE_QUIZ_AUDIO_BUCKET).upload(path, body, {
    contentType: 'audio/mpeg',
    upsert: true,
  });

  if (error) {
    console.error('[uploadCourseQuizAudioMp3]', error.message);
    return { ok: false, error: error.message || '語音上傳失敗' };
  }

  const { data } = supabase.storage.from(COURSE_QUIZ_AUDIO_BUCKET).getPublicUrl(path);
  const cacheBust = `v=${Date.now()}`;
  const publicUrl = data.publicUrl.includes('?')
    ? `${data.publicUrl}&${cacheBust}`
    : `${data.publicUrl}?${cacheBust}`;

  return { ok: true, publicUrl };
}
