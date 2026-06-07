/**
 * Supabase middleware helper
 *
 * 職責：
 * 1. 刷新即將到期的 session（Supabase SSR 必要步驟）
 * 2. 路由守衛 — 未登入使用者導向 /login
 * 3. 已登入使用者造訪 auth 頁面時導向 /dashboard
 * 4. 角色守衛 — admin / mentor 路由需要對應角色
 */
import { createServerClient, type SetAllCookies } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import type { UserRole } from '@/types/database.types';

type CookieList = Parameters<SetAllCookies>[0];

/** 同日只打一次 update_streak，避免每個請求都等 Supabase RPC */
const STREAK_COOKIE = 'lingua_streak_day';
const STREAK_RPC_TIMEOUT_MS = 4_000;
/** 遠端驗證逾時；過長會拖慢每個請求 */
const AUTH_GET_USER_TIMEOUT_MS = 5_000;

/** Supabase SSR 寫入的 session cookie（sb-*-auth-token 等） */
function hasSupabaseAuthCookies(request: NextRequest): boolean {
  return request.cookies.getAll().some((c) => c.name.startsWith('sb-'));
}

/**
 * 僅在需要守衛或可能需刷新 session 時才呼叫 auth API。
 * 公開頁且無 session cookie → 略過，避免每個請求都打 Supabase。
 */
function shouldValidateAuth(request: NextRequest, pathname: string): boolean {
  if (isProtected(pathname)) return true;
  if (isAuthOnlyPath(pathname)) return true;
  if (hasSupabaseAuthCookies(request)) return true;
  return false;
}

type MiddlewareUser = { id: string };

function todayUtcDateKey(): string {
  return new Date().toISOString().slice(0, 10);
}

async function withTimeout<T>(promise: PromiseLike<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve(promise),
      new Promise<T>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`${label} timed out after ${ms}ms`)),
          ms,
        );
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

// ─── Route configuration ────────────────────────────────────────────────────

/**
 * 需要登入才能訪問的路由前綴
 * startsWith 匹配，/courses 會同時覆蓋 /courses/[id] 等子路由
 *
 * 注意：勿用 `/quiz` 前綴 — 會誤匹配未來路徑如 `/quizzes`。
 * `/games`、`/quiz` 英語大冒險及其子路徑須登入。
 * 首頁訪客的「英語測驗」在 `/`，不在此範圍。
 */
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/courses',
  '/learn',
  '/profile',
  '/admin',
  '/mentor',
  '/commerce',
] as const;

/**
 * 已登入使用者不應再看到的 auth 頁面
 * 使用精確路徑匹配
 */
const AUTH_ONLY_PATHS = ['/login', '/register'] as const;

/**
 * 需要特定角色才能訪問的路由
 * 第一個匹配的規則生效
 */
const ROLE_PROTECTED: Array<{ prefix: string; roles: UserRole[] }> = [
  { prefix: '/admin',  roles: ['admin'] },
  { prefix: '/mentor', roles: ['mentor', 'admin'] },
  /** 商店商家後台（前台 /commerce 僅需登入，見 PROTECTED_PREFIXES） */
  { prefix: '/commerce/manage', roles: ['admin'] },
];

// ─── Helper functions ───────────────────────────────────────────────────────

/** 英語大冒險 `/quiz`（不含首頁 `/` 上的公開測驗） */
function isQuizAppRoute(pathname: string): boolean {
  return pathname === '/quiz' || pathname.startsWith('/quiz/');
}

/** 英語大冒險 */
function isGamesRoute(pathname: string): boolean {
  return pathname === '/games' || pathname.startsWith('/games/');
}

function isProtected(pathname: string): boolean {
  if (isGamesRoute(pathname)) return true;
  if (isQuizAppRoute(pathname)) return true;
  return PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isAuthOnlyPath(pathname: string): boolean {
  return (AUTH_ONLY_PATHS as readonly string[]).includes(pathname);
}

function requiredRoles(pathname: string): UserRole[] | null {
  const rule = ROLE_PROTECTED.find((r) => pathname.startsWith(r.prefix));
  return rule?.roles ?? null;
}

/** 從 profiles 表取得使用者角色（僅在需要角色驗證時呼叫，避免不必要的 DB 查詢） */
async function resolveMiddlewareUser(
  supabase: SupabaseClient<Database>,
): Promise<MiddlewareUser | null> {
  try {
    const { data, error } = await withTimeout(
      supabase.auth.getUser(),
      AUTH_GET_USER_TIMEOUT_MS,
      'auth.getUser',
    );
    if (error) throw error;
    return data.user;
  } catch (err) {
    console.warn('[middleware] auth.getUser failed, using getSession fallback:', err);
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user ?? null;
  }
}

async function getUserRole(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<UserRole | null> {
  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();
  return (data?.role as UserRole) ?? null;
}

// ─── Main middleware ─────────────────────────────────────────────────────────

export async function updateSession(request: NextRequest) {
  const url = request.nextUrl;

  if (!shouldValidateAuth(request, url.pathname)) {
    return NextResponse.next({ request });
  }

  // Supabase SSR 需要一個可修改 cookies 的 response 物件
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieList) {
          // 先更新 request cookies（讓後續 server component 讀到最新值）
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          // 再更新 response cookies（讓瀏覽器收到最新的 session）
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  ) as unknown as SupabaseClient<Database>;

  // ⚠️ getUser() 須在路由邏輯前呼叫（@supabase/ssr 刷新 session）
  const user = await resolveMiddlewareUser(supabase);

  // 已登入：每日至多一次 streak RPC（cookie 節流 + 逾時，不阻塞頁面）
  if (user) {
    const today = todayUtcDateKey();
    if (request.cookies.get(STREAK_COOKIE)?.value !== today) {
      try {
        const streakResult = await withTimeout(
          supabase.rpc('update_streak', { p_user_id: user.id }),
          STREAK_RPC_TIMEOUT_MS,
          'update_streak',
        );
        const streakErr = (streakResult as { error: { message: string } | null }).error;
        if (streakErr) {
          console.error('[middleware] update_streak failed:', streakErr.message);
        } else {
          supabaseResponse.cookies.set(STREAK_COOKIE, today, {
            httpOnly: true,
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 26,
          });
        }
      } catch (err) {
        console.error('[middleware] update_streak skipped:', err);
      }
    }
  }

  // ── 1. 未登入 → 存取保護路由 ──────────────────────────────────
  if (!user && isProtected(url.pathname)) {
    const redirectUrl = url.clone();
    redirectUrl.pathname = '/login';
    // 保存原始路徑，登入後可跳回
    redirectUrl.searchParams.set('redirect', url.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // ── 2. 已登入 → 存取 auth 頁面（login / register）───────────
  if (user && isAuthOnlyPath(url.pathname)) {
    const redirectUrl = url.clone();
    redirectUrl.pathname = '/dashboard';
    redirectUrl.search = '';
    return NextResponse.redirect(redirectUrl);
  }

  // ── 3. 角色守衛（僅在需要時才查詢 DB）────────────────────────
  if (user) {
    const roles = requiredRoles(url.pathname);

    if (roles !== null) {
      const userRole = await getUserRole(supabase, user.id);

      if (!userRole || !roles.includes(userRole)) {
        // 角色不足：導向 dashboard 而非 403，避免資訊洩漏
        const redirectUrl = url.clone();
        redirectUrl.pathname = '/dashboard';
        redirectUrl.search = '';
        return NextResponse.redirect(redirectUrl);
      }
    }
  }

  // ── 4. 通過所有檢查，繼續請求 ─────────────────────────────────
  return supabaseResponse;
}
