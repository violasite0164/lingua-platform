'use server';

import { revalidatePath } from 'next/cache';

import { uploadCourseQuizOptionImageCore } from '@/lib/mentor/course-quiz-option-image-upload';
import {
  uploadCourseQuizShapeTypefaceJson,
} from '@/lib/course-quiz/image-storage';
import { choiceCountForMode } from '@/lib/course-quiz/choice-mode';
import {
  parseOptionImageUrls,
  parseOptionShapeGlyphs,
} from '@/lib/course-quiz/shape-glyphs';
import { requireMentor } from '@/lib/mentor/auth';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import type { CourseQuizChoiceMode, Json } from '@/types/database.types';

function revalidateCourseQuizPaths(courseId: string) {
  revalidatePath('/mentor/course-quizzes');
  revalidatePath(`/mentor/course-quizzes/${courseId}`);
  revalidatePath(`/learn/${courseId}`);
}

async function assertCourseOwner(courseId: string, mentorId: string, isAdmin: boolean) {
  const supabase = await createClient();
  const { data: course } = await supabase
    .from('courses')
    .select('id, teacher_id')
    .eq('id', courseId)
    .maybeSingle();
  if (!course) throw new Error('找不到課程');
  if (!isAdmin && course.teacher_id !== mentorId) {
    throw new Error('無權限編輯此課程');
  }
  return course;
}

async function assertQuizOwner(quizId: string, mentorId: string, isAdmin: boolean) {
  const supabase = await createClient();
  const { data: quiz } = await supabase
    .from('course_quizzes')
    .select('id, course_id, choice_mode')
    .eq('id', quizId)
    .maybeSingle();
  if (!quiz) throw new Error('找不到測驗');
  await assertCourseOwner(quiz.course_id, mentorId, isAdmin);
  return quiz as { id: string; course_id: string; choice_mode: CourseQuizChoiceMode };
}

export type CourseQuizVisualActionState = {
  success?: string;
  error?: string;
  publicUrl?: string;
};

function isMissingColumnError(message: string): boolean {
  return /column.*does not exist|Could not find the/i.test(message);
}

export async function uploadCourseQuizOptionImageAction(
  formData: FormData,
): Promise<CourseQuizVisualActionState> {
  const profile = await requireMentor();
  const questionId = String(formData.get('questionId') ?? '').trim();
  const optionIndex = Number.parseInt(String(formData.get('optionIndex') ?? ''), 10);
  const file = formData.get('file');

  if (!questionId) return { error: '缺少題目 ID' };
  if (!Number.isInteger(optionIndex)) return { error: '選項索引無效' };
  if (!(file instanceof File)) return { error: '請選擇圖片檔案' };

  const result = await uploadCourseQuizOptionImageCore({
    questionId,
    optionIndex,
    file,
    mentorId: profile.id,
    isAdmin: profile.role === 'admin',
  });

  if (result.error) return { error: result.error };

  try {
    const supabase = await createClient();
    const { data: question } = await supabase
      .from('course_quiz_questions')
      .select('quiz_id')
      .eq('id', questionId)
      .maybeSingle();
    if (question?.quiz_id) {
      const quiz = await assertQuizOwner(
        question.quiz_id,
        profile.id,
        profile.role === 'admin',
      );
      revalidateCourseQuizPaths(quiz.course_id);
    }
  } catch {
    /* revalidate best-effort */
  }

  return { success: result.success, publicUrl: result.publicUrl };
}

export async function clearCourseQuizOptionImageAction(
  questionId: string,
  optionIndex: number,
): Promise<CourseQuizVisualActionState> {
  const profile = await requireMentor();
  try {
    const supabase = await createClient();
    const { data: question, error: qErr } = await supabase
      .from('course_quiz_questions')
      .select('id, quiz_id, option_image_urls')
      .eq('id', questionId)
      .single();
    if (qErr || !question) return { error: qErr?.message ?? '找不到題目' };

    const quiz = await assertQuizOwner(question.quiz_id, profile.id, profile.role === 'admin');
    const count = choiceCountForMode(quiz.choice_mode);
    const urls = parseOptionImageUrls(question.option_image_urls, count);
    urls[optionIndex] = '';

    const { error: upErr } = await supabase
      .from('course_quiz_questions')
      .update({ option_image_urls: urls as unknown as Json } as never)
      .eq('id', questionId);

    if (upErr) return { error: upErr.message };

    revalidateCourseQuizPaths(quiz.course_id);
    return { success: '已移除選項圖片' };
  } catch (e) {
    return { error: e instanceof Error ? e.message : '更新失敗' };
  }
}

export async function updateCourseQuizOptionShapeGlyphsAction(
  questionId: string,
  glyphs: string[],
): Promise<CourseQuizVisualActionState> {
  const profile = await requireMentor();
  try {
    const supabase = await createClient();
    const { data: question, error: qErr } = await supabase
      .from('course_quiz_questions')
      .select('id, quiz_id')
      .eq('id', questionId)
      .single();
    if (qErr || !question) return { error: qErr?.message ?? '找不到題目' };

    const quiz = await assertQuizOwner(question.quiz_id, profile.id, profile.role === 'admin');
    const count = choiceCountForMode(quiz.choice_mode);
    const normalized = parseOptionShapeGlyphs(glyphs, count);

    const { error: upErr } = await supabase
      .from('course_quiz_questions')
      .update({ option_shape_glyphs: normalized as unknown as Json } as never)
      .eq('id', questionId);

    if (upErr) {
      return {
        error: isMissingColumnError(upErr.message)
          ? '請先套用 migration：supabase/migrations/20260604120000_course_quiz_shape_mode.sql'
          : upErr.message,
      };
    }

    revalidateCourseQuizPaths(quiz.course_id);
    return { success: '圖形設定已儲存' };
  } catch (e) {
    return { error: e instanceof Error ? e.message : '更新失敗' };
  }
}

export async function uploadCourseQuizShapeTypefaceAction(
  quizId: string,
  formData: FormData,
): Promise<CourseQuizVisualActionState> {
  const profile = await requireMentor();
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { error: '請選擇 typeface JSON 檔案' };
  }
  if (file.size > 2 * 1024 * 1024) {
    return { error: 'JSON 請小於 2MB' };
  }

  let jsonText: string;
  try {
    jsonText = await file.text();
    const parsed = JSON.parse(jsonText) as { glyphs?: unknown };
    if (!parsed.glyphs || typeof parsed.glyphs !== 'object') {
      return { error: 'JSON 須含 glyphs 物件（Three.js typeface 格式）' };
    }
    const { isValidTypefaceJson, normalizeTypefaceJson } = await import(
      '@/lib/course-quiz/typeface-json'
    );
    if (!isValidTypefaceJson(parsed)) {
      return {
        error:
          'JSON 須為完整 Three.js typeface（含 glyphs、boundingBox、resolution 等）；系統會自動補齊缺少欄位，但至少需有一個 glyph。',
      };
    }
    jsonText = JSON.stringify(normalizeTypefaceJson(parsed));
  } catch {
    return { error: '無法解析 JSON' };
  }

  try {
    const quiz = await assertQuizOwner(quizId, profile.id, profile.role === 'admin');
    const storageClient = process.env.SUPABASE_SERVICE_ROLE_KEY
      ? await createAdminClient()
      : await createClient();

    const uploaded = await uploadCourseQuizShapeTypefaceJson(
      storageClient,
      quiz.course_id,
      quizId,
      jsonText,
    );
    if (!uploaded.ok) return { error: uploaded.error };

    const supabase = await createClient();
    const { error: upErr } = await supabase
      .from('course_quizzes')
      .update({ shape_typeface_url: uploaded.publicUrl } as never)
      .eq('id', quizId);

    if (upErr) {
      return {
        error: isMissingColumnError(upErr.message)
          ? '請先套用 migration：supabase/migrations/20260604120000_course_quiz_shape_mode.sql'
          : upErr.message,
      };
    }

    revalidateCourseQuizPaths(quiz.course_id);
    return { success: '自訂字型已上傳', publicUrl: uploaded.publicUrl };
  } catch (e) {
    return { error: e instanceof Error ? e.message : '上傳失敗' };
  }
}

export async function clearCourseQuizShapeTypefaceAction(
  quizId: string,
): Promise<CourseQuizVisualActionState> {
  const profile = await requireMentor();
  try {
    const quiz = await assertQuizOwner(quizId, profile.id, profile.role === 'admin');
    const supabase = await createClient();
    const { error } = await supabase
      .from('course_quizzes')
      .update({ shape_typeface_url: null } as never)
      .eq('id', quizId);
    if (error) return { error: error.message };
    revalidateCourseQuizPaths(quiz.course_id);
    return { success: '已改為內建圓／三角字型' };
  } catch (e) {
    return { error: e instanceof Error ? e.message : '更新失敗' };
  }
}
