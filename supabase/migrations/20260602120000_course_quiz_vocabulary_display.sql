-- 單字模式：字元（立體答案內容）或卡片（預留）

create type public.course_quiz_vocabulary_display as enum ('character', 'card');

alter table public.course_quizzes
  add column if not exists vocabulary_display public.course_quiz_vocabulary_display
  not null default 'character';

comment on column public.course_quizzes.vocabulary_display is
  '單字模式顯示：character=立體答案內容字元；card=卡片（完整選項，待擴充）';
