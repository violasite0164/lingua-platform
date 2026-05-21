-- 題目修正：純 UPDATE（多語句）。請在 SQL Editor 選「Run」，不要用 Explain。
-- Supabase 會逐句執行；若你的工具強制單句 Explain，請改用 manual_apply_all_question_fixes.sql（DO 區塊）。

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

update public.questions
set correct_index = 0,
    correct_answer_old = 'A'
where question_text like 'The limitation ___ the cross-sectional design%';

update public.questions
set correct_index = 1,
    correct_answer_old = 'B'
where question_text = 'Hardly ___ sat down when the phone rang.';

update public.questions
set correct_index = 1,
    correct_answer_old = 'B'
where question_text = 'Scarcely had the train stopped ___ passengers rushed out.';

update public.questions
set correct_index = 0,
    correct_answer_old = 'A'
where question_text = 'No sooner ___ the bell rung than the students left.';

update public.questions
set correct_index = 0,
    correct_answer_old = 'A',
    explanation = '月份用 in：in July。'
where question_text = '___ July it is often hot.';

update public.questions
set correct_index = 2,
    correct_answer_old = 'C'
where question_text = 'The bus leaves ___ 3 p.m.';

update public.questions
set correct_index = 0,
    correct_answer_old = 'A'
where question_text = 'Please don''t ___ loudly in the library.';

update public.questions
set
  question_text = case
    when question_text = 'There ___ some juice in the jug.' then 'There ___ many kinds of juice in the jug.'
    when question_text = 'There ___ some juice in the jug. (choose the best option).' then 'There ___ many kinds of juice in the jug. (choose the best option).'
    when question_text like '%many juice in the jug%'
      and question_text not like '%many kinds of juice%' then replace(question_text, 'many juice', 'many kinds of juice')
    else question_text
  end,
  correct_index = 1,
  correct_answer_old = 'B',
  explanation = 'kinds 為可數複數，用 there are。'
where
  question_text in (
    'There ___ some juice in the jug.',
    'There ___ some juice in the jug. (choose the best option).'
  )
  or (
    question_text like '%many juice in the jug%'
    and question_text not like '%many kinds of juice%'
  )
  or (
    question_text like '%There ___ many kinds of juice in the jug%'
    and (
      correct_index is distinct from 1
      or correct_answer_old is distinct from 'B'
    )
  );
