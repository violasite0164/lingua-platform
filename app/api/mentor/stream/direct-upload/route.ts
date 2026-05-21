import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { canAccessMentorDashboard } from '@/lib/mentor/auth';

/**
 * 建立 Cloudflare Stream Direct Creator Upload session。
 * 回傳 uid + uploadURL，前端再以 multipart POST 將影片檔傳至 uploadURL。
 */
export async function POST() {
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

  if (!profile || !canAccessMentorDashboard(profile.role as string)) {
    return NextResponse.json({ error: '需要導師權限' }, { status: 403 });
  }

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_STREAM_API_TOKEN;

  if (!accountId || !token) {
    return NextResponse.json(
      { error: '伺服器尚未設定 CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_STREAM_API_TOKEN' },
      { status: 503 },
    );
  }

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/direct_upload`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        maxDurationSeconds: 7200,
        meta: { uploadedBy: user.id },
      }),
    },
  );

  const json = (await res.json()) as {
    success?: boolean;
    result?: { uid: string; uploadURL: string };
    errors?: { message: string }[];
  };

  if (!json.success || !json.result?.uploadURL || !json.result?.uid) {
    const msg = json.errors?.[0]?.message ?? 'Cloudflare Stream API 失敗';
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  return NextResponse.json({
    uid: json.result.uid,
    uploadURL: json.result.uploadURL,
  });
}
