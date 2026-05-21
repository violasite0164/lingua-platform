'use client';

import Link from 'next/link';
import { Medal } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  QUIZ_LEADERBOARD_LEVELS,
  type LeaderboardPageData,
  type QuizLeaderboardEntry,
} from '@/lib/leaderboard/types';
import { cn } from '@/lib/utils';

function formatAvgScore100(n: number): string {
  if (!Number.isFinite(n)) return '—';
  const r = Math.round(n * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

function formatAnswerDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  if (s < 60) return `${s} 秒`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m < 60) return r > 0 ? `${m} 分 ${r} 秒` : `${m} 分`;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return mm > 0 ? `${h} 小時 ${mm} 分` : `${h} 小時`;
}

function avgSecondsPerGame(row: QuizLeaderboardEntry): number {
  const g = Math.max(1, Math.floor(row.games_played));
  const t = Number(row.total_answer_seconds);
  if (!Number.isFinite(t) || t < 0) return 0;
  return t / g;
}

function RankCell({ rank }: { rank: number }) {
  if (rank === 1)
    return <span className="inline-flex w-8 justify-center text-lg">🥇</span>;
  if (rank === 2)
    return <span className="inline-flex w-8 justify-center text-lg">🥈</span>;
  if (rank === 3)
    return <span className="inline-flex w-8 justify-center text-lg">🥉</span>;
  return (
    <span className="inline-flex w-8 justify-center tabular-nums text-muted-foreground">
      {rank}
    </span>
  );
}

function initials(name: string): string {
  const t = name.trim();
  if (!t) return '?';
  return t.slice(0, 2);
}

function QuizRow({
  row,
  highlight,
}: {
  row: QuizLeaderboardEntry;
  highlight?: boolean;
}) {
  return (
    <tr
      className={cn(
        'border-b border-border/60 last:border-0',
        highlight && 'bg-primary/5',
      )}
    >
      <td className="py-2.5 pr-2 align-middle">
        <RankCell rank={row.rank} />
      </td>
      <td className="py-2.5 pr-3 align-middle">
        <div className="flex items-center gap-2 min-w-0">
          <Avatar className="h-8 w-8">
            <AvatarImage src={row.avatar_url ?? undefined} alt="" />
            <AvatarFallback className="text-xs">{initials(row.display_name)}</AvatarFallback>
          </Avatar>
          <span className="truncate font-medium">{row.display_name}</span>
        </div>
      </td>
      <td className="py-2.5 px-2 text-right tabular-nums align-middle">
        {formatAvgScore100(row.avg_score)}
      </td>
      <td className="py-2.5 px-2 text-right tabular-nums align-middle">
        {row.perfect_count}
      </td>
      <td className="py-2.5 px-2 text-right whitespace-nowrap align-middle text-muted-foreground">
        {formatAnswerDuration(avgSecondsPerGame(row))}
      </td>
      <td className="py-2.5 pl-2 text-right tabular-nums align-middle text-muted-foreground">
        {row.games_played}
      </td>
    </tr>
  );
}

/** 各難度第一名：固定顯示在分頁籤上方 */
function QuizChampionsStrip({
  quizByDifficulty,
}: {
  quizByDifficulty: LeaderboardPageData['quizByDifficulty'];
}) {
  return (
    <div className="mb-6 rounded-xl border bg-gradient-to-b from-amber-500/10 to-muted/20 p-4 dark:from-amber-500/5">
      <p className="mb-3 text-center text-xs font-semibold tracking-wide text-muted-foreground">
        各級榜首
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {QUIZ_LEADERBOARD_LEVELS.map((lv) => {
          const first = quizByDifficulty[lv.id].top10[0];
          return (
            <div
              key={lv.id}
              className="flex flex-col items-center gap-1.5 rounded-lg border border-border/80 bg-card/90 px-2 py-3 text-center shadow-sm"
            >
              <span className="text-[11px] font-medium uppercase text-muted-foreground">
                {lv.short}
              </span>
              {first ? (
                <>
                  <span className="text-lg leading-none" aria-hidden>
                    🥇
                  </span>
                  <Avatar className="h-11 w-11 border border-amber-500/30">
                    <AvatarImage src={first.avatar_url ?? undefined} alt="" />
                    <AvatarFallback className="text-xs">{initials(first.display_name)}</AvatarFallback>
                  </Avatar>
                  <span className="line-clamp-2 min-h-[2.5rem] max-w-full px-1 text-sm font-semibold leading-snug">
                    {first.display_name}
                  </span>
                  <span className="text-[11px] tabular-nums text-muted-foreground">
                    平均 {formatAvgScore100(first.avg_score)}
                  </span>
                </>
              ) : (
                <p className="py-6 text-xs text-muted-foreground">暫無紀錄</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function QuizPanel({
  loggedIn,
  top10,
  my,
}: {
  loggedIn: boolean;
  top10: QuizLeaderboardEntry[];
  my: QuizLeaderboardEntry | null;
}) {
  return (
    <div className="space-y-4">
      {loggedIn && my && (
        <div className="rounded-lg border border-primary/40 bg-primary/5 px-4 py-3 flex flex-wrap items-center gap-3">
          <Medal className="h-5 w-5 shrink-0 text-primary" aria-hidden />
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-semibold">我的排名</span>
            <span className="text-2xl font-bold tabular-nums text-primary">第 {my.rank} 名</span>
            <span className="text-sm text-muted-foreground">
              平均 {formatAvgScore100(my.avg_score)} · 滿分 {my.perfect_count} 次 · 平均作答{' '}
              {formatAnswerDuration(avgSecondsPerGame(my))}
            </span>
          </div>
        </div>
      )}

      {loggedIn && !my && (
        <p className="text-sm text-muted-foreground rounded-md border border-dashed px-3 py-2">
          你尚未在此難度留下紀錄。前往{' '}
          <Link href="/quiz" className="text-primary underline underline-offset-2">
            AI英語鬥
          </Link>{' '}
          開始一局即可上榜。
        </p>
      )}

      {!loggedIn && (
        <p className="text-sm text-muted-foreground rounded-md border border-dashed px-3 py-2">
          <Link href="/login" className="text-primary underline underline-offset-2">
            登入
          </Link>{' '}
          後可在此查看你的名次與統計。
        </p>
      )}

      {top10.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          尚無紀錄。當第一位挑戰者吧 —{' '}
          <Link href="/quiz" className="text-primary underline underline-offset-2">
            前往 AI英語鬥
          </Link>
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                <th className="py-2 pl-3 pr-2 font-medium w-10">#</th>
                <th className="py-2 pr-3 font-medium">玩家</th>
                <th className="py-2 px-2 font-medium text-right whitespace-nowrap">平均得分</th>
                <th className="py-2 px-2 font-medium text-right whitespace-nowrap">滿分次數</th>
                <th className="py-2 px-2 font-medium text-right whitespace-nowrap">平均作答</th>
                <th className="py-2 pl-2 pr-3 font-medium text-right whitespace-nowrap">場次</th>
              </tr>
            </thead>
            <tbody>
              {top10.map((row) => (
                <QuizRow
                  key={row.user_id}
                  row={row}
                  highlight={loggedIn && my?.user_id === row.user_id}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

type Props = {
  quizByDifficulty: LeaderboardPageData['quizByDifficulty'];
  loggedIn: boolean;
};

export function QuizLeaderboardTabs({ quizByDifficulty, loggedIn }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Medal className="h-5 w-5 text-primary" />
            AI英語鬥 · 各難度排行
        </CardTitle>
        <CardDescription>
          先依滿分（100）場次（多者優先）；場次相同時再依加權分：時間 60%（平均每局作答愈快愈佳）＋ 平均得分 40%；仍同分則依平均每局作答秒數、平均得分依序決定。下方為各級第一名速覽，分頁內為前十名詳表。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <QuizChampionsStrip quizByDifficulty={quizByDifficulty} />
        <Tabs defaultValue="elementary" className="w-full">
          <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-muted/80 p-1">
            {QUIZ_LEADERBOARD_LEVELS.map((lv) => (
              <TabsTrigger key={lv.id} value={lv.id} className="flex-1 min-w-[5rem] sm:flex-none">
                {lv.short}
              </TabsTrigger>
            ))}
          </TabsList>
          {QUIZ_LEADERBOARD_LEVELS.map((lv) => {
            const { top10, my } = quizByDifficulty[lv.id];
            return (
              <TabsContent key={lv.id} value={lv.id} className="mt-4">
                <p className="text-xs text-muted-foreground mb-3">{lv.label}</p>
                <QuizPanel loggedIn={loggedIn} top10={top10} my={my} />
              </TabsContent>
            );
          })}
        </Tabs>
      </CardContent>
    </Card>
  );
}
