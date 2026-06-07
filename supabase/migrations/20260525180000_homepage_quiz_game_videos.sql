-- 英語大冒險：開局／過關影片（存於 homepage_config 單列，公開讀）

alter table public.homepage_config
  add column if not exists quiz_stage_start_video_url text,
  add column if not exists quiz_stage_complete_video_url text;

comment on column public.homepage_config.quiz_stage_start_video_url is
  '英語大冒險每局開始前播放的影片 URL（Supabase Storage 公開連結）';
comment on column public.homepage_config.quiz_stage_complete_video_url is
  '英語大冒險成功過關後、測驗完成畫面前播放的影片 URL';
