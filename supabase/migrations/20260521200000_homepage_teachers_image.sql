-- 首頁「AI × 線上課程」區塊插圖

alter table public.homepage_config
  add column if not exists home_teachers_section_image_url text;

comment on column public.homepage_config.home_teachers_section_image_url is '首頁 AI×線上課程區塊圖片（HTTPS 或 Storage）；留空則顯示內建三張說明卡';
