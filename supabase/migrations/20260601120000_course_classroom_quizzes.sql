-- 課程課堂 Quiz：插在單元後或課程總測驗

create type public.course_quiz_placement as enum ('after_lesson', 'final_exam');

create table public.course_quizzes (
  id                          uuid primary key default gen_random_uuid(),
  course_id                   uuid not null references public.courses(id) on delete cascade,
  title                       text not null default '課堂測驗',
  placement                   public.course_quiz_placement not null default 'after_lesson',
  after_lesson_id             uuid references public.lessons(id) on delete set null,
  require_to_continue         boolean not null default true,
  require_to_complete_course  boolean not null default true,
  xp_reward                   integer not null default 300 check (xp_reward >= 0),
  is_published                boolean not null default false,
  sort_order                  integer not null default 0,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  constraint course_quizzes_after_lesson_chk check (
    placement = 'final_exam' or after_lesson_id is not null
  )
);

create index idx_course_quizzes_course on public.course_quizzes (course_id, sort_order);

create trigger course_quizzes_updated_at
  before update on public.course_quizzes
  for each row execute procedure public.set_updated_at();

create table public.course_quiz_questions (
  id              uuid primary key default gen_random_uuid(),
  quiz_id         uuid not null references public.course_quizzes(id) on delete cascade,
  sort_order      integer not null default 0,
  question_text   text not null,
  options         jsonb not null default '[]'::jsonb,
  correct_index   smallint not null default 0 check (correct_index >= 0 and correct_index <= 3),
  explanation     text,
  cf_video_uid    text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_course_quiz_questions_quiz on public.course_quiz_questions (quiz_id, sort_order);

create trigger course_quiz_questions_updated_at
  before update on public.course_quiz_questions
  for each row execute procedure public.set_updated_at();

create table public.user_course_quiz_progress (
  user_id       uuid not null references public.profiles(id) on delete cascade,
  quiz_id       uuid not null references public.course_quizzes(id) on delete cascade,
  completed     boolean not null default false,
  completed_at  timestamptz,
  xp_granted    boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  primary key (user_id, quiz_id)
);

create trigger user_course_quiz_progress_updated_at
  before update on public.user_course_quiz_progress
  for each row execute procedure public.set_updated_at();

-- XP 發放（與單元類似，防重複）
create or replace function public.grant_course_quiz_xp(p_user_id uuid, p_quiz_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_xp_reward integer;
  v_already   boolean;
  v_new_xp    integer;
  v_new_level integer;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    return;
  end if;

  select xp_granted into v_already
  from public.user_course_quiz_progress
  where user_id = p_user_id and quiz_id = p_quiz_id;

  if v_already then return; end if;

  select xp_reward into v_xp_reward from public.course_quizzes where id = p_quiz_id;
  if v_xp_reward is null or v_xp_reward <= 0 then return; end if;

  update public.user_course_quiz_progress set xp_granted = true
  where user_id = p_user_id and quiz_id = p_quiz_id;

  update public.profiles
  set exp = exp + v_xp_reward,
      total_xp_earned = total_xp_earned + v_xp_reward
  where id = p_user_id
  returning exp into v_new_xp;

  v_new_level := floor((1 + sqrt(1 + 8 * v_new_xp::float / 100)) / 2)::integer;
  v_new_level := greatest(v_new_level, 1);

  update public.profiles set level = v_new_level where id = p_user_id;
end;
$$;

-- RLS
alter table public.course_quizzes enable row level security;
alter table public.course_quiz_questions enable row level security;
alter table public.user_course_quiz_progress enable row level security;

create policy "course_quizzes_teacher_all" on public.course_quizzes
  for all using (
    public.is_teacher_or_admin() and exists (
      select 1 from public.courses c
      where c.id = course_quizzes.course_id
        and (c.teacher_id = auth.uid() or public.is_admin())
    )
  );

create policy "course_quizzes_select_student" on public.course_quizzes
  for select using (
    is_published = true and exists (
      select 1 from public.courses c
      where c.id = course_quizzes.course_id
        and (public.is_enrolled(c.id) or c.is_published)
    )
  );

create policy "course_quiz_questions_teacher_all" on public.course_quiz_questions
  for all using (
    public.is_teacher_or_admin() and exists (
      select 1 from public.course_quizzes q
      join public.courses c on c.id = q.course_id
      where q.id = course_quiz_questions.quiz_id
        and (c.teacher_id = auth.uid() or public.is_admin())
    )
  );

create policy "course_quiz_questions_select_student" on public.course_quiz_questions
  for select using (
    exists (
      select 1 from public.course_quizzes q
      join public.courses c on c.id = q.course_id
      where q.id = course_quiz_questions.quiz_id
        and q.is_published = true
        and (public.is_enrolled(c.id) or exists (
          select 1 from public.lessons l
          where l.course_id = c.id and l.is_preview = true
        ))
    )
  );

create policy "user_course_quiz_progress_own" on public.user_course_quiz_progress
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
