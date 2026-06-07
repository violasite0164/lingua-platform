-- 單字模式：卡片改為圖形；支援自訂 typeface 與每選項圖片
-- 相容：資料庫若從未建立 card、或已手動改為 shape，皆可重複執行

do $$
begin
  if not exists (
    select 1
    from pg_type t
    where t.typname = 'course_quiz_vocabulary_display'
      and t.typnamespace = (select oid from pg_namespace where nspname = 'public')
  ) then
    create type public.course_quiz_vocabulary_display as enum ('character', 'shape');
  elsif exists (
    select 1
    from pg_enum e
    join pg_type t on e.enumtypid = t.oid
    where t.typname = 'course_quiz_vocabulary_display'
      and e.enumlabel = 'card'
  ) then
    alter type public.course_quiz_vocabulary_display rename value 'card' to 'shape';
  elsif not exists (
    select 1
    from pg_enum e
    join pg_type t on e.enumtypid = t.oid
    where t.typname = 'course_quiz_vocabulary_display'
      and e.enumlabel = 'shape'
  ) then
    alter type public.course_quiz_vocabulary_display add value 'shape';
  end if;
end $$;

alter table public.course_quizzes
  add column if not exists vocabulary_display public.course_quiz_vocabulary_display
  not null default 'character';

alter table public.course_quizzes
  add column if not exists shape_typeface_url text;

comment on column public.course_quizzes.shape_typeface_url is
  '圖形模式：自訂 Three.js typeface JSON 公開 URL；留空則用內建圓／三角字型';

alter table public.course_quiz_questions
  add column if not exists option_image_urls jsonb not null default '[]'::jsonb,
  add column if not exists option_shape_glyphs jsonb not null default '[]'::jsonb;

comment on column public.course_quiz_questions.option_image_urls is
  '圖形模式：各選項掉落顯示圖片 URL（優先於立體圖形字元）';

comment on column public.course_quiz_questions.option_shape_glyphs is
  '圖形模式：各選項圖形字元（circle、triangle、auto 或單一字元）';

comment on column public.course_quizzes.vocabulary_display is
  '單字模式顯示：character=立體答案字元；shape=立體圖形或選項圖片';
