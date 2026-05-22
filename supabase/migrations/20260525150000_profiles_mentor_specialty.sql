-- 導師／管理員可設定公開的導師類型與介紹（課程頁講師介紹區塊）

create type public.mentor_specialty as enum (
  'activity',
  'science',
  'language',
  'other',
  'technical'
);

alter table public.profiles
  add column if not exists mentor_specialty public.mentor_specialty;

comment on column public.profiles.mentor_specialty is '導師公開類型：活動／理科／語言／其他／技術人員';
comment on column public.profiles.bio is '講師公開介紹，顯示於課程頁講師介紹';
