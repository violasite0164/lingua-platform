-- 英語大冒險：小編風格偏好（毒舌／溫柔治癒）

create type public.quiz_editor_personality as enum ('toxic', 'gentle');

alter table public.profiles
  add column if not exists quiz_editor_personality public.quiz_editor_personality;

comment on column public.profiles.quiz_editor_personality is '英語大冒險小編風格：toxic=毒舌，gentle=溫柔治癒；null=尚未選擇';
