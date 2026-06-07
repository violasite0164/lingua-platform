import { NextResponse } from 'next/server';

import { canAccessMentorDashboard } from '@/lib/mentor/auth';
import { uploadCourseQuizOptionImageCore } from '@/lib/mentor/course-quiz-option-image-upload';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: '未登入' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || !canAccessMentorDashboard(profile.role)) {
    return NextResponse.json({ error: '需要導師權限' }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: '無法讀取上傳內容' }, { status: 400 });
  }

  const questionId = String(formData.get('questionId') ?? '').trim();
  const optionIndex = Number.parseInt(String(formData.get('optionIndex') ?? ''), 10);
  const file = formData.get('file');

  if (!questionId) {
    return NextResponse.json({ error: '缺少 questionId' }, { status: 400 });
  }
  if (!Number.isInteger(optionIndex)) {
    return NextResponse.json({ error: '選項索引無效' }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: '請選擇圖片檔案' }, { status: 400 });
  }

  const result = await uploadCourseQuizOptionImageCore({
    questionId,
    optionIndex,
    file,
    mentorId: user.id,
    isAdmin: profile.role === 'admin',
  });

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const { data: question } = await supabase
    .from('course_quiz_questions')
    .select('quiz_id')
    .eq('id', questionId)
    .maybeSingle();

  if (question?.quiz_id) {
    const { data: quiz } = await supabase
      .from('course_quizzes')
      .select('course_id')
      .eq('id', question.quiz_id)
      .maybeSingle();
    if (quiz?.course_id) {
      revalidatePath('/mentor/course-quizzes');
      revalidatePath(`/mentor/course-quizzes/${quiz.course_id}`);
      revalidatePath(`/learn/${quiz.course_id}`);
    }
  }

  return NextResponse.json(result);
}
