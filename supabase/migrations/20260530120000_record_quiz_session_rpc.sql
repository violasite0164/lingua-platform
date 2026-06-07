-- 英語大冒險結算：單一 RPC（寫入 + 名次 + 最高分 + XP），避免讀全表 quiz_user_stats

CREATE OR REPLACE FUNCTION public.quiz_user_stat_rank(
  p_difficulty text,
  p_user_id uuid
)
RETURNS TABLE(user_rank integer, total_players integer)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH ordered AS (
    SELECT
      s.user_id,
      ROW_NUMBER() OVER (
        ORDER BY
          s.perfect_count DESC,
          (
            0.4 * (s.avg_score / 100.0)
            + 0.6 * (
              900.0
              / (900.0 + s.total_answer_seconds / greatest(s.games_played, 1))
            )
          ) DESC,
          (s.total_answer_seconds / greatest(s.games_played, 1)) ASC,
          s.avg_score DESC,
          s.user_id::text ASC
      ) AS rk
    FROM public.quiz_user_stats s
    WHERE s.difficulty = p_difficulty
  )
  SELECT
    (SELECT o.rk::integer FROM ordered o WHERE o.user_id = p_user_id),
    coalesce((SELECT count(*)::integer FROM ordered), 0);
$$;

COMMENT ON FUNCTION public.quiz_user_stat_rank(text, uuid) IS
  '英語大冒險排行榜名次（與 lib/quiz/actions compareQuizStats 排序一致）';

CREATE OR REPLACE FUNCTION public.record_quiz_session(
  p_difficulty text,
  p_correct_count smallint,
  p_total_questions smallint,
  p_total_answer_seconds double precision
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_xp_per_correct smallint;
  v_xp_earned integer;
  v_exp integer;
  v_total_xp_earned integer;
  v_level integer;
  v_previous_best smallint;
  v_new_best smallint;
  v_new_exp integer;
  v_new_level integer;
  v_score100 smallint;
  v_ratio numeric;
  v_avg_sec_per_q double precision;
  v_speed_factor double precision;
  v_previous_rank integer;
  v_new_rank integer;
  v_total_before integer;
  v_total_after integer;
  v_rank_delta integer;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'loggedIn', false);
  END IF;

  IF p_difficulty NOT IN ('elementary', 'junior', 'college', 'professor') THEN
    RETURN jsonb_build_object('ok', false, 'message', '難度參數無效。');
  END IF;

  IF p_total_questions < 1
     OR p_correct_count < 0
     OR p_correct_count > p_total_questions THEN
    RETURN jsonb_build_object('ok', false, 'message', '分數參數無效。');
  END IF;

  IF p_total_answer_seconds IS NULL
     OR p_total_answer_seconds < 0
     OR p_total_answer_seconds < p_total_questions * 0.25
     OR p_total_answer_seconds > p_total_questions * 180 THEN
    RETURN jsonb_build_object('ok', false, 'message', '作答時間異常，請勿修改請求參數。');
  END IF;

  v_xp_per_correct := CASE p_difficulty
    WHEN 'elementary' THEN 5
    WHEN 'junior' THEN 8
    WHEN 'college' THEN 12
    WHEN 'professor' THEN 15
  END;
  v_xp_earned := p_correct_count * v_xp_per_correct;

  -- 與 lib/quiz/score-formula computeQuizScore100 一致
  v_ratio := p_correct_count::numeric / p_total_questions;
  v_avg_sec_per_q := p_total_answer_seconds / p_total_questions;
  v_speed_factor := greatest(
    0,
    least(1, (55.0 - v_avg_sec_per_q) / (55.0 - 5.0))
  );
  v_score100 := round(65 * v_ratio + 35 * v_speed_factor)::smallint;
  v_score100 := greatest(0, least(100, v_score100))::smallint;

  SELECT p.exp, p.total_xp_earned, p.level, coalesce(uqs.best_score, 0)
  INTO v_exp, v_total_xp_earned, v_level, v_previous_best
  FROM public.profiles p
  LEFT JOIN public.user_quiz_scores uqs
    ON uqs.user_id = p.id AND uqs.difficulty = p_difficulty
  WHERE p.id = v_uid
  FOR UPDATE OF p;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'message', '讀取使用者資料失敗。');
  END IF;

  SELECT r.user_rank, r.total_players
  INTO v_previous_rank, v_total_before
  FROM public.quiz_user_stat_rank(p_difficulty, v_uid) r;

  INSERT INTO public.quiz_attempts (
    user_id,
    difficulty,
    score100,
    total_questions,
    correct_count,
    total_answer_seconds
  ) VALUES (
    v_uid,
    p_difficulty,
    v_score100,
    p_total_questions,
    p_correct_count,
    p_total_answer_seconds
  );

  SELECT r.user_rank, r.total_players
  INTO v_new_rank, v_total_after
  FROM public.quiz_user_stat_rank(p_difficulty, v_uid) r;

  v_new_rank := coalesce(v_new_rank, greatest(1, v_total_after));
  v_rank_delta := CASE
    WHEN v_previous_rank IS NULL THEN NULL
    ELSE v_previous_rank - v_new_rank
  END;

  v_new_best := greatest(v_previous_best, v_score100);

  IF EXISTS (
    SELECT 1 FROM public.user_quiz_scores
    WHERE user_id = v_uid AND difficulty = p_difficulty
  ) THEN
    UPDATE public.user_quiz_scores
    SET best_score = v_new_best, updated_at = now()
    WHERE user_id = v_uid AND difficulty = p_difficulty;
  ELSE
    INSERT INTO public.user_quiz_scores (user_id, difficulty, best_score)
    VALUES (v_uid, p_difficulty, v_new_best);
  END IF;

  v_new_exp := v_exp + v_xp_earned;
  v_new_level := greatest(
    1,
    floor((1 + sqrt(1 + (8 * v_new_exp::numeric / 100))) / 2)::integer
  );

  UPDATE public.profiles
  SET
    exp = v_new_exp,
    total_xp_earned = v_total_xp_earned + v_xp_earned,
    level = v_new_level,
    updated_at = now()
  WHERE id = v_uid;

  RETURN jsonb_build_object(
    'ok', true,
    'loggedIn', true,
    'xpEarned', v_xp_earned,
    'previousBest', v_previous_best,
    'newBest', v_new_best,
    'newExp', v_new_exp,
    'newLevel', v_new_level,
    'previousRank', v_previous_rank,
    'newRank', v_new_rank,
    'rankDelta', v_rank_delta,
    'totalPlayers', greatest(v_total_after, v_total_before)
  );
EXCEPTION
  WHEN check_violation THEN
    RETURN jsonb_build_object(
      'ok', false,
      'message',
      '儲存最高分失敗：資料表限制與目前計分（0–100）不符。若資料庫仍為舊版 best_score 上限 10，請在 Supabase SQL 執行 supabase/quiz_score100_alter.sql。'
    );
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'ok', false,
      'message',
      '結算失敗：' || SQLERRM
    );
END;
$$;

COMMENT ON FUNCTION public.record_quiz_session(text, smallint, smallint, double precision) IS
  '英語大冒險一局結算：寫入 quiz_attempts、更新最高分與 XP，並回傳排行榜名次';

GRANT EXECUTE ON FUNCTION public.quiz_user_stat_rank(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_quiz_session(text, smallint, smallint, double precision) TO authenticated;
