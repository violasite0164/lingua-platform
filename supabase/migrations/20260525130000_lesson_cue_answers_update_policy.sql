-- upsert 衝突時需 UPDATE 權限

create policy "lesson_cue_answers_update_own" on public.lesson_cue_answers
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());
