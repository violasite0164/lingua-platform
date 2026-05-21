import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  try {
    return await updateSession(request);
  } catch (err) {
    // Edge Runtime fetch failures (e.g. network hiccup, cold start).
    // Allow the request through — pages will do their own auth checks.
    console.error('[middleware] updateSession failed:', err);
    return NextResponse.next({ request });
  }
}

export const config = {
  matcher: [
    /*
     * 匹配所有路徑，排除靜態資源：
     * - _next/static / _next/image
     * - favicon.ico
     * - public 資料夾的圖片、字型等靜態檔案
     *
     * 必須覆蓋所有頁面路由，updateSession 才能正確刷新 cookie
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?)$).*)',
  ],
};
