-- 若 20260604120000 曾因缺少 card 標籤失敗，可單獨執行本檔（冪等）

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
