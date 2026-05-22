/**
 * Browser-side Supabase client
 * 在 Client Components 使用，透過 @supabase/ssr 自動處理 cookie
 *
 * - @supabase/ssr 在瀏覽器預設 singleton（isSingleton）
 * - auth.lock 使用 processLock 而非 navigatorLock：避免 React Strict Mode
 *   與多處並發 getSession/getUser 時 Web Locks 互相搶奪（AbortError: Lock was stolen）
 */
import { processLock } from '@supabase/auth-js';
import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

/**
 * 手寫 `Database` 若未完全符合 postgrest-js 的 `GenericSchema` 推斷，
 * `createBrowserClient<Database>()` 會把 schema 收成 `never`，導致 `.insert()` 等全變 `never`。
 * 改以回傳型別斷言為 `SupabaseClient<Database>`，仍以 `Database` 驅動表／欄位提示。
 */
export function createClient(): SupabaseClient<Database> {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      isSingleton: true,
      auth: {
        lock: processLock,
      },
    },
  ) as unknown as SupabaseClient<Database>;
}
