-- Stage 2 續關體力消耗：2 → 3

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
