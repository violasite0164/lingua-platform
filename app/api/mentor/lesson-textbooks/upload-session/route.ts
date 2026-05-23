import { NextResponse } from 'next/server';

import { canAccessMentorDashboard } from '@/lib/mentor/auth';
import { validateTextbookMime } from '@/lib/mentor/textbook-mime';
import {
  assertLessonOwner,
  getLessonCourseId,
} from '@/lib/mentor/textbook-upload-core';
import {
  buildLessonTextbookStoragePath,
  LESSON_TEXTBOOK_BUCKET,
  MAX_LESSON_TEXTBOOK_BYTES,
} from '@/lib/mentor/textbook-storage';
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

  let body: {
    lessonId?: string;
    fileName?: string;
    mimeType?: string;
    fileSizeBytes?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '無效的請求內容' }, { status: 400 });
  }

  const lessonId = String(body.lessonId ?? '').trim();
  const fileName = String(body.fileName ?? '').trim();
  const mimeType = String(body.mimeType ?? '').trim();
  const fileSizeBytes = Number(body.fileSizeBytes) || 0;

  if (!lessonId || !fileName) {
    return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 });
  }
  if (fileSizeBytes <= 0 || fileSizeBytes > MAX_LESSON_TEXTBOOK_BYTES) {
    return NextResponse.json({ error: '檔案請勿超過 50 MiB' }, { status: 400 });
  }

  const mimeErr = validateTextbookMime(mimeType);
  if (mimeErr) {
    return NextResponse.json({ error: mimeErr }, { status: 400 });
  }

  try {
    await assertLessonOwner(lessonId, profile);
    const courseId = await getLessonCourseId(lessonId);
    const supabase = await createClient();
    const path = buildLessonTextbookStoragePath(courseId, lessonId, fileName);

    const { data, error } = await supabase.storage
      .from(LESSON_TEXTBOOK_BUCKET)
      .createSignedUploadUrl(path, { upsert: false });

    if (error || !data) {
      console.error('[upload-session] createSignedUploadUrl', error?.message);
      return NextResponse.json(
        { error: error?.message ?? '無法建立上傳連線' },
        { status: 400 },
      );
    }

    const { data: urlData } = supabase.storage.from(LESSON_TEXTBOOK_BUCKET).getPublicUrl(path);

    return NextResponse.json({
      path: data.path,
      token: data.token,
      publicUrl: urlData.publicUrl,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '無法建立上傳';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
