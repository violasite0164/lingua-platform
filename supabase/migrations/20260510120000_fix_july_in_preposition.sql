-- "___ July it is often hot." — correct preposition is in July, not at July.

update public.questions
set correct_index = 0,
    correct_answer_old = 'A',
    explanation = '月份用 in：in July。'
where question_text = '___ July it is often hot.';
