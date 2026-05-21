-- 首頁設定：背景圖／影片開關、標題區字色（明暗主題分開）

alter table public.homepage_config
  add column if not exists background_image_enabled boolean not null default true,
  add column if not exists background_video_enabled boolean not null default true,
  add column if not exists heading_text_color_light text,
  add column if not exists heading_text_color_dark text;

comment on column public.homepage_config.background_image_enabled is '是否顯示背景圖（仍保留 URL）';
comment on column public.homepage_config.background_video_enabled is '是否顯示背景影片（仍保留 URL）';
comment on column public.homepage_config.heading_text_color_light is '首頁測驗標題／標語字色（亮色主題），#RRGGBB，null 沿用預設';
comment on column public.homepage_config.heading_text_color_dark is '首頁測驗標題／標語字色（暗黑主題），#RRGGBB，null 沿用預設';
