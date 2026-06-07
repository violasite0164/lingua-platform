-- Add outcome videos for vocabulary_drop mode

alter table public.course_quiz_questions
  add column if not exists cf_correct_video_uid text null,
  add column if not exists cf_wrong_video_uid text null;

comment on column public.course_quiz_questions.cf_correct_video_uid is
  'Cloudflare Stream UID played after a correct answer (vocabulary_drop mode).';

comment on column public.course_quiz_questions.cf_wrong_video_uid is
  'Cloudflare Stream UID played after a wrong answer (vocabulary_drop mode).';

