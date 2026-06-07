-- Pop-up 文字：全螢幕（STAGE START 風格）或僅疊在影片區

create type public.course_quiz_overlay_scope as enum ('fullscreen', 'video');

alter table public.course_quiz_steps
  add column if not exists overlay_scope public.course_quiz_overlay_scope
  not null default 'fullscreen';

comment on column public.course_quiz_steps.overlay_scope is
  'fullscreen=全螢幕最上層 Pop-up；video=僅覆蓋該題影片區';

-- 既有「影片文字」維持疊在影片上，避免版面突然改變
update public.course_quiz_steps
set overlay_scope = 'video'::public.course_quiz_overlay_scope
where step_kind = 'video_text';
