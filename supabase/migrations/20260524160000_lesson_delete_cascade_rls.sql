-- 導師刪除單元時，需能刪除相關學習進度、作業與留言（否則刪除 lessons 會被 RLS 擋下）

create policy "progress_teacher_delete" on public.user_progress
  for delete using (
    exists (
      select 1 from public.lessons l
      join public.courses c on c.id = l.course_id
      where l.id = user_progress.lesson_id
        and (c.teacher_id = auth.uid() or public.is_admin())
    )
  );

create policy "assignments_teacher_delete" on public.assignments
  for delete using (
    exists (
      select 1 from public.lessons l
      join public.courses c on c.id = l.course_id
      where l.id = assignments.lesson_id
        and (c.teacher_id = auth.uid() or public.is_admin())
    )
  );

create policy "comments_teacher_delete" on public.comments
  for delete using (
    exists (
      select 1 from public.lessons l
      join public.courses c on c.id = l.course_id
      where l.id = comments.lesson_id
        and (c.teacher_id = auth.uid() or public.is_admin())
    )
  );
