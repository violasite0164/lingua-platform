-- 賣點區學生插圖 URL、行銷主題配色預設

alter table public.homepage_config
  add column if not exists features_student_image_url text,
  add column if not exists marketing_theme_preset text not null default 'yellow_blue';

alter table public.homepage_config
  drop constraint if exists homepage_config_marketing_theme_preset_check;

alter table public.homepage_config
  add constraint homepage_config_marketing_theme_preset_check
  check (
    marketing_theme_preset in (
      'yellow_blue',
      'green_purple',
      'lemongrass',
      'pink_sky',
      'kids_classic'
    )
  );

comment on column public.homepage_config.features_student_image_url is '首頁賣點區右側插圖（HTTPS 或 Storage）；留空則不顯示';
comment on column public.homepage_config.marketing_theme_preset is '全站主色與 CTA 配色預設：yellow_blue | green_purple | lemongrass | pink_sky | kids_classic';
