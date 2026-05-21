-- "The bus leaves ___ 3 p.m." — clock times use at (at 3 p.m.), not in/on.

update public.questions
set correct_index = 2,
    correct_answer_old = 'C'
where question_text = 'The bus leaves ___ 3 p.m.';
