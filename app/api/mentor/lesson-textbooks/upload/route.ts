import { NextResponse } from 'next/server';

import { canAccessMentorDashboard } from '@/lib/mentor/auth';
import { uploadLessonTextbookFromFormData } from '@/lib/mentor/textbook-upload-core';
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

/**
 * 課本檔案上傳（multipart）。避開 Server Action 大檔 multipart 解析問題。
 */
export async function POST(request: Request) {
  const profile = await requireMentorProfile();
  if (profile instanceof NextResponse) return profile;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (err) {
    const message = err instanceof Error ? err.message : '無法讀取上傳內容';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const lessonId = String(formData.get('lesson_id') ?? '').trim();
  if (!lessonId) {
    return NextResponse.json({ error: '缺少 lesson_id' }, { status: 400 });
  }

  const result = await uploadLessonTextbookFromFormData(lessonId, formData, profile);
  if (result.error) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json(result);
}
