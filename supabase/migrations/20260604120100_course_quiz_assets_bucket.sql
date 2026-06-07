-- 課堂測驗圖形模式：選項圖片、自訂 typeface JSON

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'course-quiz-assets',
  'course-quiz-assets',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/json']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "course_quiz_assets_public_read"
  on storage.objects for select
  using (bucket_id = 'course-quiz-assets');

create policy "course_quiz_assets_mentor_upload"
  on storage.objects for insert
  with check (
    bucket_id = 'course-quiz-assets'
    and auth.role() = 'authenticated'
  );

create policy "course_quiz_assets_mentor_update"
  on storage.objects for update
  using (bucket_id = 'course-quiz-assets' and auth.role() = 'authenticated');

create policy "course_quiz_assets_mentor_delete"
  on storage.objects for delete
  using (bucket_id = 'course-quiz-assets' and auth.role() = 'authenticated');
