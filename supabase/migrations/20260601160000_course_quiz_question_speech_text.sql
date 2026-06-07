-- 題目朗讀用英文稿（Azure TTS 產生「問題語音」時使用，畫面仍顯示 question_text）

alter table public.course_quiz_questions
  add column if not exists question_speech_text text not null default '';

comment on column public.course_quiz_questions.question_speech_text is
  '問題語音：Azure 朗讀稿；留空則產生語音時改以 question_text 為準';
