-- 驗證題目修正（單一 SELECT，可用 Explain 分析）。
-- matching_rows：符合條件的「列數」（若曾重複執行 INSERT seed，同一題幹可能多列 → 常見為 2）。
-- phonemic 那列的 LIKE 會同時命中「…minimal pairs)?」與「…(choose the best option)?」兩種題幹，故亦可能 >2。
-- 「無舊 complementary」那列預期 0（代表題幹應已全部改為 phonemic contrast）。

select chk, matching_rows, note
from (
  select
    1 as ord,
    'OK July → In (A,0)' as chk,
    count(*) filter (where correct_index = 0 and correct_answer_old = 'A') as matching_rows,
    '預期 ≥1（符合條件之列數；>1 多半為重複 INSERT seed）' as note
  from public.questions
  where question_text = '___ July it is often hot.'
  union all
  select
    2,
    'OK boiling → 100°C (B,1)',
    count(*) filter (where correct_index = 1 and correct_answer_old = 'B'),
    '預期 ≥1（符合條件之列數；>1 多半為重複 INSERT seed）'
  from public.questions
  where question_text = 'Boiling water is ___ degrees Celsius.'
  union all
  select
    3,
    'OK data processed → were (B,1)',
    count(*) filter (where correct_index = 1 and correct_answer_old = 'B'),
    '預期 ≥1（符合條件之列數；>1 多半為重複 INSERT seed）'
  from public.questions
  where question_text = 'The data ___ processed overnight.'
  union all
  select
    4,
    'OK data biased → appear (A,0)',
    count(*) filter (where correct_index = 0 and correct_answer_old = 'A'),
    '預期 ≥1（符合條件之列數；>1 多半為重複 INSERT seed）'
  from public.questions
  where question_text like 'The data ___ systematically biased%'
  union all
  select
    5,
    'OK 題幹已為 phonemic contrast (minimal pairs)',
    count(*)::bigint,
    '預期 ≥1；計數含「?」與「(choose…)」兩種題幹與重複列，故常見 2–4'
  from public.questions
  where question_text like '%Which pair illustrates phonemic contrast (minimal pairs)%'
  union all
  select
    6,
    'OK 無残留 complementary distribution 舊題幹',
    count(*)::bigint,
    '預期 0；若 >0 請再執行 manual_apply_all_question_fixes.sql'
  from public.questions
  where question_text like '%Which pair illustrates complementary distribution%'
  union all
  select
    7,
    'OK limitation → concerns (A,0)',
    count(*) filter (where correct_index = 0 and correct_answer_old = 'A'),
    '預期 ≥1（符合條件之列數；>1 多半為重複 INSERT seed）'
  from public.questions
  where question_text like 'The limitation ___ the cross-sectional design%'
  union all
  select
    8,
    'OK Hardly → had I (B,1)',
    count(*) filter (where correct_index = 1 and correct_answer_old = 'B'),
    '預期 ≥1（符合條件之列數；>1 多半為重複 INSERT seed）'
  from public.questions
  where question_text = 'Hardly ___ sat down when the phone rang.'
  union all
  select
    9,
    'OK Scarcely train → when (B,1)',
    count(*) filter (where correct_index = 1 and correct_answer_old = 'B'),
    '預期 ≥1（符合條件之列數；>1 多半為重複 INSERT seed）'
  from public.questions
  where question_text = 'Scarcely had the train stopped ___ passengers rushed out.'
  union all
  select
    10,
    'OK No sooner bell → had (A,0)',
    count(*) filter (where correct_index = 0 and correct_answer_old = 'A'),
    '預期 ≥1（符合條件之列數；>1 多半為重複 INSERT seed）'
  from public.questions
  where question_text = 'No sooner ___ the bell rung than the students left.'
  union all
  select
    11,
    'OK bus 3 p.m. → at (C,2)',
    count(*) filter (where correct_index = 2 and correct_answer_old = 'C'),
    '預期 ≥1（符合條件之列數；>1 多半為重複 INSERT seed）'
  from public.questions
  where question_text = 'The bus leaves ___ 3 p.m.'
  union all
  select
    12,
    'OK cut paper scissors → with (B,1)',
    count(*) filter (where correct_index = 1 and correct_answer_old = 'B'),
    '預期 ≥1（符合條件之列數；>1 多半為重複 INSERT seed）'
  from public.questions
  where question_text = 'She cut the paper ___ scissors.'
  union all
  select
    13,
    'OK married doctor → to (B,1)',
    count(*) filter (where correct_index = 1 and correct_answer_old = 'B'),
    '預期 ≥1（符合條件之列數；>1 多半為重複 INSERT seed）'
  from public.questions
  where question_text = 'He is married ___ a doctor.'
  union all
  select
    14,
    'OK juice jug → many kinds / there are (B,1)',
    count(*) filter (where correct_index = 1 and correct_answer_old = 'B'),
    '預期 ≥1；題幹應含 many kinds of juice +（選）後綴'
  from public.questions
  where question_text like '%There ___ many kinds of juice in the jug%'
  union all
  select
    15,
    'OK 無舊 there-some-juice 題幹',
    count(*)::bigint,
    '預期 0；尚餘代表未套用 juice migration／manual_apply'
  from public.questions
  where question_text in (
    'There ___ some juice in the jug.',
    'There ___ some juice in the jug. (choose the best option).'
  )
  union all
  select
    16,
    'OK library don''t → talk (A,0)',
    count(*) filter (where correct_index = 0 and correct_answer_old = 'A'),
    '預期 ≥1（符合條件之列數；>1 多半為重複 INSERT seed）'
  from public.questions
  where question_text = 'Please don''t ___ loudly in the library.'
) v
order by ord;
