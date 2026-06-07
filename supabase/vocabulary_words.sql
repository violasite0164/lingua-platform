-- Stage 2 分身術：小學英文生字庫
-- 執行後再跑 vocabulary_words_seed_300.sql

CREATE TABLE IF NOT EXISTS public.vocabulary_words (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  word text NOT NULL,
  grade_level text NOT NULL DEFAULT 'elementary'
    CHECK (grade_level IN ('elementary', 'junior', 'college', 'professor')),
  meaning_zh text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vocabulary_words_word_unique UNIQUE (word)
);

CREATE INDEX IF NOT EXISTS vocabulary_words_grade_level_idx
  ON public.vocabulary_words (grade_level);

ALTER TABLE public.vocabulary_words ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vocabulary_words_select_authenticated ON public.vocabulary_words;
CREATE POLICY vocabulary_words_select_authenticated
  ON public.vocabulary_words
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS vocabulary_words_all_admin ON public.vocabulary_words;
CREATE POLICY vocabulary_words_all_admin
  ON public.vocabulary_words
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

COMMENT ON TABLE public.vocabulary_words IS 'Stage 2 分身術生字庫（elementary 小學、junior 至中一；建議每字 ≥6 字母）';
