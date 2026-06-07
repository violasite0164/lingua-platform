import type { SupabaseClient } from '@supabase/supabase-js';

import { choiceCountForMode } from '@/lib/course-quiz/choice-mode';
import { uploadCourseQuizOptionImage } from '@/lib/course-quiz/image-storage';
import { parseOptionImageUrls } from '@/lib/course-quiz/shape-glyphs';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import type { Json } from '@/types/database.types';

export type CourseQuizOptionImageUploadResult = {
  success?: string;
  error?: string;
  publicUrl?: string;
};

function isMissingColumnError(message: string): boolean {
  return /column.*does not exist|Could not find the/i.test(message);
}

async function assertQuizOwnerForQuestion(
  questionId: string,
  mentorId: string,
  isAdmin: boolean,
) {
  const supabase = await createClient();
  const { data: question, error: qErr } = await supabase
    .from('course_quiz_questions')
    .select('id, quiz_id, option_image_urls')
    .eq('id', questionId)
    .single();

  if (qErr || !question) {
    throw new Error(qErr?.message ?? '找不到題目');
  }

  const { data: quiz, error: quizErr } = await supabase
    .from('course_quizzes')
    .select('id, course_id, choice_mode')
    .eq('id', question.quiz_id)
    .single();

  if (quizErr || !quiz) throw new Error(quizErr?.message ?? '找不到測驗');

  const { data: course, error: courseErr } = await supabase
    .from('courses')
    .select('teacher_id')
    .eq('id', quiz.course_id)
    .single();

  if (courseErr || !course) throw new Error(courseErr?.message ?? '找不到課程');
  if (!isAdmin && course.teacher_id !== mentorId) {
    throw new Error('無權限編輯此課程');
  }

  return { question, courseId: quiz.course_id, choiceMode: quiz.choice_mode };
}

/** 上傳課堂測驗圖形模式選項圖片並寫入 option_image_urls */
export async function uploadCourseQuizOptionImageCore(
  input: {
    questionId: string;
    optionIndex: number;
    file: File;
    mentorId: string;
    isAdmin: boolean;
  },
): Promise<CourseQuizOptionImageUploadResult> {
  const { questionId, optionIndex, file, mentorId, isAdmin } = input;

  if (!(file instanceof File) || file.size === 0) {
    return { error: '請選擇圖片檔案' };
  }
  if (!file.type.startsWith('image/')) {
    return { error: '僅支援圖片格式（PNG、JPEG、WebP、GIF）' };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { error: '圖片請小於 5MB' };
  }

  try {
    const { question, courseId, choiceMode } = await assertQuizOwnerForQuestion(
      questionId,
      mentorId,
      isAdmin,
    );
    const count = choiceCountForMode(choiceMode);
    if (optionIndex < 0 || optionIndex >= count) {
      return { error: '選項索引無效' };
    }

    const storageClient = process.env.SUPABASE_SERVICE_ROLE_KEY
      ? await createAdminClient()
      : await createClient();

    const buffer = await file.arrayBuffer();
    const uploaded = await uploadCourseQuizOptionImage(
      storageClient,
      courseId,
      questionId,
      optionIndex,
      new Blob([buffer], { type: file.type }),
      file.type,
    );
    if (!uploaded.ok) return { error: uploaded.error };

    const urls = parseOptionImageUrls(question.option_image_urls, count);
    urls[optionIndex] = uploaded.publicUrl;

    const dbClient: SupabaseClient = process.env.SUPABASE_SERVICE_ROLE_KEY
      ? await createAdminClient()
      : await createClient();

    const { error: upErr } = await dbClient
      .from('course_quiz_questions')
      .update({ option_image_urls: urls as unknown as Json } as never)
      .eq('id', questionId);

    if (upErr) {
      return {
        error: isMissingColumnError(upErr.message)
          ? '請先套用 migration：supabase/migrations/20260604120000_course_quiz_shape_mode.sql'
          : upErr.message,
      };
    }

    return { success: '選項圖片已上傳', publicUrl: uploaded.publicUrl };
  } catch (e) {
    return { error: e instanceof Error ? e.message : '上傳失敗' };
  }
}
