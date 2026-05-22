-- 導師刪除自己課程時，需能刪除該課程的報名紀錄（否則刪除 courses 會被 RLS 擋下）

create policy "enrollments_teacher_delete" on public.enrollments
  for delete using (
    exists (
      select 1 from public.courses c
      where c.id = enrollments.course_id
        and (c.teacher_id = auth.uid() or public.is_admin())
    )
  );
