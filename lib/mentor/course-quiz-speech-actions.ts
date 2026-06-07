'use server';

import { revalidatePath } from 'next/cache';

import { synthesizeAzureSpeechMp3 } from '@/lib/azure/speech-tts';
import { isAzureSpeechConfigured } from '@/lib/azure/speech-config';
import { uploadCourseQuizAudioMp3 } from '@/lib/course-quiz/audio-storage';
import { questionSpeechSource, textForQuizSpeech } from '@/lib/course-quiz/speech-text';
import { requireMentor } from '@/lib/mentor/auth';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import type { CourseQuizQuestion, Json } from '@/types/database.types';

export type CourseQuizSpeechActionState = { error?: string; success?: string };

export type GenerateCourseQuizSpeechDraft = {
  /** 表單中的「問題語音」；有值時優先於資料庫與題目文字 */
  question_speech_text?: string;
};

async function assertQuestionOwner(questionId: string, mentorId: string, isAdmin: boolean) {
  const supabase = await createClient();
  const { data: row } = await supabase
    .from('course_quiz_questions')
    .select('*')
    .eq('id', questionId)
    .maybeSingle();

  if (!row) throw new Error('找不到題目');

  const { data: quiz } = await supabase
    .from('course_quizzes')
    .select('course_id')
    .eq('id', row.quiz_id)
    .maybeSingle();

  if (!quiz) throw new Error('找不到測驗');

  const { data: course } = await supabase
    .from('courses')
    .select('teacher_id')
    .eq('id', quiz.course_id)
    .maybeSingle();

  if (!course) throw new Error('找不到課程');
  if (!isAdmin && course.teacher_id !== mentorId) {
    throw new Error('無權限編輯此題目');
  }

  return {
    question: row as CourseQuizQuestion,
    courseId: quiz.course_id,
  };
}

/**
 * 以 Azure Speech 為題目與各選項產生英文語音並寫入 Storage。
 */
export async function generateCourseQuizQuestionSpeechAction(
  questionId: string,
  draft?: GenerateCourseQuizSpeechDraft,
): Promise<CourseQuizSpeechActionState> {
  if (!isAzureSpeechConfigured()) {
    return {
      error:
        '未設定 Azure Speech。請在伺服器加入 AZURE_SPEECH_KEY、AZURE_SPEECH_REGION（可選 AZURE_SPEECH_VOICE），並重啟 npm run dev。',
    };
  }

  try {
    const profile = await requireMentor();
    const { question, courseId } = await assertQuestionOwner(
      questionId,
      profile.id,
      profile.role === 'admin',
    );

    const supabase = await createClient();

    const speechTextFromDraft =
      draft?.question_speech_text !== undefined
        ? String(draft.question_speech_text)
        : null;
    const mergedSpeechText =
      speechTextFromDraft !== null
        ? speechTextFromDraft
        : (question.question_speech_text ?? '');

    if (speechTextFromDraft !== null) {
      const { error: saveSpeechErr } = await supabase
        .from('course_quiz_questions')
        .update({ question_speech_text: speechTextFromDraft } as never)
        .eq('id', questionId);
      if (saveSpeechErr) {
        const hint = saveSpeechErr.message.includes('column')
          ? '（請在 Supabase 執行 20260601160000_course_quiz_question_speech_text.sql）'
          : '';
        return { error: `無法儲存問題語音：${saveSpeechErr.message}${hint}` };
      }
    }

    const questionSpeech = questionSpeechSource({
      question_speech_text: mergedSpeechText,
      question_text: question.question_text,
    });
    if (!questionSpeech) {
      return { error: '請填寫「問題語音」或「題目」文字後再產生語音' };
    }

    const rawOptions = Array.isArray(question.options)
      ? (question.options as string[])
      : [];
    const optionTexts = rawOptions.map((opt) => textForQuizSpeech(String(opt ?? '')));
    const storageClient = process.env.SUPABASE_SERVICE_ROLE_KEY
      ? await createAdminClient()
      : supabase;

    const questionMp3 = await synthesizeAzureSpeechMp3(questionSpeech);
    const questionUpload = await uploadCourseQuizAudioMp3(
      storageClient,
      courseId,
      questionId,
      'question.mp3',
      questionMp3,
    );
    if (!questionUpload.ok) {
      return {
        error: `${questionUpload.error}（若尚未執行 migration，請在 Supabase 套用 course_quiz_azure_speech.sql）`,
      };
    }

    const optionUrls: string[] = [];
    for (let i = 0; i < optionTexts.length; i += 1) {
      const speech = optionTexts[i];
      if (!speech) {
        optionUrls.push('');
        continue;
      }
      const mp3 = await synthesizeAzureSpeechMp3(speech);
      const uploaded = await uploadCourseQuizAudioMp3(
        storageClient,
        courseId,
        questionId,
        `option-${i}.mp3`,
        mp3,
      );
      if (!uploaded.ok) return { error: uploaded.error };
      optionUrls.push(uploaded.publicUrl);
    }

    const { error } = await supabase
      .from('course_quiz_questions')
      .update({
        question_audio_url: questionUpload.publicUrl,
        option_audio_urls: optionUrls as unknown as Json,
      } as never)
      .eq('id', questionId);

    if (error) {
      const hint = error.message.includes('column')
        ? '（請在 Supabase 執行 supabase/migrations/20260601150000_course_quiz_azure_speech.sql）'
        : '';
      return { error: `${error.message}${hint}` };
    }

    revalidatePath('/mentor/course-quizzes');
    revalidatePath(`/mentor/course-quizzes/${courseId}`);
    revalidatePath(`/learn/${courseId}`);

    return { success: '已產生題目與選項的 Azure 英文語音' };
  } catch (e) {
    return { error: e instanceof Error ? e.message : '語音產生失敗' };
  }
}
