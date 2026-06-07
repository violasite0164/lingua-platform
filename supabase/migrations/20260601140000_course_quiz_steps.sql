-- 測驗流程：影片文字疊加與題目可混合排序

create type public.course_quiz_step_kind as enum ('video_text', 'question');

create table public.course_quiz_steps (
  id              uuid primary key default gen_random_uuid(),
  quiz_id         uuid not null references public.course_quizzes(id) on delete cascade,
  sort_order      integer not null default 0,
  step_kind       public.course_quiz_step_kind not null,
  question_id     uuid references public.course_quiz_questions(id) on delete cascade,
  text_content    text,
  font_family     text not null default 'fredoka',
  font_size_px    integer not null default 32 check (font_size_px >= 12 and font_size_px <= 120),
  text_color      text not null default '#ffffff',
  text_align      text not null default 'center' check (text_align in ('left', 'center', 'right')),
  text_animation  text not null default 'fade' check (
    text_animation in ('none', 'fade', 'slide-up', 'slide-left', 'pop', 'typewriter')
  ),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint course_quiz_steps_question_chk check (
    (step_kind = 'question' and question_id is not null and text_content is null)
    or (step_kind = 'video_text' and question_id is null and text_content is not null and length(trim(text_content)) > 0)
  )
);

create index idx_course_quiz_steps_quiz_order
  on public.course_quiz_steps (quiz_id, sort_order);

create trigger course_quiz_steps_updated_at
  before update on public.course_quiz_steps
  for each row execute procedure public.set_updated_at();

-- 既有題目 → 流程步驟
insert into public.course_quiz_steps (quiz_id, sort_order, step_kind, question_id)
select quiz_id, sort_order, 'question'::public.course_quiz_step_kind, id
from public.course_quiz_questions
where not exists (
  select 1 from public.course_quiz_steps s
  where s.question_id = course_quiz_questions.id
);

alter table public.course_quiz_steps enable row level security;

create policy "course_quiz_steps_teacher_all" on public.course_quiz_steps
  for all using (
    public.is_teacher_or_admin() and exists (
      select 1 from public.course_quizzes q
      join public.courses c on c.id = q.course_id
      where q.id = course_quiz_steps.quiz_id
        and (c.teacher_id = auth.uid() or public.is_admin())
    )
  );

create policy "course_quiz_steps_select_student" on public.course_quiz_steps
  for select using (
    exists (
      select 1 from public.course_quizzes q
      where q.id = course_quiz_steps.quiz_id
        and q.is_published = true
        and public.is_enrolled(q.course_id)
    )
  );
