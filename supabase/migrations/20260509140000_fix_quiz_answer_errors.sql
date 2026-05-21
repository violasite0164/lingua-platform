-- Fix quiz rows where the keyed answer disagreed with the explanation or standard grammar.
-- Idempotent: safe to re-run.

update public.questions
set correct_index = 1,
    correct_answer_old = 'B'
where question_text = 'Boiling water is ___ degrees Celsius.';

update public.questions
set correct_index = 1,
    correct_answer_old = 'B'
where question_text = 'The data ___ processed overnight.';

update public.questions
set correct_index = 0,
    correct_answer_old = 'A'
where question_text like 'The data ___ systematically biased%';

update public.questions
set question_text = replace(
      question_text,
      'Which pair illustrates complementary distribution',
      'Which pair illustrates phonemic contrast (minimal pairs)'
    ),
    explanation = 'pit / bit 僅差一個音位 /p/ 與 /b/，為最小對立組，顯示音位對立。'
where question_text like '%Which pair illustrates complementary distribution%';
