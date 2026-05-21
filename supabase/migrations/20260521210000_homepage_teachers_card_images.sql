-- 首頁「AI × 線上課程」三張說明卡各自插圖

alter table public.homepage_config
  add column if not exists home_teachers_card_1_image_url text,
  add column if not exists home_teachers_card_2_image_url text,
  add column if not exists home_teachers_card_3_image_url text;

-- 舊版單一區塊圖遷移至第一張卡
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'homepage_config'
      and column_name = 'home_teachers_section_image_url'
  ) then
    update public.homepage_config
    set home_teachers_card_1_image_url = coalesce(
      home_teachers_card_1_image_url,
      home_teachers_section_image_url
    )
    where id = 1;

    alter table public.homepage_config
      drop column home_teachers_section_image_url;
  end if;
end $$;

comment on column public.homepage_config.home_teachers_card_1_image_url is '首頁 AI×線上課程說明卡 1 插圖（線上影片課程）';
comment on column public.homepage_config.home_teachers_card_2_image_url is '首頁 AI×線上課程說明卡 2 插圖（AI 英語快測）';
comment on column public.homepage_config.home_teachers_card_3_image_url is '首頁 AI×線上課程說明卡 3 插圖（AI 英語鬥）';
