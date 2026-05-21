-- 單元完成預設經驗值：10 → 300（僅影響「新插入」列的預設；既有資料列不變）
alter table public.lessons
  alter column xp_reward set default 300;

-- 選用：若要把過去用舊預設建立的單元（xp_reward = 10）一次改成 300，取消下行註解後執行：
-- update public.lessons set xp_reward = 300 where xp_reward = 10;
