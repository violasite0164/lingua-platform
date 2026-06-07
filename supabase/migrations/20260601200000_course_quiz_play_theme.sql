-- 課堂測驗播放主題（測驗管理後台可設定）

create type public.course_quiz_play_theme as enum ('off', 'magic_forest');

alter table public.course_quizzes
  add column if not exists play_theme public.course_quiz_play_theme not null default 'off';

comment on column public.course_quizzes.play_theme is
  '學生作答時主題：off=無背景／無 BGM／無吉祥物；magic_forest=魔法森林';
