  -- 單元影片定時互動（句字 / 四選一 / 輸入作答）

  create type public.lesson_cue_type as enum (
    'sentence',
    'multiple_choice',
    'text_input'
  );

  create table public.lesson_timed_cues (
    id              uuid                  primary key default gen_random_uuid(),
    lesson_id       uuid                  not null references public.lessons(id) on delete cascade,
    trigger_at_sec  integer               not null check (trigger_at_sec >= 0),
    cue_type        public.lesson_cue_type not null,
    payload         jsonb                 not null default '{}'::jsonb,
    sort_order      integer               not null default 0,
    is_enabled      boolean               not null default true,
    created_at      timestamptz           not null default now(),
    updated_at      timestamptz           not null default now()
  );

  create index idx_lesson_timed_cues_lesson_trigger
    on public.lesson_timed_cues (lesson_id, trigger_at_sec, sort_order);

  create trigger lesson_timed_cues_updated_at
    before update on public.lesson_timed_cues
    for each row execute procedure public.set_updated_at();

  alter table public.lesson_timed_cues enable row level security;

  create policy "lesson_timed_cues_teacher_all" on public.lesson_timed_cues
    for all using (
      public.is_teacher_or_admin() and
      exists (
        select 1 from public.lessons l
        join public.courses c on c.id = l.course_id
        where l.id = lesson_timed_cues.lesson_id
          and (c.teacher_id = auth.uid() or public.is_admin())
      )
    );

  create policy "lesson_timed_cues_select_student" on public.lesson_timed_cues
    for select using (
      is_enabled = true and
      exists (
        select 1 from public.lessons l
        where l.id = lesson_timed_cues.lesson_id
          and (l.is_preview = true or public.is_enrolled(l.course_id))
      )
    );
