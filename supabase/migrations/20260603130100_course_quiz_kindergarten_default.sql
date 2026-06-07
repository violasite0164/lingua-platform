-- 使用 kindergarten 預設（須在 enum 值已 commit 後執行）
alter table public.course_quizzes
  alter column play_theme set default 'kindergarten';

comment on column public.course_quizzes.play_theme is
  '課堂測驗播放主題：off | magic_forest | kindergarten（預設幼稚園）';
