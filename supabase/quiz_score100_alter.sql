-- 既有資料庫若仍為 best_score 0–10，請執行此檔升級為 0–100（與新版計分一致）
alter table public.user_quiz_scores drop constraint if exists user_quiz_scores_best_score_check;
alter table public.user_quiz_scores add constraint user_quiz_scores_best_score_check
  check (best_score >= 0 and best_score <= 100);

comment on table public.user_quiz_scores is '英語測驗各難度歷史最高分（0–100，含答題速度）';
