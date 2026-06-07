-- 課堂 Quiz：三選一 / 四選一模式

create type public.course_quiz_choice_mode as enum ('three', 'four');

alter table public.course_quizzes
  add column if not exists choice_mode public.course_quiz_choice_mode not null default 'four';

alter table public.course_quiz_questions
  drop constraint if exists course_quiz_questions_correct_index_check;

alter table public.course_quiz_questions
  add constraint course_quiz_questions_correct_index_check
  check (correct_index >= 0 and correct_index <= 3);
