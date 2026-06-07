-- 英語大冒險：依難度分開局／過關影片

alter table public.homepage_config
  add column if not exists quiz_elementary_start_video_url text,
  add column if not exists quiz_elementary_complete_video_url text,
  add column if not exists quiz_junior_start_video_url text,
  add column if not exists quiz_junior_complete_video_url text,
  add column if not exists quiz_college_start_video_url text,
  add column if not exists quiz_college_complete_video_url text,
  add column if not exists quiz_professor_start_video_url text,
  add column if not exists quiz_professor_complete_video_url text;

-- 舊版單一影片欄位 → 初級
update public.homepage_config
set
  quiz_elementary_start_video_url = coalesce(
    quiz_elementary_start_video_url,
    quiz_stage_start_video_url
  ),
  quiz_elementary_complete_video_url = coalesce(
    quiz_elementary_complete_video_url,
    quiz_stage_complete_video_url
  )
where id = 1;

comment on column public.homepage_config.quiz_elementary_start_video_url is '英語大冒險初級開局影片';
comment on column public.homepage_config.quiz_elementary_complete_video_url is '英語大冒險初級過關影片';
comment on column public.homepage_config.quiz_junior_start_video_url is '英語大冒險中級開局影片';
comment on column public.homepage_config.quiz_junior_complete_video_url is '英語大冒險中級過關影片';
comment on column public.homepage_config.quiz_college_start_video_url is '英語大冒險進階開局影片';
comment on column public.homepage_config.quiz_college_complete_video_url is '英語大冒險進階過關影片';
comment on column public.homepage_config.quiz_professor_start_video_url is '英語大冒險教授級開局影片';
comment on column public.homepage_config.quiz_professor_complete_video_url is '英語大冒險教授級過關影片';
