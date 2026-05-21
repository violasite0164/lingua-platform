-- 首頁測驗區：自訂主標語與開始按鈕文字（null = 前端內建預設）

alter table public.homepage_config
  add column if not exists home_quiz_intro_text text,
  add column if not exists home_quiz_cta_text text;

comment on column public.homepage_config.home_quiz_intro_text is '首頁測驗 intro 主標語；空白或 null 沿用預設文案';
comment on column public.homepage_config.home_quiz_cta_text is '首頁測驗開始按鈕文字；空白或 null 沿用預設';
