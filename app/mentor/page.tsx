import Link from 'next/link';
import { BookOpen, ClipboardList, Users, Video } from 'lucide-react';

import { requireMentor } from '@/lib/mentor/auth';
import { getMentorDashboardStats } from '@/lib/mentor/queries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default async function MentorDashboardPage() {
  const profile = await requireMentor();
  const stats = await getMentorDashboardStats(profile.id);

  const tiles = [
    {
      label: '我的課程',
      value: stats.totalCourses,
      icon: BookOpen,
      hint: '已建立的課程數',
    },
    {
      label: '註冊學員（累計）',
      value: stats.totalStudents,
      icon: Users,
      hint: '所有課程加總人次',
    },
    {
      label: '課堂數',
      value: stats.totalLessons,
      icon: Video,
      hint: '課程內單元總數',
    },
    {
      label: '待審作業',
      value: stats.pendingAssignments,
      icon: ClipboardList,
      hint: '待批改 / 批改中',
      href: '/mentor/assignments',
    },
  ] as const;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            嗨，{profile.display_name || '導師'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            管理課程、影片與學員作業。儀表板數據會隨課程更新。
          </p>
        </div>
        <Button
          asChild
          className="bg-emerald-600 text-white hover:bg-emerald-500"
        >
          <Link href="/mentor/courses/new">新增課程</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map((t) => (
          <Card key={t.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t.label}
              </CardTitle>
              <t.icon className="h-4 w-4 text-emerald-600 dark:text-emerald-400/90" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tabular-nums text-foreground">
                {t.value}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{t.hint}</p>
              {'href' in t && t.href ? (
                <Link
                  href={t.href}
                  className="mt-3 inline-block text-xs font-medium text-emerald-600 hover:underline dark:text-emerald-400"
                >
                  前往處理 →
                </Link>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">快速開始</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          <span>1. 建立課程並上傳封面</span>
          <span className="hidden sm:inline">·</span>
          <span>2. 新增單元並上傳 Cloudflare Stream 影片</span>
          <span className="hidden sm:inline">·</span>
          <span>3. 發布課程並在「作業審核」批改學員繳交</span>
        </CardContent>
      </Card>
    </div>
  );
}
