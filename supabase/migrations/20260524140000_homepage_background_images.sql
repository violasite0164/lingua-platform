-- 首頁背景圖：最多 5 張，每次載入隨機顯示一張

alter table public.homepage_config
  add column if not exists background_image_urls jsonb not null default '[]'::jsonb;

comment on column public.homepage_config.background_image_urls is
  '首頁背景圖 URL 陣列（最多 5 張）；每次造訪隨機選一張顯示';

-- 將既有單張 background_image_url 遷移至陣列
update public.homepage_config
set background_image_urls = jsonb_build_array(background_image_url)
where id = 1
  and background_image_url is not null
  and trim(background_image_url) <> ''
  and (background_image_urls = '[]'::jsonb or background_image_urls is null);
