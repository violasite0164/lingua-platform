import { NextResponse } from 'next/server';

import { canAccessMentorDashboard } from '@/lib/mentor/auth';
import {
  assertLessonOwner,
  getLessonCourseId,
  registerLessonTextbook,
  type RegisterLessonTextbookInput,
} from '@/lib/mentor/textbook-upload-core';
import { createClient } from '@/lib/supabase/server';
import type { Profile } from '@/types/database.types';

export const runtime = 'nodejs';

async function requireMentorProfile(): Promise<Profile | NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: '未登入' }, { status: 401 });
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (error || !profile || !canAccessMentorDashboard(profile.role)) {
    return NextResponse.json({ error: '需要導師權限' }, { status: 403 });
  }

  return profile as Profile;
}

export async function POST(request: Request) {
  const profile = await requireMentorProfile();
  if (profile instanceof NextResponse) return profile;

  let body: RegisterLessonTextbookInput;
  try {
    body = (await request.json()) as RegisterLessonTextbookInput;
  } catch {
    return NextResponse.json({ error: '無效的請求內容' }, { status: 400 });
  }

  const lessonId = String(body.lessonId ?? '').trim();
  if (!lessonId || !body.path || !body.publicUrl || !body.fileName) {
    return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 });
  }

  try {
    await assertLessonOwner(lessonId, profile);
    const courseId = await getLessonCourseId(lessonId);
    const supabase = await createClient();
    const result = await registerLessonTextbook(supabase, courseId, {
      lessonId,
      title: String(body.title ?? body.fileName).trim() || body.fileName,
      path: body.path,
      publicUrl: body.publicUrl,
      fileName: body.fileName,
      mimeType: body.mimeType || 'application/octet-stream',
      fileSizeBytes: Number(body.fileSizeBytes) || 0,
      pageStart: body.pageStart ?? null,
      pageEnd: body.pageEnd ?? null,
      sourcePageCount: body.sourcePageCount ?? null,
    });

    if (result.error) {
      return NextResponse.json(result, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : '登記失敗';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
