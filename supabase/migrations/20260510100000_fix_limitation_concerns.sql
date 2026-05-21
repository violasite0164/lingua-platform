-- Align "The limitation ___ the cross-sectional design" with academic usage (concerns).

update public.questions
set correct_index = 0,
    correct_answer_old = 'A'
where question_text like 'The limitation ___ the cross-sectional design%';

-- Batch3 junior: inversion / correlative conjunction keys corrected.
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
