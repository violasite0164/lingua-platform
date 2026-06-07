-- 單字顯示改為每題獨立設定；測驗層 vocabulary_display 保留作新題預設

alter table public.course_quiz_questions
  add column if not exists vocabulary_display public.course_quiz_vocabulary_display
  not null default 'character';

update public.course_quiz_questions q
set vocabulary_display = case
  when cq.vocabulary_display::text in ('card', 'shape')
    then 'shape'::public.course_quiz_vocabulary_display
  else coalesce(
    cq.vocabulary_display,
    'character'::public.course_quiz_vocabulary_display
  )
end
from public.course_quizzes cq
where q.quiz_id = cq.id;

comment on column public.course_quiz_questions.vocabulary_display is
  '單字模式：此題掉落字元或圖形（立體字／自訂 typeface／選項圖片）。';

comment on column public.course_quizzes.vocabulary_display is
  '單字模式：新增題目時的預設單字顯示（各題可於題目編輯覆寫）。';
