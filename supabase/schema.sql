-- ============================================================
-- Lingua Platform — Supabase PostgreSQL Schema
-- 貼到 Supabase Dashboard > SQL Editor 執行
-- ============================================================

-- ─── Extensions ───────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── Custom Types (Enums) ─────────────────────────────────
create type public.user_role         as enum ('student', 'mentor', 'admin');
create type public.assignment_type   as enum ('text', 'audio', 'video', 'image', 'pdf');
create type public.assignment_status as enum ('submitted', 'grading', 'graded', 'returned');
create type public.course_level      as enum ('beginner', 'intermediate', 'advanced');
create type public.mentor_specialty  as enum ('activity', 'science', 'language', 'other', 'technical');
create type public.quiz_editor_personality as enum ('toxic', 'gentle');

-- ─── PROFILES ─────────────────────────────────────────────
-- 擴充 auth.users，每個用戶在此都有一筆記錄
create table public.profiles (
  id              uuid        primary key references auth.users(id) on delete cascade,
  role            user_role   not null default 'student',
  display_name    text        not null default '',
  avatar_url      text,
  bio             text,
  mentor_specialty mentor_specialty,
  quiz_editor_personality quiz_editor_personality,

  -- 遊戲化欄位
  exp             integer     not null default 0 check (exp >= 0),
  level           integer     not null default 1 check (level >= 1),
  streak_days     integer     not null default 0 check (streak_days >= 0),
  last_active_at  date,
  total_xp_earned integer     not null default 0,

  -- 付款
  stripe_customer_id text unique,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.profiles is '對應 auth.users 的使用者資料，包含角色與遊戲化數據';

-- ─── CATEGORIES ───────────────────────────────────────────
create table public.categories (
  id         serial      primary key,
  name       text        not null unique,
  slug       text        not null unique,
  created_at timestamptz not null default now()
);

insert into public.categories (name, slug) values
  ('英語', 'english'),
  ('日語', 'japanese'),
  ('韓語', 'korean'),
  ('普通話', 'mandarin'),
  ('粵語', 'cantonese'),
  ('法語', 'french'),
  ('西班牙語', 'spanish');

-- ─── COURSES ──────────────────────────────────────────────
create table public.courses (
  id            uuid          primary key default uuid_generate_v4(),
  teacher_id    uuid          not null references public.profiles(id) on delete restrict,
  category_id   integer       references public.categories(id) on delete set null,

  title         text          not null,
  description   text,
  thumbnail_url text,
  level         course_level  not null default 'beginner',

  price         numeric(10,2) not null default 0 check (price >= 0),
  is_free       boolean       not null default false,
  is_published  boolean       not null default false,

  -- 統計（由 trigger 維護）
  lesson_count  integer       not null default 0,
  student_count integer       not null default 0,

  created_at    timestamptz   not null default now(),
  updated_at    timestamptz   not null default now()
);

-- ─── LESSONS ──────────────────────────────────────────────
create table public.lessons (
  id               uuid        primary key default uuid_generate_v4(),
  course_id        uuid        not null references public.courses(id) on delete cascade,

  title            text        not null,
  description      text,
  sort_order       integer     not null default 0,

  -- Cloudflare Stream
  cf_video_uid     text,               -- Stream 影片 UID
  cf_thumbnail_url text,
  duration_sec     integer     not null default 0,

  -- 學習設定
  is_preview       boolean     not null default false,
  xp_reward        integer     not null default 300 check (xp_reward >= 0),

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ─── ENROLLMENTS ──────────────────────────────────────────
create table public.enrollments (
  id                uuid        primary key default uuid_generate_v4(),
  user_id           uuid        not null references public.profiles(id) on delete cascade,
  course_id         uuid        not null references public.courses(id) on delete cascade,

  stripe_payment_id text,
  enrolled_at       timestamptz not null default now(),
  expires_at        timestamptz,               -- null = 永久

  unique (user_id, course_id)
);

-- ─── USER_PROGRESS ────────────────────────────────────────
create table public.user_progress (
  id               uuid        primary key default uuid_generate_v4(),
  user_id          uuid        not null references public.profiles(id) on delete cascade,
  lesson_id        uuid        not null references public.lessons(id) on delete cascade,

  -- 影片觀看狀態
  watched_seconds  integer     not null default 0,
  completed        boolean     not null default false,
  completed_at     timestamptz,

  -- XP 是否已發放
  xp_granted       boolean     not null default false,

  last_watched_at  timestamptz not null default now(),

  unique (user_id, lesson_id)
);

-- ─── ASSIGNMENTS ──────────────────────────────────────────
create table public.assignments (
  id           uuid              primary key default uuid_generate_v4(),
  lesson_id    uuid              not null references public.lessons(id) on delete cascade,
  student_id   uuid              not null references public.profiles(id) on delete cascade,

  -- 作業內容
  type         assignment_type   not null,
  status       assignment_status not null default 'submitted',
  text_content text,                -- type = text
  file_url     text,                -- Storage 路徑 (audio/video/image/pdf)
  file_name    text,
  file_size    bigint,
  file_mime    text,

  -- 批改
  grade        smallint          check (grade >= 0 and grade <= 100),
  feedback     text,
  graded_by    uuid              references public.profiles(id) on delete set null,
  graded_at    timestamptz,
  xp_awarded   integer           not null default 0,

  submitted_at timestamptz       not null default now(),
  updated_at   timestamptz       not null default now()
);

-- ─── BADGES ───────────────────────────────────────────────
create table public.badges (
  id          uuid        primary key default uuid_generate_v4(),
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  badge_key   text        not null,   -- 'first_lesson', 'streak_7', 'level_10', ...
  awarded_at  timestamptz not null default now(),

  unique (user_id, badge_key)
);

-- ─── COMMENTS ─────────────────────────────────────────────
create table public.comments (
  id          uuid        primary key default uuid_generate_v4(),
  lesson_id   uuid        not null references public.lessons(id) on delete cascade,
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  parent_id   uuid        references public.comments(id) on delete cascade,
  content     text        not null,
  created_at  timestamptz not null default now()
);

-- ================================================================
-- FUNCTIONS & TRIGGERS
-- ================================================================

-- 1. 新用戶自動建立 profile
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    'student'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. 自動更新 updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at   before update on public.profiles   for each row execute procedure public.set_updated_at();
create trigger courses_updated_at    before update on public.courses    for each row execute procedure public.set_updated_at();
create trigger lessons_updated_at    before update on public.lessons    for each row execute procedure public.set_updated_at();
create trigger assignments_updated_at before update on public.assignments for each row execute procedure public.set_updated_at();

-- 3. 維護 courses.lesson_count
create or replace function public.update_lesson_count()
returns trigger language plpgsql as $$
declare
  v_course_id uuid := coalesce(new.course_id, old.course_id);
begin
  update public.courses
  set lesson_count = (select count(*) from public.lessons where course_id = v_course_id)
  where id = v_course_id;
  return null;
end;
$$;

create trigger lessons_count_trigger
  after insert or delete on public.lessons
  for each row execute procedure public.update_lesson_count();

-- 4. 維護 courses.student_count
create or replace function public.update_student_count()
returns trigger language plpgsql as $$
declare
  v_course_id uuid := coalesce(new.course_id, old.course_id);
begin
  update public.courses
  set student_count = (select count(*) from public.enrollments where course_id = v_course_id)
  where id = v_course_id;
  return null;
end;
$$;

create trigger enrollments_count_trigger
  after insert or delete on public.enrollments
  for each row execute procedure public.update_student_count();

-- 5. 發放 XP 並重新計算 level（在 progress 標記 completed 時呼叫）
--    等級門檻: level n 需要 n*(n-1)/2 * 100 XP（可自行調整）
create or replace function public.grant_lesson_xp(p_user_id uuid, p_lesson_id uuid)
returns void language plpgsql security definer as $$
declare
  v_xp_reward integer;
  v_already   boolean;
  v_new_xp    integer;
  v_new_level integer;
begin
  -- 防重複發放
  select xp_granted into v_already
  from public.user_progress
  where user_id = p_user_id and lesson_id = p_lesson_id;

  if v_already then return; end if;

  select xp_reward into v_xp_reward from public.lessons where id = p_lesson_id;
  if v_xp_reward is null then return; end if;

  -- 更新 progress 標記
  update public.user_progress set xp_granted = true
  where user_id = p_user_id and lesson_id = p_lesson_id;

  -- 累加 XP
  update public.profiles
  set exp = exp + v_xp_reward,
      total_xp_earned = total_xp_earned + v_xp_reward
  where id = p_user_id
  returning exp into v_new_xp;

  -- 重算等級（每升一級需多 100 XP：lv2=100, lv3=300, lv4=600...）
  v_new_level := floor((1 + sqrt(1 + 8 * v_new_xp::float / 100)) / 2)::integer;
  v_new_level := greatest(v_new_level, 1);

  update public.profiles set level = v_new_level where id = p_user_id;
end;
$$;

-- 6. 更新連續學習天數（每日首次請求時由 middleware 呼叫 update_streak）
create or replace function public.update_streak(p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_last date;
  v_today date := (timezone('Asia/Hong_Kong', now()))::date;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    return;
  end if;

  select last_active_at into v_last from public.profiles where id = p_user_id;

  if v_last = v_today then
    return;
  elsif v_last = v_today - 1 then
    update public.profiles
    set streak_days = streak_days + 1, last_active_at = v_today
    where id = p_user_id;
  else
    update public.profiles
    set streak_days = 1, last_active_at = v_today
    where id = p_user_id;
  end if;
end;
$$;

-- ================================================================
-- INDEXES
-- ================================================================
create index idx_courses_teacher      on public.courses(teacher_id);
create index idx_courses_category     on public.courses(category_id);
create index idx_courses_published    on public.courses(is_published) where is_published = true;
create index idx_lessons_course_order on public.lessons(course_id, sort_order);
create index idx_enrollments_user     on public.enrollments(user_id);
create index idx_enrollments_course   on public.enrollments(course_id);
create index idx_progress_user        on public.user_progress(user_id);
create index idx_progress_lesson      on public.user_progress(lesson_id);
create index idx_assignments_lesson   on public.assignments(lesson_id);
create index idx_assignments_student  on public.assignments(student_id);
create index idx_assignments_status   on public.assignments(status);
create index idx_profiles_exp         on public.profiles(exp desc);
create index idx_comments_lesson      on public.comments(lesson_id, created_at);

-- ================================================================
-- ROW LEVEL SECURITY (RLS)
-- ================================================================

-- Enable RLS on all tables
alter table public.profiles    enable row level security;
alter table public.categories  enable row level security;
alter table public.courses     enable row level security;
alter table public.lessons     enable row level security;
alter table public.enrollments enable row level security;
alter table public.user_progress enable row level security;
alter table public.assignments enable row level security;
alter table public.badges      enable row level security;
alter table public.comments    enable row level security;

-- Helper: check if current user is admin
create or replace function public.is_admin()
returns boolean language sql security definer as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Helper: check if current user is teacher or admin
create or replace function public.is_teacher_or_admin()
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('mentor','admin')
  );
$$;

-- Helper: check if current user is enrolled in a course
create or replace function public.is_enrolled(p_course_id uuid)
returns boolean language sql security definer as $$
  select exists (
    select 1 from public.enrollments
    where user_id = auth.uid()
      and course_id = p_course_id
      and (expires_at is null or expires_at > now())
  );
$$;

-- ── profiles ──────────────────────────────────────────────

create policy "profiles_select_leaderboard" on public.profiles for select using (true);
create policy "profiles_update_own"         on public.profiles for update using (auth.uid() = id);
-- 允許已登入用戶建立自己的 profile（trigger 未執行時的備援）
create policy "profiles_insert_own"         on public.profiles for insert with check (auth.uid() = id);


-- ── categories ────────────────────────────────────────────

create policy "categories_read_all"  on public.categories for select using (true);
create policy "categories_admin_all" on public.categories for all    using (public.is_admin());

-- ── courses ───────────────────────────────────────────────

-- 所有人可讀已發布課程
create policy "courses_select_published" on public.courses
  for select using (is_published = true);

-- 老師可讀寫自己的課程；管理員全部
create policy "courses_teacher_all" on public.courses
  for all using (teacher_id = auth.uid() or public.is_admin());

-- ── lessons ───────────────────────────────────────────────

-- 免費預覽課堂：所有人可讀
create policy "lessons_select_preview" on public.lessons
  for select using (is_preview = true);

-- 已報名的學生可讀
create policy "lessons_select_enrolled" on public.lessons
  for select using (public.is_enrolled(course_id));

-- 老師可讀寫自己課程的課堂；管理員全部
create policy "lessons_teacher_all" on public.lessons
  for all using (
    public.is_teacher_or_admin() and
    exists (
      select 1 from public.courses
      where id = lessons.course_id
        and (teacher_id = auth.uid() or public.is_admin())
    )
  );

-- ── enrollments ───────────────────────────────────────────

create policy "enrollments_select_own"  on public.enrollments for select using (user_id = auth.uid());
create policy "enrollments_insert_own"  on public.enrollments for insert with check (user_id = auth.uid());
create policy "enrollments_admin_all"   on public.enrollments for all    using (public.is_admin());

-- ── user_progress ─────────────────────────────────────────

create policy "progress_select_own"    on public.user_progress for select using (user_id = auth.uid());
create policy "progress_insert_own"    on public.user_progress for insert with check (user_id = auth.uid());
create policy "progress_update_own"    on public.user_progress for update using (user_id = auth.uid());
-- 老師可讀自己課程的學生進度
create policy "progress_teacher_read"  on public.user_progress
  for select using (
    public.is_teacher_or_admin() and
    exists (
      select 1 from public.lessons l
      join public.courses c on c.id = l.course_id
      where l.id = user_progress.lesson_id
        and (c.teacher_id = auth.uid() or public.is_admin())
    )
  );

-- ── assignments ───────────────────────────────────────────

-- 學生只能看自己的作業
create policy "assignments_select_own"  on public.assignments for select using (student_id = auth.uid());
create policy "assignments_insert_own"  on public.assignments for insert with check (student_id = auth.uid());
create policy "assignments_update_own"  on public.assignments for update using (student_id = auth.uid() and status = 'submitted');

-- 老師可讀批改自己課程的作業
create policy "assignments_teacher_read" on public.assignments
  for select using (
    exists (
      select 1 from public.lessons l
      join public.courses c on c.id = l.course_id
      where l.id = assignments.lesson_id
        and (c.teacher_id = auth.uid() or public.is_admin())
    )
  );

create policy "assignments_teacher_grade" on public.assignments
  for update using (
    exists (
      select 1 from public.lessons l
      join public.courses c on c.id = l.course_id
      where l.id = assignments.lesson_id
        and (c.teacher_id = auth.uid() or public.is_admin())
    )
  );

-- 管理員全部
create policy "assignments_admin_all" on public.assignments for all using (public.is_admin());

-- ── badges ────────────────────────────────────────────────

create policy "badges_select_own"  on public.badges for select using (user_id = auth.uid());
create policy "badges_public_read" on public.badges for select using (true);
create policy "badges_admin_all"   on public.badges for all    using (public.is_admin());

-- ── comments ──────────────────────────────────────────────

create policy "comments_read_all"       on public.comments for select using (true);
create policy "comments_insert_auth"    on public.comments for insert with check (auth.uid() = user_id);
create policy "comments_delete_own"     on public.comments for delete using (auth.uid() = user_id);
create policy "comments_admin_all"      on public.comments for all    using (public.is_admin());

-- ================================================================
-- STORAGE BUCKETS  (在 Supabase Dashboard > Storage 設定)
-- ================================================================
-- 建立以下 buckets:
--   avatars    (public)  — 用戶頭像
--   thumbnails (public)  — 課程封面
--   homepage   (public)  — 首頁背景圖／影片（僅 admin 上傳；見 migrations 20260505140000）
--   homework   (private) — 學生作業檔案
--
-- Storage RLS Policies:
--   avatars:   SELECT all; INSERT/UPDATE/DELETE by owner (path starts with uid)
--   homework:  SELECT by student_id or teacher/admin; INSERT by student; DELETE by student/admin
