-- 學員即時互動（選擇題／文字輸入）作答紀錄

create table public.lesson_cue_answers (
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  lesson_id   uuid        not null references public.lessons(id) on delete cascade,
  cue_id      uuid        not null references public.lesson_timed_cues(id) on delete cascade,
  answered_at timestamptz not null default now(),

  primary key (user_id, cue_id)
);

create index idx_lesson_cue_answers_lesson
  on public.lesson_cue_answers (user_id, lesson_id);

alter table public.lesson_cue_answers enable row level security;

create policy "lesson_cue_answers_select_own" on public.lesson_cue_answers
  for select using (user_id = auth.uid());

create policy "lesson_cue_answers_insert_own" on public.lesson_cue_answers
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.lesson_timed_cues c
      join public.lessons l on l.id = c.lesson_id
      where c.id = lesson_cue_answers.cue_id
        and c.lesson_id = lesson_cue_answers.lesson_id
        and c.is_enabled = true
        and c.cue_type in ('multiple_choice', 'text_input')
        and (l.is_preview = true or public.is_enrolled(l.course_id))
    )
  );

create policy "lesson_cue_answers_delete_own" on public.lesson_cue_answers
  for delete using (user_id = auth.uid());
