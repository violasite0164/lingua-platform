-- 導師在自己課程的學習頁作答時也可寫入（不一定有 enrollments 紀錄）

create policy "lesson_cue_answers_insert_teacher" on public.lesson_cue_answers
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.lesson_timed_cues c
      join public.lessons l on l.id = c.lesson_id
      join public.courses co on co.id = l.course_id
      where c.id = lesson_cue_answers.cue_id
        and c.lesson_id = lesson_cue_answers.lesson_id
        and c.is_enabled = true
        and c.cue_type in ('multiple_choice', 'text_input')
        and (co.teacher_id = auth.uid() or public.is_admin())
    )
  );
