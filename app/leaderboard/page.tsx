import type { Metadata } from 'next';
import Link from 'next/link';
import { Flame, Trophy } from 'lucide-react';

import { QuizLeaderboardTabs } from '@/components/leaderboard/quiz-leaderboard-tabs';
import { LevelBadge } from '@/components/gamification/level-badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { getLeaderboardPageData } from '@/lib/leaderboard/queries';
import type { ExpLeaderboardEntry } from '@/lib/leaderboard/types';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: '排行榜',
  description: '總經驗與 AI英語鬥 各難度排行榜。',
};

function RankMark({ rank }: { rank: number }) {
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

function ExpRow({ row, highlight }: { row: ExpLeaderboardEntry; highlight?: boolean }) {
  return (
    <tr
      className={cn(
        'border-b border-border/60 last:border-0',
        highlight && 'bg-primary/5',
      )}
    >
      <td className="py-2.5 pr-2 align-middle">
        <RankMark rank={row.rank} />
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
      <td className="py-2.5 px-2 align-middle">
        <LevelBadge level={row.level} size="sm" />
      </td>
      <td className="py-2.5 pl-2 text-right tabular-nums font-medium align-middle">
        {row.exp.toLocaleString()}
      </td>
    </tr>
  );
}

export default async function LeaderboardPage() {
  const data = await getLeaderboardPageData();
  const { loggedIn, currentUserId, expTop10, myExp, quizByDifficulty } = data;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 md:py-12 space-y-10">
      <header>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Trophy className="h-8 w-8 text-amber-500" aria-hidden />
          排行榜
        </h1>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            總經驗排行榜
          </CardTitle>
          <CardDescription>依累積經驗值（EXP）排序，顯示前十名。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loggedIn && myExp && (
            <div className="rounded-lg border border-primary/40 bg-primary/5 px-4 py-3 flex flex-wrap items-center gap-3">
              <Trophy className="h-5 w-5 shrink-0 text-primary" aria-hidden />
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-semibold">我的排名</span>
                <span className="text-2xl font-bold tabular-nums text-primary">
                  第 {myExp.rank} 名
                </span>
                <span className="text-sm text-muted-foreground">
                  {myExp.display_name} · Lv.{myExp.level} · {myExp.exp.toLocaleString()} EXP
                </span>
              </div>
            </div>
          )}

          {!loggedIn && (
            <p className="text-sm text-muted-foreground rounded-md border border-dashed px-3 py-2">
              <Link href="/login" className="text-primary underline underline-offset-2">
                登入
              </Link>{' '}
              後可在此查看你的經驗排名。
            </p>
          )}

          {expTop10.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">尚無玩家資料。</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full min-w-[320px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                    <th className="py-2 pl-3 pr-2 font-medium w-10">#</th>
                    <th className="py-2 pr-3 font-medium">玩家</th>
                    <th className="py-2 px-2 font-medium">等級</th>
                    <th className="py-2 pl-2 pr-3 font-medium text-right">EXP</th>
                  </tr>
                </thead>
                <tbody>
                  {expTop10.map((row) => (
                    <ExpRow
                      key={row.id}
                      row={row}
                      highlight={!!currentUserId && row.id === currentUserId}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <QuizLeaderboardTabs quizByDifficulty={quizByDifficulty} loggedIn={loggedIn} />
    </div>
  );
}
