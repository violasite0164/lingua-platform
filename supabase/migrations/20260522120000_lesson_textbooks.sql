-- 單元課本教材（PDF / 文件 / 圖片）

create table public.lesson_textbooks (
  id              uuid        primary key default gen_random_uuid(),
  lesson_id       uuid        not null references public.lessons(id) on delete cascade,
  title           text        not null,
  file_name       text        not null,
  file_url        text        not null,
  storage_path    text        not null,
  mime_type       text,
  file_size_bytes bigint      not null default 0 check (file_size_bytes >= 0),
  sort_order      integer     not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_lesson_textbooks_lesson_order
  on public.lesson_textbooks (lesson_id, sort_order);

create trigger lesson_textbooks_updated_at
  before update on public.lesson_textbooks
  for each row execute procedure public.set_updated_at();

alter table public.lesson_textbooks enable row level security;

-- 導師 / 管理員：自己課程的單元教材
create policy "lesson_textbooks_teacher_all" on public.lesson_textbooks
  for all using (
    public.is_teacher_or_admin() and
    exists (
      select 1 from public.lessons l
      join public.courses c on c.id = l.course_id
      where l.id = lesson_textbooks.lesson_id
        and (c.teacher_id = auth.uid() or public.is_admin())
    )
  );

-- 學員：已報名或試看單元可讀
create policy "lesson_textbooks_select_student" on public.lesson_textbooks
  for select using (
    exists (
      select 1 from public.lessons l
      where l.id = lesson_textbooks.lesson_id
        and (l.is_preview = true or public.is_enrolled(l.course_id))
    )
  );

-- Storage bucket（公開讀取，路徑含 course/lesson 以利 RLS）
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lesson-textbooks',
  'lesson-textbooks',
  true,
  52428800,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
)
on conflict (id) do nothing;

-- 導師上傳：路徑 {course_id}/{lesson_id}/...
create policy "lesson_textbooks_storage_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'lesson-textbooks'
    and public.is_teacher_or_admin()
    and exists (
      select 1 from public.lessons l
      join public.courses c on c.id = l.course_id
      where l.course_id::text = (storage.foldername(name))[1]
        and l.id::text = (storage.foldername(name))[2]
        and (c.teacher_id = auth.uid() or public.is_admin())
    )
  );

create policy "lesson_textbooks_storage_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'lesson-textbooks'
    and public.is_teacher_or_admin()
    and exists (
      select 1 from public.lessons l
      join public.courses c on c.id = l.course_id
      where l.course_id::text = (storage.foldername(name))[1]
        and l.id::text = (storage.foldername(name))[2]
        and (c.teacher_id = auth.uid() or public.is_admin())
    )
  );

create policy "lesson_textbooks_storage_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'lesson-textbooks'
    and public.is_teacher_or_admin()
    and exists (
      select 1 from public.lessons l
      join public.courses c on c.id = l.course_id
      where l.course_id::text = (storage.foldername(name))[1]
        and l.id::text = (storage.foldername(name))[2]
        and (c.teacher_id = auth.uid() or public.is_admin())
    )
  );

-- 公開 bucket：所有人可讀（實際存取仍依課程報名；URL 不易猜測）
create policy "lesson_textbooks_storage_select" on storage.objects
  for select
  using (bucket_id = 'lesson-textbooks');
