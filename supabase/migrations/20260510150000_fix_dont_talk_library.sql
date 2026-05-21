-- "Please don't ___ loudly in the library." — imperative negative uses base verb: don't talk.

update public.questions
set correct_index = 0,
    correct_answer_old = 'A'
where question_text = 'Please don''t ___ loudly in the library.';
