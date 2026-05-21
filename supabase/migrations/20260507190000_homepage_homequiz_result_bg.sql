-，- HomeQuiz：結果畫面背景圖（僅首頁公開測驗的 result phase）

alter table public.homepage_config
  add column if not exists home_quiz_result_background_image_url text;

comment on column public.homepage_config.home_quiz_result_background_image_url
  is '首頁 HomeQuiz 結果畫面背景圖 URL（http(s)）；null/空白 = 不套用（沿用原本背景）';

