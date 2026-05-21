-- ═══════════════════════════════════════════════════════════════════════════
-- 題目修正：【單一 UPDATE 語句】Supabase SQL Editor 可直接 Run（不需 DO）。
-- 與 migrations / plain 多句版效果相同；已符合條件者可重跑，結果不變。
--
-- 驗證：另執行 manual_verify_question_fixes.sql
-- ═══════════════════════════════════════════════════════════════════════════

UPDATE public.questions
SET
  correct_index = CASE
    WHEN question_text = 'Boiling water is ___ degrees Celsius.' THEN 1
    WHEN question_text = 'The data ___ processed overnight.' THEN 1
    WHEN question_text LIKE 'The data ___ systematically biased%' THEN 0
    WHEN question_text LIKE 'The limitation ___ the cross-sectional design%' THEN 0
    WHEN question_text = 'Hardly ___ sat down when the phone rang.' THEN 1
    WHEN question_text = 'Scarcely had the train stopped ___ passengers rushed out.' THEN 1
    WHEN question_text = 'No sooner ___ the bell rung than the students left.' THEN 0
    WHEN question_text = '___ July it is often hot.' THEN 0
    WHEN question_text = 'The bus leaves ___ 3 p.m.' THEN 2
    WHEN question_text = 'She cut the paper ___ scissors.' THEN 1
    WHEN question_text = 'He is married ___ a doctor.' THEN 1
    WHEN question_text = 'Please don''t ___ loudly in the library.' THEN 0
    WHEN question_text IN (
      'There ___ some juice in the jug.',
      'There ___ some juice in the jug. (choose the best option).'
    )
      OR (
        question_text LIKE '%many juice in the jug%'
        AND question_text NOT LIKE '%many kinds of juice%'
      )
      OR (
        question_text LIKE '%There ___ many kinds of juice in the jug%'
        AND (
          correct_index IS DISTINCT FROM 1
          OR correct_answer_old IS DISTINCT FROM 'B'
        )
      ) THEN 1
    ELSE correct_index
  END,
  correct_answer_old = CASE
    WHEN question_text = 'Boiling water is ___ degrees Celsius.' THEN 'B'
    WHEN question_text = 'The data ___ processed overnight.' THEN 'B'
    WHEN question_text LIKE 'The data ___ systematically biased%' THEN 'A'
    WHEN question_text LIKE 'The limitation ___ the cross-sectional design%' THEN 'A'
    WHEN question_text = 'Hardly ___ sat down when the phone rang.' THEN 'B'
    WHEN question_text = 'Scarcely had the train stopped ___ passengers rushed out.' THEN 'B'
    WHEN question_text = 'No sooner ___ the bell rung than the students left.' THEN 'A'
    WHEN question_text = '___ July it is often hot.' THEN 'A'
    WHEN question_text = 'The bus leaves ___ 3 p.m.' THEN 'C'
    WHEN question_text = 'She cut the paper ___ scissors.' THEN 'B'
    WHEN question_text = 'He is married ___ a doctor.' THEN 'B'
    WHEN question_text = 'Please don''t ___ loudly in the library.' THEN 'A'
    WHEN question_text IN (
      'There ___ some juice in the jug.',
      'There ___ some juice in the jug. (choose the best option).'
    )
      OR (
        question_text LIKE '%many juice in the jug%'
        AND question_text NOT LIKE '%many kinds of juice%'
      )
      OR (
        question_text LIKE '%There ___ many kinds of juice in the jug%'
        AND (
          correct_index IS DISTINCT FROM 1
          OR correct_answer_old IS DISTINCT FROM 'B'
        )
      ) THEN 'B'
    ELSE correct_answer_old
  END,
  explanation = CASE
    WHEN question_text LIKE '%Which pair illustrates complementary distribution%' THEN 'pit / bit 僅差一個音位 /p/ 與 /b/，為最小對立組，顯示音位對立。'
    WHEN question_text = '___ July it is often hot.' THEN '月份用 in：in July。'
    WHEN question_text IN (
      'There ___ some juice in the jug.',
      'There ___ some juice in the jug. (choose the best option).'
    )
      OR (
        question_text LIKE '%many juice in the jug%'
        AND question_text NOT LIKE '%many kinds of juice%'
      )
      OR (
        question_text LIKE '%There ___ many kinds of juice in the jug%'
        AND (
          correct_index IS DISTINCT FROM 1
          OR correct_answer_old IS DISTINCT FROM 'B'
        )
      ) THEN 'kinds 為可數複數，用 there are。'
    ELSE explanation
  END,
  question_text = CASE
    WHEN question_text = 'There ___ some juice in the jug.' THEN 'There ___ many kinds of juice in the jug.'
    WHEN question_text = 'There ___ some juice in the jug. (choose the best option).' THEN 'There ___ many kinds of juice in the jug. (choose the best option).'
    WHEN question_text LIKE '%many juice in the jug%'
      AND question_text NOT LIKE '%many kinds of juice%' THEN replace(question_text, 'many juice', 'many kinds of juice')
    WHEN question_text LIKE '%Which pair illustrates complementary distribution%' THEN replace(
      question_text,
      'Which pair illustrates complementary distribution',
      'Which pair illustrates phonemic contrast (minimal pairs)'
    )
    ELSE question_text
  END
WHERE
  question_text IN (
    'Boiling water is ___ degrees Celsius.',
    'The data ___ processed overnight.',
    'Hardly ___ sat down when the phone rang.',
    'Scarcely had the train stopped ___ passengers rushed out.',
    'No sooner ___ the bell rung than the students left.',
    '___ July it is often hot.',
    'The bus leaves ___ 3 p.m.',
    'She cut the paper ___ scissors.',
    'He is married ___ a doctor.',
    'Please don''t ___ loudly in the library.',
    'There ___ some juice in the jug.',
    'There ___ some juice in the jug. (choose the best option).'
  )
  OR question_text LIKE 'The data ___ systematically biased%'
  OR question_text LIKE 'The limitation ___ the cross-sectional design%'
  OR question_text LIKE '%Which pair illustrates complementary distribution%'
  OR (
    question_text LIKE '%many juice in the jug%'
    AND question_text NOT LIKE '%many kinds of juice%'
  )
  OR (
    question_text LIKE '%There ___ many kinds of juice in the jug%'
    AND (
      correct_index IS DISTINCT FROM 1
      OR correct_answer_old IS DISTINCT FROM 'B'
    )
  );
