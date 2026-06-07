-- 遊戲體力（每帳號獨立；上限 10；每小時回 1）

CREATE TABLE IF NOT EXISTS public.user_game_stamina (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  stamina smallint NOT NULL DEFAULT 10,
  stamina_anchor timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_game_stamina_range CHECK (stamina >= 0 AND stamina <= 10)
);

ALTER TABLE public.user_game_stamina ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_game_stamina_select_own ON public.user_game_stamina;
CREATE POLICY user_game_stamina_select_own
  ON public.user_game_stamina
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

COMMENT ON TABLE public.user_game_stamina IS '遊戲體力；stamina_anchor 為回復計時基準（未滿時每小時 +1）';

CREATE OR REPLACE FUNCTION public.apply_game_stamina_regen(
  p_stamina smallint,
  p_anchor timestamptz,
  p_now timestamptz DEFAULT now()
)
RETURNS TABLE(out_stamina smallint, out_anchor timestamptz)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_max constant smallint := 10;
  v_regen int;
BEGIN
  IF p_stamina >= v_max THEN
    RETURN QUERY SELECT v_max::smallint, p_now;
    RETURN;
  END IF;

  v_regen := floor(extract(epoch FROM (p_now - p_anchor)) / 3600)::int;
  IF v_regen <= 0 THEN
    RETURN QUERY SELECT p_stamina, p_anchor;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    least(v_max, (p_stamina + v_regen)::smallint)::smallint,
    CASE
      WHEN least(v_max, p_stamina + v_regen) >= v_max THEN p_now
      ELSE p_anchor + (v_regen * interval '1 hour')
    END;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_game_stamina()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
  v_stamina smallint;
  v_anchor timestamptz;
  v_applied_stamina smallint;
  v_applied_anchor timestamptz;
  v_now timestamptz := now();
  v_max constant smallint := 10;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'message', '請先登入');
  END IF;

  SELECT role INTO v_role FROM public.profiles WHERE id = v_uid;

  INSERT INTO public.user_game_stamina (user_id)
  VALUES (v_uid)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT s.stamina, s.stamina_anchor
  INTO v_stamina, v_anchor
  FROM public.user_game_stamina s
  WHERE s.user_id = v_uid
  FOR UPDATE;

  SELECT r.out_stamina, r.out_anchor
  INTO v_applied_stamina, v_applied_anchor
  FROM public.apply_game_stamina_regen(v_stamina, v_anchor, v_now) r;

  IF v_applied_stamina IS DISTINCT FROM v_stamina
     OR v_applied_anchor IS DISTINCT FROM v_anchor THEN
    UPDATE public.user_game_stamina
    SET
      stamina = v_applied_stamina,
      stamina_anchor = v_applied_anchor,
      updated_at = v_now
    WHERE user_id = v_uid;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'stamina', v_applied_stamina,
    'max', v_max,
    'isAdmin', v_role = 'admin',
    'nextRegenAt',
      CASE
        WHEN v_role = 'admin' OR v_applied_stamina >= v_max THEN null
        ELSE (v_applied_anchor + interval '1 hour')::timestamptz
      END
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.spend_game_stamina(p_amount smallint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
  v_stamina smallint;
  v_anchor timestamptz;
  v_applied_stamina smallint;
  v_applied_anchor timestamptz;
  v_now timestamptz := now();
  v_max constant smallint := 10;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'message', '請先登入');
  END IF;

  IF p_amount IS NULL OR p_amount < 1 OR p_amount > v_max THEN
    RETURN jsonb_build_object('ok', false, 'message', '無效的體力消耗');
  END IF;

  SELECT role INTO v_role FROM public.profiles WHERE id = v_uid;

  INSERT INTO public.user_game_stamina (user_id)
  VALUES (v_uid)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT s.stamina, s.stamina_anchor
  INTO v_stamina, v_anchor
  FROM public.user_game_stamina s
  WHERE s.user_id = v_uid
  FOR UPDATE;

  SELECT r.out_stamina, r.out_anchor
  INTO v_applied_stamina, v_applied_anchor
  FROM public.apply_game_stamina_regen(v_stamina, v_anchor, v_now) r;

  IF v_role = 'admin' THEN
    IF v_applied_stamina IS DISTINCT FROM v_stamina
       OR v_applied_anchor IS DISTINCT FROM v_anchor THEN
      UPDATE public.user_game_stamina
      SET stamina = v_applied_stamina, stamina_anchor = v_applied_anchor, updated_at = v_now
      WHERE user_id = v_uid;
    END IF;

    RETURN jsonb_build_object(
      'ok', true,
      'spent', 0,
      'stamina', v_applied_stamina,
      'max', v_max,
      'isAdmin', true,
      'nextRegenAt', null
    );
  END IF;

  IF v_applied_stamina < p_amount THEN
    RETURN jsonb_build_object(
      'ok', false,
      'message', '體力不足',
      'stamina', v_applied_stamina,
      'max', v_max,
      'nextRegenAt', (v_applied_anchor + interval '1 hour')::timestamptz
    );
  END IF;

  v_applied_stamina := v_applied_stamina - p_amount;

  IF v_applied_stamina < v_max THEN
    v_applied_anchor := v_now;
  END IF;

  UPDATE public.user_game_stamina
  SET
    stamina = v_applied_stamina,
    stamina_anchor = v_applied_anchor,
    updated_at = v_now
  WHERE user_id = v_uid;

  RETURN jsonb_build_object(
    'ok', true,
    'spent', p_amount,
    'stamina', v_applied_stamina,
    'max', v_max,
    'isAdmin', false,
    'nextRegenAt',
      CASE
        WHEN v_applied_stamina >= v_max THEN null
        ELSE (v_applied_anchor + interval '1 hour')::timestamptz
      END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_game_stamina() TO authenticated;
GRANT EXECUTE ON FUNCTION public.spend_game_stamina(smallint) TO authenticated;
