-- 課堂測驗：Azure Speech 產生的題目／選項語音 URL

alter table public.course_quiz_questions
  add column if not exists question_audio_url text,
  add column if not exists option_audio_urls jsonb not null default '[]'::jsonb;

comment on column public.course_quiz_questions.question_audio_url is
  'Azure Speech 產生之題目英文語音（公開 MP3 URL）';
comment on column public.course_quiz_questions.option_audio_urls is
  '與 options 順序對應的選項語音 URL 陣列';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'course-quiz-audio',
  'course-quiz-audio',
  true,
  5242880,
  array['audio/mpeg', 'audio/mp3']
)
on conflict (id) do nothing;

-- 路徑 {course_id}/{question_id}/question.mp3 | option-0.mp3 ...
create policy "course_quiz_audio_storage_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'course-quiz-audio'
    and public.is_teacher_or_admin()
    and exists (
      select 1 from public.course_quiz_questions q
      join public.course_quizzes cq on cq.id = q.quiz_id
      join public.courses c on c.id = cq.course_id
      where q.id::text = (storage.foldername(name))[2]
        and c.id::text = (storage.foldername(name))[1]
        and (c.teacher_id = auth.uid() or public.is_admin())
    )
  );

create policy "course_quiz_audio_storage_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'course-quiz-audio'
    and public.is_teacher_or_admin()
    and exists (
      select 1 from public.course_quiz_questions q
      join public.course_quizzes cq on cq.id = q.quiz_id
      join public.courses c on c.id = cq.course_id
      where q.id::text = (storage.foldername(name))[2]
        and c.id::text = (storage.foldername(name))[1]
        and (c.teacher_id = auth.uid() or public.is_admin())
    )
  );

create policy "course_quiz_audio_storage_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'course-quiz-audio'
    and public.is_teacher_or_admin()
    and exists (
      select 1 from public.course_quiz_questions q
      join public.course_quizzes cq on cq.id = q.quiz_id
      join public.courses c on c.id = cq.course_id
      where q.id::text = (storage.foldername(name))[2]
        and c.id::text = (storage.foldername(name))[1]
        and (c.teacher_id = auth.uid() or public.is_admin())
    )
  );

create policy "course_quiz_audio_storage_select" on storage.objects
  for select
  using (bucket_id = 'course-quiz-audio');
