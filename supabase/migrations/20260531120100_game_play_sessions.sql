-- 遊戲局次 token：扣體力與開局綁定，伺服器驗證後才允許抽題／結算

CREATE TABLE IF NOT EXISTS public.game_play_advance_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_difficulty text NOT NULL,
  source_difficulty text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 minutes'),
  used_at timestamptz,
  CONSTRAINT game_play_advance_grants_target_chk CHECK (
    target_difficulty IN ('elementary', 'junior', 'college', 'professor')
  )
);

CREATE INDEX IF NOT EXISTS idx_game_play_advance_grants_user_open
  ON public.game_play_advance_grants (user_id, target_difficulty)
  WHERE used_at IS NULL;

ALTER TABLE public.game_play_advance_grants ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.game_play_advance_grants IS
  '通關後免扣體力進下一難度；僅能透過 issue_game_advance_grant 建立';

CREATE TABLE IF NOT EXISTS public.game_play_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  difficulty text NOT NULL,
  charge_kind text NOT NULL,
  stamina_spent smallint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '4 hours'),
  consumed_at timestamptz,
  CONSTRAINT game_play_sessions_difficulty_chk CHECK (
    difficulty IN ('elementary', 'junior', 'college', 'professor')
  ),
  CONSTRAINT game_play_sessions_charge_chk CHECK (
    charge_kind IN ('none', 'start', 'retry', 'continue')
  )
);

CREATE INDEX IF NOT EXISTS idx_game_play_sessions_user_open
  ON public.game_play_sessions (user_id)
  WHERE consumed_at IS NULL;

ALTER TABLE public.game_play_sessions ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.game_play_sessions IS
  '一局遊戲的伺服器 token；開局扣體力後建立，結算時 consume';

-- ─── 內部：charge_kind → 體力消耗 ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.game_play_stamina_cost(p_charge_kind text)
RETURNS smallint
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_charge_kind
    WHEN 'start' THEN 1::smallint
    WHEN 'retry' THEN 1::smallint
    WHEN 'continue' THEN 3::smallint
    ELSE 0::smallint
  END;
$$;

-- ─── 發放「下一關免扣體力」憑證（通關後由伺服器呼叫）────────────────────────

CREATE OR REPLACE FUNCTION public.issue_game_advance_grant(
  p_target_difficulty text,
  p_source_difficulty text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_grant_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'message', '請先登入');
  END IF;

  IF p_target_difficulty NOT IN ('elementary', 'junior', 'college', 'professor') THEN
    RETURN jsonb_build_object('ok', false, 'message', '難度參數無效');
  END IF;

  INSERT INTO public.game_play_advance_grants (
    user_id,
    target_difficulty,
    source_difficulty
  )
  VALUES (v_uid, p_target_difficulty, p_source_difficulty)
  RETURNING id INTO v_grant_id;

  RETURN jsonb_build_object('ok', true, 'grantId', v_grant_id);
END;
$$;

-- ─── 開局：扣體力（如需）並建立 session ─────────────────────────────────────

CREATE OR REPLACE FUNCTION public.begin_game_play_session(
  p_difficulty text,
  p_charge_kind text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_cost smallint;
  v_spend jsonb;
  v_session_id uuid;
  v_grant_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'message', '請先登入');
  END IF;

  IF p_difficulty NOT IN ('elementary', 'junior', 'college', 'professor') THEN
    RETURN jsonb_build_object('ok', false, 'message', '難度參數無效');
  END IF;

  IF p_charge_kind NOT IN ('none', 'start', 'retry', 'continue') THEN
    RETURN jsonb_build_object('ok', false, 'message', '無效的開局類型');
  END IF;

  v_cost := public.game_play_stamina_cost(p_charge_kind);

  IF p_charge_kind = 'none' THEN
    SELECT g.id
    INTO v_grant_id
    FROM public.game_play_advance_grants g
    WHERE g.user_id = v_uid
      AND g.target_difficulty = p_difficulty
      AND g.used_at IS NULL
      AND g.expires_at > now()
    ORDER BY g.created_at DESC
    LIMIT 1
    FOR UPDATE;

    IF v_grant_id IS NULL THEN
      RETURN jsonb_build_object(
        'ok', false,
        'message', '沒有可用的通關晉級憑證，請先完成上一關或重新開始（需扣體力）'
      );
    END IF;

    UPDATE public.game_play_advance_grants
    SET used_at = now()
    WHERE id = v_grant_id;
  ELSIF v_cost > 0 THEN
    v_spend := public.spend_game_stamina(v_cost);
    IF (v_spend->>'ok')::boolean IS DISTINCT FROM true THEN
      RETURN v_spend;
    END IF;
  END IF;

  INSERT INTO public.game_play_sessions (
    user_id,
    difficulty,
    charge_kind,
    stamina_spent,
    expires_at
  )
  VALUES (
    v_uid,
    p_difficulty,
    p_charge_kind,
    CASE WHEN p_charge_kind = 'none' THEN 0 ELSE v_cost END,
    now() + interval '4 hours'
  )
  RETURNING id INTO v_session_id;

  RETURN jsonb_build_object(
    'ok', true,
    'sessionId', v_session_id,
    'expiresAt', (now() + interval '4 hours')::timestamptz
  );
END;
$$;

-- ─── 驗證 session（抽題等；不 consume）──────────────────────────────────────

CREATE OR REPLACE FUNCTION public.assert_game_play_session(
  p_session_id uuid,
  p_difficulty text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.game_play_sessions%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'message', '請先登入');
  END IF;

  IF p_session_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'message', '缺少遊戲局次憑證');
  END IF;

  SELECT *
  INTO v_row
  FROM public.game_play_sessions s
  WHERE s.id = p_session_id
    AND s.user_id = v_uid;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'message', '遊戲局次無效');
  END IF;

  IF v_row.consumed_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'message', '此局遊戲已結束');
  END IF;

  IF v_row.expires_at <= now() THEN
    RETURN jsonb_build_object('ok', false, 'message', '遊戲局次已過期，請重新開始');
  END IF;

  IF v_row.difficulty IS DISTINCT FROM p_difficulty THEN
    RETURN jsonb_build_object('ok', false, 'message', '遊戲局次與難度不符');
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- ─── 結算後 consume ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.consume_game_play_session(p_session_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.game_play_sessions%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'message', '請先登入');
  END IF;

  SELECT *
  INTO v_row
  FROM public.game_play_sessions s
  WHERE s.id = p_session_id
    AND s.user_id = v_uid
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'message', '遊戲局次無效');
  END IF;

  IF v_row.consumed_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'message', '此局遊戲已結算');
  END IF;

  IF v_row.expires_at <= now() THEN
    RETURN jsonb_build_object('ok', false, 'message', '遊戲局次已過期');
  END IF;

  UPDATE public.game_play_sessions
  SET consumed_at = now()
  WHERE id = p_session_id;

  RETURN jsonb_build_object('ok', true, 'difficulty', v_row.difficulty);
END;
$$;

GRANT EXECUTE ON FUNCTION public.issue_game_advance_grant(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.begin_game_play_session(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assert_game_play_session(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_game_play_session(uuid) TO authenticated;
