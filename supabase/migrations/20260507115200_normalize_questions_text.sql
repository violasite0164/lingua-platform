-- Normalize quiz question text/options whitespace in DB.
-- Safe to run multiple times.

-- 1) Helper: normalize whitespace + remove zero-width chars
create or replace function public.normalize_quiz_text(t text)
returns text
language sql
immutable
as $$
  select
    regexp_replace(
      regexp_replace(
        translate(
          coalesce(t, ''),
          chr(160)  || chr(12288) || chr(8203) || chr(8288) || chr(65279),
          '     '
        ),
        '\s+',
        ' ',
        'g'
      ),
      '^\s+|\s+$',
      '',
      'g'
    );
$$;

-- 2) Normalize question_text/explanation
update public.questions
set
  question_text = public.normalize_quiz_text(question_text),
  explanation   = public.normalize_quiz_text(explanation)
where
  question_text is distinct from public.normalize_quiz_text(question_text)
  or explanation is distinct from public.normalize_quiz_text(explanation);

-- 3) Normalize options jsonb array elements (keep array order)
update public.questions q
set options = v.new_options
from (
  select
    id,
    jsonb_agg(to_jsonb(public.normalize_quiz_text(opt)) order by ord) as new_options
  from public.questions
  cross join lateral jsonb_array_elements_text(options) with ordinality as e(opt, ord)
  group by id
) v
where q.id = v.id
  and q.options is distinct from v.new_options;

-- 4) (Optional) Audit queries (run manually in SQL editor)
-- -- Which rows would change?
-- select id, difficulty, question_text
-- from public.questions
-- where question_text is distinct from public.normalize_quiz_text(question_text)
--    or explanation  is distinct from public.normalize_quiz_text(explanation);
--
-- -- Options with leading/trailing/unicode whitespace
-- select id, difficulty, jsonb_pretty(options) as options
-- from public.questions
-- where options is distinct from (
--   select jsonb_agg(to_jsonb(public.normalize_quiz_text(opt)) order by ord)
--   from jsonb_array_elements_text(public.questions.options) with ordinality as e(opt, ord)
-- );

