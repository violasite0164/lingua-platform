import { NextResponse } from 'next/server';

/**
 * @deprecated 整檔經由此 API 上傳在 Vercel 會因請求體約 4.5MB 上限而 413。
 * 請改用：瀏覽器直傳 Storage（/upload-session）+ /register。
 * 保留此路由僅回傳明確錯誤，避免舊版前端靜默失敗。
 */
export const runtime = 'nodejs';

export async function POST() {
  return NextResponse.json(
    {
      error:
        '此上傳接口已停用。請重新整理頁面（Ctrl+Shift+R）後再上傳；大檔會直傳 Supabase，不再經由此 API。',
    },
    { status: 410 },
  );
}
