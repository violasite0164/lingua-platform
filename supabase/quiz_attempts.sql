-- ============================================================
-- AI英語鬥：每局紀錄 + 排行榜用彙總 View
-- 執行順序：須在 profiles、questions 存在後執行
-- ============================================================

-- ─── 每局測驗紀錄（登入結算時寫入）──────────────────────────
create table if not exists public.quiz_attempts (
  id                    uuid            primary key default gen_random_uuid(),
  user_id               uuid            not null references public.profiles(id) on delete cascade,
  difficulty            text            not null
    check (difficulty in ('elementary', 'junior', 'college', 'professor')),
  score100              smallint        not null
    check (score100 >= 0 and score100 <= 100),
  total_questions       smallint        not null
    check (total_questions >= 1 and total_questions <= 50),
  correct_count         smallint        not null,
  total_answer_seconds  double precision not null
    check (total_answer_seconds >= 0),
  created_at            timestamptz     not null default now(),
  check (correct_count >= 0 and correct_count <= total_questions)
);

comment on table public.quiz_attempts is 'AI英語鬥每局成績（供排行榜：平均得分、滿分次數、平均每局作答時間等）';

create index if not exists idx_quiz_attempts_user on public.quiz_attempts(user_id);
create index if not exists idx_quiz_attempts_diff on public.quiz_attempts(difficulty);
create index if not exists idx_quiz_attempts_created on public.quiz_attempts(created_at desc);

alter table public.quiz_attempts enable row level security;

drop policy if exists "quiz_attempts_insert_own" on public.quiz_attempts;
create policy "quiz_attempts_insert_own"
  on public.quiz_attempts for insert
  with check (auth.uid() = user_id);

-- 公開閱讀（僅供排行榜彙總；勿在前端直接列出原始每局敏感細節若需再加限制）
drop policy if exists "quiz_attempts_select_public" on public.quiz_attempts;
create policy "quiz_attempts_select_public"
  on public.quiz_attempts for select
  using (true);

-- ─── 依使用者 × 難度彙總（排行榜排序用）────────────────────
create or replace view public.quiz_user_stats as
select
  qa.user_id,
  qa.difficulty,
  count(*)::integer as games_played,
  round(avg(qa.score100)::numeric, 2) as avg_score,
  count(*) filter (where qa.score100 = 100)::integer as perfect_count,
  sum(qa.total_answer_seconds)::double precision as total_answer_seconds
from public.quiz_attempts qa
group by qa.user_id, qa.difficulty;

comment on view public.quiz_user_stats is 'AI英語鬥：各難度每人平均得分、滿分次數、作答秒數（用於推導平均每局作答時間）、場次（排行榜排序規則見應用程式：滿分場次優先，同場次則時間60%+得分40%）';

-- View 使用 underlying table 的 RLS；quiz_attempts 已允許 select
