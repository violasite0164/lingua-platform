-- Stems like “There ___ some juice …” keyed “is” conflict with learner intuition around “many” + juice.
-- Use plural NP “many kinds of juice” so the answer is **there are**.

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
    question_text like '%There ___ many juice in the jug%'
    and question_text not like '%many kinds of juice%'
  )
  or (
    question_text like '%There ___ many kinds of juice in the jug%'
    and (
      correct_index is distinct from 1
      or correct_answer_old is distinct from 'B'
    )
  );
