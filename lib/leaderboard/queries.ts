/**
 * 排行榜資料（/leaderboard）
 * - 總經驗：依 exp 遞減
 * - 各難度小遊戲（quiz_user_stats）：
 *    1) 滿分（100）場次多者優先
 *    2) 場次相同：加權分 = 0.6×時間分量 + 0.4×（平均得分/100）；時間分量 = REF/(REF+平均每局作答秒)，愈快愈高
 *    3) 仍同分：平均每局作答秒數短者優先 → 平均得分高者 → user_id 字串序（穩定排序）
 */

import { createClient } from '@/lib/supabase/server';
import { QUIZ_QUESTIONS_PER_ROUND } from '@/lib/quiz/constants';
import {
  QUIZ_LEADERBOARD_LEVELS,
  type ExpLeaderboardEntry,
  type LeaderboardPageData,
  type QuizLeaderboardEntry,
} from '@/lib/leaderboard/types';
import type { Database } from '@/types/database.types';

export type { ExpLeaderboardEntry, LeaderboardPageData, QuizLeaderboardEntry } from '@/lib/leaderboard/types';
export { QUIZ_LEADERBOARD_LEVELS } from '@/lib/leaderboard/types';

type QuizUserStat = Database['public']['Views']['quiz_user_stats']['Row'];

/** 正規化「平均每局作答秒數」：約為「每題 60 秒 × 每局題數」量級 */
const AVG_GAME_SECONDS_REF = QUIZ_QUESTIONS_PER_ROUND * 60;

const TIE_TIME_WEIGHT = 0.6;
const TIE_SCORE_WEIGHT = 0.4;

const TIE_COMPOSITE_EPS = 1e-9;

function avgSecondsPerGame(s: QuizUserStat): number {
  const g = Math.max(s.games_played, 1);
  return s.total_answer_seconds / g;
}

/**
 * 滿分場次相同時的加權分（愈高愈佳）。
 * - 平均得分：0–100 → 線性映射至 [0, 0.4]
 * - 時間：平均每局秒數愈短愈佳 → REF/(REF+avgSec) 映射至 [0, 0.6]
 */
function quizTieBreakComposite(s: QuizUserStat): number {
  const avgScore = Number(s.avg_score);
  const avgSec = avgSecondsPerGame(s);
  const timeNorm = AVG_GAME_SECONDS_REF / (AVG_GAME_SECONDS_REF + avgSec);
  return TIE_SCORE_WEIGHT * (avgScore / 100) + TIE_TIME_WEIGHT * timeNorm;
}

function compareQuizStats(a: QuizUserStat, b: QuizUserStat): number {
  if (b.perfect_count !== a.perfect_count) {
    return b.perfect_count - a.perfect_count;
  }

  const ca = quizTieBreakComposite(a);
  const cb = quizTieBreakComposite(b);
  if (Math.abs(cb - ca) > TIE_COMPOSITE_EPS) return cb - ca;

  const secA = avgSecondsPerGame(a);
  const secB = avgSecondsPerGame(b);
  if (secA !== secB) return secA - secB;

  const scoreCmp = Number(b.avg_score) - Number(a.avg_score);
  if (scoreCmp !== 0) return scoreCmp;

  return a.user_id.localeCompare(b.user_id);
}

async function fetchProfilesMap(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ids: string[],
): Promise<Map<string, { display_name: string; avatar_url: string | null }>> {
  const unique = [...new Set(ids.filter(Boolean))];
  const map = new Map<string, { display_name: string; avatar_url: string | null }>();
  if (!unique.length) return map;
  const { data } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .in('id', unique);
  for (const p of data ?? []) {
    map.set(p.id, { display_name: p.display_name, avatar_url: p.avatar_url });
  }
  return map;
}

function toQuizEntry(
  stat: QuizUserStat,
  rank: number,
  names: Map<string, { display_name: string; avatar_url: string | null }>,
): QuizLeaderboardEntry {
  const meta = names.get(stat.user_id);
  return {
    rank,
    user_id: stat.user_id,
    display_name: meta?.display_name ?? '—',
    avatar_url: meta?.avatar_url ?? null,
    avg_score: Number(stat.avg_score),
    perfect_count: stat.perfect_count,
    total_answer_seconds: stat.total_answer_seconds,
    games_played: stat.games_played,
  };
}

export async function getLeaderboardPageData(): Promise<LeaderboardPageData> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: expRows } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, exp, level')
    .order('exp', { ascending: false })
    .order('id', { ascending: true })
    .limit(10);

  const expTop10: ExpLeaderboardEntry[] = (expRows ?? []).map((r, i) => ({
    rank: i + 1,
    id: r.id,
    display_name: r.display_name,
    avatar_url: r.avatar_url,
    exp: r.exp,
    level: r.level,
  }));

  let myExp: LeaderboardPageData['myExp'] = null;
  if (user) {
    const { data: me } = await supabase
      .from('profiles')
      .select('exp, level, display_name')
      .eq('id', user.id)
      .single();

    if (me) {
      const { count: higher } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gt('exp', me.exp);

      const { count: sameExpBefore } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('exp', me.exp)
        .lt('id', user.id);

      const rank = (higher ?? 0) + (sameExpBefore ?? 0) + 1;
      myExp = { rank, exp: me.exp, level: me.level, display_name: me.display_name };
    }
  }

  const quizByDifficulty = {} as LeaderboardPageData['quizByDifficulty'];

  for (const { id: diff } of QUIZ_LEADERBOARD_LEVELS) {
    const { data: statRows, error } = await supabase
      .from('quiz_user_stats')
      .select('*')
      .eq('difficulty', diff);

    if (error) {
      console.error('[leaderboard] quiz_user_stats', diff, error);
      quizByDifficulty[diff] = { top10: [], my: null };
      continue;
    }

    const list = [...(statRows ?? [])] as QuizUserStat[];
    list.sort(compareQuizStats);

    const needIds: string[] = [];
    for (const s of list.slice(0, 10)) needIds.push(s.user_id);
    if (user && !needIds.includes(user.id)) {
      const hasPlayed = list.some((s) => s.user_id === user.id);
      if (hasPlayed) needIds.push(user.id);
    }

    const names = await fetchProfilesMap(supabase, needIds);

    const top10: QuizLeaderboardEntry[] = list.slice(0, 10).map((s, idx) =>
      toQuizEntry(s, idx + 1, names),
    );

    let my: QuizLeaderboardEntry | null = null;
    if (user) {
      const idx = list.findIndex((s) => s.user_id === user.id);
      if (idx >= 0) {
        const s = list[idx]!;
        my = toQuizEntry(s, idx + 1, names);
      }
    }

    quizByDifficulty[diff] = { top10, my };
  }

  return {
    loggedIn: !!user,
    currentUserId: user?.id ?? null,
    expTop10,
    myExp,
    quizByDifficulty,
  };
}
