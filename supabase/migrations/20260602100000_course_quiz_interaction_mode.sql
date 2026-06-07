-- 課堂測驗互動模式：一般選項 / 單字掉落撿起

create type public.course_quiz_interaction_mode as enum ('choice_grid', 'vocabulary_drop');

alter table public.course_quizzes
  add column if not exists interaction_mode public.course_quiz_interaction_mode
  not null default 'choice_grid';

comment on column public.course_quizzes.interaction_mode is
  'choice_grid=影片下選項；vocabulary_drop=播完影片語音後答案掉落、長按撿起拖入影片區';
