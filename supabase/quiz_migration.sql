-- ============================================================
-- Quiz：user_quiz_scores + questions 讀取政策
-- 假設你已建立 questions 表，且至少包含下列欄位（名稱需一致）：
--   id              uuid primary key
--   difficulty      text  — 'elementary' | 'junior' | 'college' | 'professor'
--   question_text   text
--   options         jsonb — 四個選項字串之 JSON 陣列（與 text[] 擇一；前端皆视为 string[]）
--   correct_index   smallint — 0..3
--   explanation     text
-- 若你的欄位名不同，請同步修改 lib/quiz/actions.ts 內的 .select() 欄位。
-- ============================================================

-- ─── user_quiz_scores：依難度儲存歷史最高分（每使用者 × 難度一列）────────
create table if not exists public.user_quiz_scores (
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  difficulty  text        not null
    check (difficulty in ('elementary', 'junior', 'college', 'professor')),
  best_score  smallint    not null
    check (best_score >= 0 and best_score <= 100),
  updated_at  timestamptz not null default now(),
  primary key (user_id, difficulty)
);

comment on table public.user_quiz_scores is '英語測驗各難度歷史最高分（0–100，含答題速度）';

-- 若你先前已用舊版建立（0–10），請在 Supabase 執行下列調整：
-- alter table public.user_quiz_scores drop constraint if exists user_quiz_scores_best_score_check;
-- alter table public.user_quiz_scores add constraint user_quiz_scores_best_score_check
--   check (best_score >= 0 and best_score <= 100);

create index if not exists idx_user_quiz_scores_user on public.user_quiz_scores(user_id);

drop trigger if exists user_quiz_scores_updated_at on public.user_quiz_scores;
create trigger user_quiz_scores_updated_at
  before update on public.user_quiz_scores
  for each row execute procedure public.set_updated_at();

-- ─── RLS：user_quiz_scores ──────────────────────────────────
alter table public.user_quiz_scores enable row level security;

drop policy if exists "user_quiz_scores_select_own" on public.user_quiz_scores;
create policy "user_quiz_scores_select_own"
  on public.user_quiz_scores for select
  using (auth.uid() = user_id);

drop policy if exists "user_quiz_scores_insert_own" on public.user_quiz_scores;
create policy "user_quiz_scores_insert_own"
  on public.user_quiz_scores for insert
  with check (auth.uid() = user_id);

drop policy if exists "user_quiz_scores_update_own" on public.user_quiz_scores;
create policy "user_quiz_scores_update_own"
  on public.user_quiz_scores for update
  using (auth.uid() = user_id);

-- ─── RLS：questions（訪客也要能抽題）──────────────────────────
-- 若 questions 表尚未存在，請先建立題表後再執行以下段落。
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'questions'
  ) then
    execute 'alter table public.questions enable row level security';
    execute 'drop policy if exists "questions_select_public" on public.questions';
    execute $p$
      create policy "questions_select_public"
        on public.questions for select
        using (true)
    $p$;
  end if;
end $$;

-- ─── 範例：題庫表（你已自建題表則不必執行）──────────────────────
-- create table if not exists public.questions (
--   id uuid primary key default gen_random_uuid(),
--   difficulty text not null
--     check (difficulty in ('elementary', 'junior', 'college', 'professor')),
--   question_text text not null,
--   options text[] not null check (cardinality(options) = 4),
--   correct_index smallint not null check (correct_index between 0 and 3),
--   explanation text not null default '',
--   created_at timestamptz default now()
-- );
-- create index if not exists idx_questions_difficulty on public.questions(difficulty);
