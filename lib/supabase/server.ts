/**
 * Server-side Supabase client
 * 在 Server Components、Route Handlers、Server Actions 使用
 * 透過 Next.js cookies() API 處理 session
 */
import { createServerClient, type SetAllCookies } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

type CookieList = Parameters<SetAllCookies>[0];

function createServerSupabase(
  supabaseKey: string,
  extra?: Parameters<typeof createServerClient>[2],
): SupabaseClient<Database> {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseKey,
    extra ?? {},
  ) as unknown as SupabaseClient<Database>;
}

export async function createClient(): Promise<SupabaseClient<Database>> {
  const cookieStore = await cookies();

  return createServerSupabase(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieList) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // setAll 在 Server Component 中呼叫時會失敗（只讀），可安全忽略
          // Middleware 會負責更新 session
        }
      },
    },
  });
}

/**
 * 使用 Service Role Key 的管理員 client
 * 只在受信任的 Server Actions / Route Handlers 使用，絕不暴露給前端
 */
export async function createAdminClient(): Promise<SupabaseClient<Database>> {
  /**
   * IMPORTANT:
   * Service Role key must be used as the *Authorization bearer* to bypass RLS.
   * If we attach the end-user session cookies here, Supabase will send the user's
   * access token as Authorization, and RLS will still apply (often resulting in
   * "0 rows affected" with no error).
   *
   * Therefore, the admin client intentionally does NOT read/write auth cookies.
   */
  return createServerSupabase(process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    cookies: {
      getAll() {
        return [];
      },
      setAll() {
        // no-op (admin client should not mutate session cookies)
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}
