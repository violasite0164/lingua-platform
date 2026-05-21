-- Replace "/" placeholder options with meaningful text.
-- Safe to run multiple times.

-- Ensure helper exists (migration is self-contained).
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

update public.questions q
set options = v.new_options
from (
  select
    id,
    jsonb_agg(
      to_jsonb(
        case
          -- Options are often stored as "A. xxx". Replace the placeholder "/" (with or without letter prefix)
          -- with a meaningful label.
          when regexp_replace(public.normalize_quiz_text(opt), '^[A-Da-d][\\.\\)\\uff0e]\\s*', '') = '/'
            then 'no article'
          else public.normalize_quiz_text(opt)
        end
      )
      order by ord
    ) as new_options
  from public.questions
  cross join lateral jsonb_array_elements_text(options) with ordinality as e(opt, ord)
  group by id
) v
where q.id = v.id
  and q.options is distinct from v.new_options;
