'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';
import { revalidateCourseAccessPaths } from '@/lib/courses/revalidate-access';
import { requireMentor } from '@/lib/mentor/auth';
import {
  upsertCourseQuizQuestionSchemaForMode,
  upsertCourseQuizSchema,
} from '@/lib/mentor/course-quiz-schemas';
import { resolveCourseQuizVocabularyDisplay } from '@/lib/course-quiz/vocabulary-display';
import type {
  CourseQuiz,
  CourseQuizChoiceMode,
  CourseQuizInteractionMode,
  CourseQuizQuestion,
  CourseQuizStep,
  CourseQuizVocabularyDisplay,
  Json,
} from '@/types/database.types';

export type CourseQuizActionState = { error?: string; success?: string };

const OUTCOME_VIDEO_MIGRATION_HINT =
  '資料庫尚未套用答題結果影片欄位。請在 Supabase SQL Editor 執行 migration：supabase/migrations/20260602180000_course_quiz_outcome_videos.sql，完成後在 Dashboard → Settings → API 點「Reload schema」';

function isMissingOutcomeVideoColumnError(message: string): boolean {
  return /cf_correct_video_uid|cf_wrong_video_uid/i.test(message);
}

function stripOutcomeVideoFields<T extends Record<string, unknown>>(row: T): Omit<T, 'cf_correct_video_uid' | 'cf_wrong_video_uid'> {
  const { cf_correct_video_uid: _c, cf_wrong_video_uid: _w, ...rest } = row;
  return rest;
}

function revalidateCourseQuizPaths(courseId: string) {
  revalidatePath('/mentor/course-quizzes');
  revalidatePath(`/mentor/course-quizzes/${courseId}`);
  revalidateCourseAccessPaths(courseId);
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

async function nextStepSortOrder(quizId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from('course_quiz_steps')
    .select('*', { count: 'exact', head: true })
    .eq('quiz_id', quizId);
  return (count ?? 0) + 1;
}

async function assertQuizOwner(quizId: string, mentorId: string, isAdmin: boolean) {
  const supabase = await createClient();
  const { data: quiz } = await supabase
    .from('course_quizzes')
    .select('id, course_id, choice_mode, interaction_mode, vocabulary_display')
    .eq('id', quizId)
    .maybeSingle();

  if (!quiz) throw new Error('找不到測驗');
  await assertCourseOwner(quiz.course_id, mentorId, isAdmin);
  return quiz as {
    id: string;
    course_id: string;
    choice_mode: CourseQuizChoiceMode;
    interaction_mode: CourseQuizInteractionMode;
    vocabulary_display: CourseQuizVocabularyDisplay | null;
  };
}

export async function listCourseQuizzesAction(courseId: string) {
  const profile = await requireMentor();
  await assertCourseOwner(courseId, profile.id, profile.role === 'admin');

  const supabase = await createClient();
  const { data: quizzes, error } = await supabase
    .from('course_quizzes')
    .select('*')
    .eq('course_id', courseId)
    .order('sort_order');

  if (error) return { error: error.message, quizzes: [] as CourseQuiz[] };

  const quizIds = (quizzes ?? []).map((q) => q.id);
  let questions: CourseQuizQuestion[] = [];
  if (quizIds.length > 0) {
    const { data: qRows } = await supabase
      .from('course_quiz_questions')
      .select('*')
      .in('quiz_id', quizIds)
      .order('sort_order');
    questions = (qRows ?? []) as CourseQuizQuestion[];
  }

  return {
    quizzes: (quizzes ?? []) as CourseQuiz[],
    questions,
  };
}

export async function createCourseQuizAction(
  input: unknown,
): Promise<CourseQuizActionState & { quiz?: CourseQuiz }> {
  const profile = await requireMentor();
  const parsed = upsertCourseQuizSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? '資料格式錯誤' };
  }

  const data = parsed.data;
  if (data.placement === 'after_lesson' && !data.after_lesson_id) {
    return { error: '請選擇要插入在哪個單元之後' };
  }

  try {
    await assertCourseOwner(data.course_id, profile.id, profile.role === 'admin');
  } catch (e) {
    return { error: e instanceof Error ? e.message : '無權限' };
  }

  const supabase = await createClient();
  const { count } = await supabase
    .from('course_quizzes')
    .select('*', { count: 'exact', head: true })
    .eq('course_id', data.course_id);

  const sortOrder = (count ?? 0) + 1;

  const { data: row, error } = await supabase
    .from('course_quizzes')
    .insert({
      course_id: data.course_id,
      title: data.title,
      placement: data.placement,
      choice_mode: data.choice_mode,
      play_theme: data.play_theme,
      interaction_mode: data.interaction_mode,
      vocabulary_display:
        data.interaction_mode === 'vocabulary_drop' ? data.vocabulary_display : 'character',
      after_lesson_id:
        data.placement === 'final_exam' ? null : data.after_lesson_id ?? null,
      require_to_continue: data.require_to_continue,
      require_to_complete_course: data.require_to_complete_course,
      xp_reward: data.xp_reward,
      is_published: data.is_published,
      sort_order: sortOrder,
    } as never)
    .select()
    .single();

  if (error) return { error: error.message };

  revalidateCourseQuizPaths(data.course_id);
  return { success: '已建立課堂測驗', quiz: row as CourseQuiz };
}

export async function updateCourseQuizAction(
  quizId: string,
  input: unknown,
): Promise<CourseQuizActionState> {
  const profile = await requireMentor();
  const parsed = upsertCourseQuizSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? '資料格式錯誤' };
  }

  const data = parsed.data;
  if (data.placement === 'after_lesson' && !data.after_lesson_id) {
    return { error: '請選擇要插入在哪個單元之後' };
  }

  try {
    const quiz = await assertQuizOwner(quizId, profile.id, profile.role === 'admin');
    await assertCourseOwner(data.course_id, profile.id, profile.role === 'admin');

    const supabase = await createClient();
    const { error } = await supabase
      .from('course_quizzes')
      .update({
        title: data.title,
        placement: data.placement,
        choice_mode: data.choice_mode,
        play_theme: data.play_theme,
        interaction_mode: data.interaction_mode,
        vocabulary_display:
          data.interaction_mode === 'vocabulary_drop' ? data.vocabulary_display : 'character',
        after_lesson_id:
          data.placement === 'final_exam' ? null : data.after_lesson_id ?? null,
        require_to_continue: data.require_to_continue,
        require_to_complete_course: data.require_to_complete_course,
        xp_reward: data.xp_reward,
        is_published: data.is_published,
        sub_basic_free:
          data.sub_access_override === true ? (data.sub_basic_free ?? false) : null,
        sub_pro_free:
          data.sub_access_override === true ? (data.sub_pro_free ?? false) : null,
      } as never)
      .eq('id', quizId);

    if (error) return { error: error.message };

    revalidateCourseQuizPaths(data.course_id);
    return { success: '已更新測驗設定' };
  } catch (e) {
    return { error: e instanceof Error ? e.message : '更新失敗' };
  }
}

export async function deleteCourseQuizAction(
  quizId: string,
): Promise<CourseQuizActionState> {
  const profile = await requireMentor();

  try {
    const quiz = await assertQuizOwner(quizId, profile.id, profile.role === 'admin');
    const supabase = await createClient();
    const { error } = await supabase.from('course_quizzes').delete().eq('id', quizId);
    if (error) return { error: error.message };

    revalidateCourseQuizPaths(quiz.course_id);
    return { success: '已刪除測驗' };
  } catch (e) {
    return { error: e instanceof Error ? e.message : '刪除失敗' };
  }
}

export async function createCourseQuizQuestionAction(
  input: unknown,
): Promise<CourseQuizActionState & { question?: CourseQuizQuestion }> {
  const profile = await requireMentor();

  try {
    const quizId =
      input && typeof input === 'object' && 'quiz_id' in input
        ? String((input as { quiz_id: string }).quiz_id)
        : '';
    const quiz = await assertQuizOwner(quizId, profile.id, profile.role === 'admin');
    const parsed = upsertCourseQuizQuestionSchemaForMode(quiz.choice_mode).safeParse(
      input,
    );
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? '資料格式錯誤' };
    }

    const data = parsed.data;
    const supabase = await createClient();

    const { count } = await supabase
      .from('course_quiz_questions')
      .select('*', { count: 'exact', head: true })
      .eq('quiz_id', data.quiz_id);

    const vocabularyDisplay =
      data.vocabulary_display ??
      (quiz.interaction_mode === 'vocabulary_drop'
        ? resolveCourseQuizVocabularyDisplay(quiz.vocabulary_display)
        : 'character');

    const insertRow = {
      quiz_id: data.quiz_id,
      sort_order: (count ?? 0) + 1,
      question_text: data.question_text,
      question_speech_text: data.question_speech_text ?? '',
      options: data.options as unknown as Json,
      correct_index: data.correct_index,
      explanation: data.explanation ?? '',
      cf_video_uid: data.cf_video_uid ?? null,
      cf_correct_video_uid: data.cf_correct_video_uid ?? null,
      cf_wrong_video_uid: data.cf_wrong_video_uid ?? null,
      vocabulary_display: vocabularyDisplay,
    };

    let { data: row, error } = await supabase
      .from('course_quiz_questions')
      .insert(insertRow as never)
      .select()
      .single();

    if (error && isMissingOutcomeVideoColumnError(error.message)) {
      ({ data: row, error } = await supabase
        .from('course_quiz_questions')
        .insert(stripOutcomeVideoFields(insertRow) as never)
        .select()
        .single());
    }

    if (error) {
      return {
        error: isMissingOutcomeVideoColumnError(error.message)
          ? OUTCOME_VIDEO_MIGRATION_HINT
          : error.message,
      };
    }

    const question = row as CourseQuizQuestion;
    const sortOrder = await nextStepSortOrder(data.quiz_id);
    await supabase.from('course_quiz_steps').insert({
      quiz_id: data.quiz_id,
      sort_order: sortOrder,
      step_kind: 'question',
      question_id: question.id,
    } as never);

    revalidateCourseQuizPaths(quiz.course_id);
    return { success: '已新增題目', question };
  } catch (e) {
    return { error: e instanceof Error ? e.message : '新增失敗' };
  }
}

export async function updateCourseQuizQuestionAction(
  questionId: string,
  input: unknown,
): Promise<CourseQuizActionState> {
  const profile = await requireMentor();

  try {
    const quizId =
      input && typeof input === 'object' && 'quiz_id' in input
        ? String((input as { quiz_id: string }).quiz_id)
        : '';
    const quiz = await assertQuizOwner(quizId, profile.id, profile.role === 'admin');
    const parsed = upsertCourseQuizQuestionSchemaForMode(quiz.choice_mode).safeParse(
      input,
    );
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? '資料格式錯誤' };
    }

    const data = parsed.data;
    const supabase = await createClient();
    const patch: Record<string, unknown> = {
      question_text: data.question_text,
      question_speech_text: data.question_speech_text ?? '',
      options: data.options as unknown as Json,
      correct_index: data.correct_index,
      explanation: data.explanation ?? '',
    };
    // 僅在明確傳入時更新影片 UID（避免儲存題目文字時覆蓋剛上傳的影片）
    if (data.cf_video_uid !== undefined) {
      patch.cf_video_uid = data.cf_video_uid;
    }
    if (data.cf_correct_video_uid !== undefined) {
      patch.cf_correct_video_uid = data.cf_correct_video_uid;
    }
    if (data.cf_wrong_video_uid !== undefined) {
      patch.cf_wrong_video_uid = data.cf_wrong_video_uid;
    }
    if (data.option_image_urls !== undefined) {
      patch.option_image_urls = data.option_image_urls as unknown as Json;
    }
    if (data.option_shape_glyphs !== undefined) {
      patch.option_shape_glyphs = data.option_shape_glyphs as unknown as Json;
    }
    if (data.vocabulary_display !== undefined) {
      patch.vocabulary_display = data.vocabulary_display;
    }

    let { error } = await supabase
      .from('course_quiz_questions')
      .update(patch as never)
      .eq('id', questionId);

    if (error && isMissingOutcomeVideoColumnError(error.message)) {
      ({ error } = await supabase
        .from('course_quiz_questions')
        .update(stripOutcomeVideoFields(patch) as never)
        .eq('id', questionId));
    }

    if (error) {
      return {
        error: isMissingOutcomeVideoColumnError(error.message)
          ? OUTCOME_VIDEO_MIGRATION_HINT
          : error.message,
      };
    }

    revalidateCourseQuizPaths(quiz.course_id);
    return { success: '已更新題目' };
  } catch (e) {
    return { error: e instanceof Error ? e.message : '更新失敗' };
  }
}

export async function deleteCourseQuizQuestionAction(
  questionId: string,
): Promise<CourseQuizActionState> {
  const profile = await requireMentor();

  const supabase = await createClient();
  const { data: question } = await supabase
    .from('course_quiz_questions')
    .select('id, quiz_id')
    .eq('id', questionId)
    .maybeSingle();

  if (!question) return { error: '找不到題目' };

  try {
    const quiz = await assertQuizOwner(question.quiz_id, profile.id, profile.role === 'admin');
    const { error } = await supabase
      .from('course_quiz_questions')
      .delete()
      .eq('id', questionId);

    if (error) return { error: error.message };

    revalidateCourseQuizPaths(quiz.course_id);
    return { success: '已刪除題目' };
  } catch (e) {
    return { error: e instanceof Error ? e.message : '刪除失敗' };
  }
}

export async function saveCourseQuizQuestionVideoAction(
  questionId: string,
  cfVideoUid: string,
): Promise<CourseQuizActionState> {
  const profile = await requireMentor();

  const supabase = await createClient();
  const { data: question } = await supabase
    .from('course_quiz_questions')
    .select('id, quiz_id')
    .eq('id', questionId)
    .maybeSingle();

  if (!question) return { error: '找不到題目' };

  try {
    const quiz = await assertQuizOwner(question.quiz_id, profile.id, profile.role === 'admin');
    const { error } = await supabase
      .from('course_quiz_questions')
      .update({ cf_video_uid: cfVideoUid } as never)
      .eq('id', questionId);

    if (error) return { error: error.message };

    revalidateCourseQuizPaths(quiz.course_id);
    return { success: '影片已連結' };
  } catch (e) {
    return { error: e instanceof Error ? e.message : '儲存失敗' };
  }
}

export async function saveCourseQuizQuestionOutcomeVideoAction(
  questionId: string,
  kind: 'correct' | 'wrong',
  cfVideoUid: string,
): Promise<CourseQuizActionState> {
  const profile = await requireMentor();

  const supabase = await createClient();
  const { data: question } = await supabase
    .from('course_quiz_questions')
    .select('id, quiz_id')
    .eq('id', questionId)
    .maybeSingle();

  if (!question) return { error: '找不到題目' };

  try {
    const quiz = await assertQuizOwner(question.quiz_id, profile.id, profile.role === 'admin');
    const patch =
      kind === 'correct'
        ? ({ cf_correct_video_uid: cfVideoUid } as const)
        : ({ cf_wrong_video_uid: cfVideoUid } as const);
    const { error } = await supabase
      .from('course_quiz_questions')
      .update(patch as never)
      .eq('id', questionId);

    if (error) {
      return {
        error: isMissingOutcomeVideoColumnError(error.message)
          ? OUTCOME_VIDEO_MIGRATION_HINT
          : error.message,
      };
    }

    revalidateCourseQuizPaths(quiz.course_id);
    return { success: kind === 'correct' ? '答對影片已連結' : '答錯影片已連結' };
  } catch (e) {
    return { error: e instanceof Error ? e.message : '儲存失敗' };
  }
}

export async function deleteCourseQuizStepAction(
  stepId: string,
): Promise<CourseQuizActionState> {
  const profile = await requireMentor();

  const supabase = await createClient();
  const { data: step } = await supabase
    .from('course_quiz_steps')
    .select('id, quiz_id, step_kind, question_id')
    .eq('id', stepId)
    .maybeSingle();

  if (!step) return { error: '找不到流程項目' };

  try {
    const quiz = await assertQuizOwner(step.quiz_id, profile.id, profile.role === 'admin');

    if (step.step_kind === 'question' && step.question_id) {
      await supabase.from('course_quiz_questions').delete().eq('id', step.question_id);
    } else {
      const { error } = await supabase.from('course_quiz_steps').delete().eq('id', stepId);
      if (error) return { error: error.message };
    }

    revalidateCourseQuizPaths(quiz.course_id);
    return { success: '已刪除' };
  } catch (e) {
    return { error: e instanceof Error ? e.message : '刪除失敗' };
  }
}

export async function reorderCourseQuizStepsAction(
  quizId: string,
  orderedStepIds: string[],
): Promise<CourseQuizActionState> {
  const profile = await requireMentor();

  try {
    const quiz = await assertQuizOwner(quizId, profile.id, profile.role === 'admin');
    const supabase = await createClient();

    for (let i = 0; i < orderedStepIds.length; i++) {
      const id = orderedStepIds[i]!;
      const { error } = await supabase
        .from('course_quiz_steps')
        .update({ sort_order: i + 1 } as never)
        .eq('id', id)
        .eq('quiz_id', quizId);

      if (error) return { error: error.message };
    }

    revalidateCourseQuizPaths(quiz.course_id);
    return { success: '已更新順序' };
  } catch (e) {
    return { error: e instanceof Error ? e.message : '排序失敗' };
  }
}

export async function moveCourseQuizStepAction(
  stepId: string,
  direction: 'up' | 'down',
): Promise<CourseQuizActionState> {
  const profile = await requireMentor();
  const supabase = await createClient();

  const { data: step } = await supabase
    .from('course_quiz_steps')
    .select('id, quiz_id, sort_order')
    .eq('id', stepId)
    .maybeSingle();

  if (!step) return { error: '找不到流程項目' };

  try {
    await assertQuizOwner(step.quiz_id, profile.id, profile.role === 'admin');

    const { data: siblings } = await supabase
      .from('course_quiz_steps')
      .select('id, sort_order')
      .eq('quiz_id', step.quiz_id)
      .order('sort_order');

    const list = siblings ?? [];
    const idx = list.findIndex((s) => s.id === stepId);
    if (idx < 0) return { error: '找不到流程項目' };

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= list.length) {
      return { success: '已在邊界' };
    }

    const a = list[idx]!;
    const b = list[swapIdx]!;

    await supabase
      .from('course_quiz_steps')
      .update({ sort_order: b.sort_order } as never)
      .eq('id', a.id);
    await supabase
      .from('course_quiz_steps')
      .update({ sort_order: a.sort_order } as never)
      .eq('id', b.id);

    const quiz = await assertQuizOwner(step.quiz_id, profile.id, profile.role === 'admin');
    revalidateCourseQuizPaths(quiz.course_id);
    return { success: '已調整順序' };
  } catch (e) {
    return { error: e instanceof Error ? e.message : '排序失敗' };
  }
}
