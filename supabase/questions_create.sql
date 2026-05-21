-- ============================================================
-- 英語測驗題庫表（若已有同名表可略過）
-- 匯入題目：在 Supabase SQL Editor 執行 `questions_seed_300.sql`
-- 追加題庫：可再執行 `questions_seed_300_batch2.sql`、`questions_seed_300_batch3.sql`、`questions_seed_300_batch4.sql`，或一次 `questions_seed_600.sql`（batch3+batch4）
-- ============================================================

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  difficulty text not null
    check (difficulty in ('elementary', 'junior', 'college', 'professor')),
  question_text text not null,
  options jsonb not null
    check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) = 4),
  -- 舊版／相容：與 correct_index 對應之 A–D
  correct_answer_old text not null
    check (correct_answer_old in ('A', 'B', 'C', 'D')),
  correct_index smallint not null check (correct_index between 0 and 3),
  explanation text not null default '',
  created_at timestamptz default now()
);

create index if not exists idx_questions_difficulty on public.questions(difficulty);

comment on table public.questions is '英語測驗題庫（四選一）';
