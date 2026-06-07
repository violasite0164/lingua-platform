-- 新增 enum 值（須單獨 commit；不可與下一支 migration 合併）
alter type public.course_quiz_play_theme add value if not exists 'kindergarten';
