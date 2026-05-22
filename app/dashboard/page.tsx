/**
 * Dashboard — Server Component
 *
 * 資料全部在 server 端抓取，不需要 useEffect / loading skeleton
 * 未登入會被 middleware 攔截，這裡只需要處理 profile 不存在的邊緣情況
 */
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  BookOpen,
  Flame,
  Trophy,
  CheckCircle2,
  Clock,
  GraduationCap,
  ArrowRight,
  FileText,
  Mic,
  Video,
  ImageIcon,
} from 'lucide-react';

import { createClient } from '@/lib/supabase/server';
import { xpForLevel, xpToNextLevel, levelProgress } from '@/types/database.types';
import type { AssignmentStatus, AssignmentType, CourseLevel } from '@/types/database.types';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge }    from '@/components/ui/badge';
import { Button }   from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

import { LevelBadge } from '@/components/gamification/level-badge';
import { XpBar }      from '@/components/gamification/xp-bar';
import { UserNav }    from './_components/user-nav';
import { calcCompletionRate } from '@/lib/utils';

// ─── Data fetching ──────────────────────────────────────────────────────────

async function getDashboardData(userId: string) {
  const supabase = await createClient();

  const [
    { data: enrollments },
    { data: recentAssignments },
    { count: completedCount },
    { data: progressRows },
  ] = await Promise.all([
    // 已報名課程（含課程基本資訊）
    supabase
      .from('enrollments')
      .select(`
        enrolled_at,
        course:courses(
          id, title, thumbnail_url, level, lesson_count,
          teacher:profiles!courses_teacher_id_fkey(display_name, avatar_url)
        )
      `)
      .eq('user_id', userId)
      .order('enrolled_at', { ascending: false })
      .limit(4),

    // 最近 5 份作業
    supabase
      .from('assignments')
      .select(`
        id, status, submitted_at, grade, type,
        lesson:lessons(
          title,
          course:courses(title)
        )
      `)
      .eq('student_id', userId)
      .order('submitted_at', { ascending: false })
      .limit(5),

    // 已完成課堂數
    supabase
      .from('user_progress')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('completed', true),

    // 各課程已完成課堂（透過 lessons 關聯 course_id）
    supabase
      .from('user_progress')
      .select('completed, lesson:lessons!inner(course_id)')
      .eq('user_id', userId)
      .eq('completed', true),
  ]);

  const completedByCourse: Record<string, number> = {};
  for (const row of progressRows ?? []) {
    const lesson = row.lesson as { course_id: string } | null;
    if (!lesson?.course_id) continue;
    completedByCourse[lesson.course_id] =
      (completedByCourse[lesson.course_id] ?? 0) + 1;
  }

  const enrolledLessonTotal = (enrollments ?? []).reduce((sum, e) => {
    const course = e.course as { lesson_count?: number } | null;
    return sum + (course?.lesson_count ?? 0);
  }, 0);

  return {
    enrollments:       enrollments ?? [],
    recentAssignments: recentAssignments ?? [],
    completedLessons:  completedCount  ?? 0,
    totalLessons:      enrolledLessonTotal,
    completedByCourse,
  };
}

// ─── Helper maps ────────────────────────────────────────────────────────────

const LEVEL_LABELS: Record<CourseLevel, string> = {
  beginner:     '入門',
  intermediate: '中級',
  advanced:     '高級',
};

const LEVEL_COLORS: Record<CourseLevel, string> = {
  beginner:     'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  intermediate: 'bg-blue-100  text-blue-700  dark:bg-blue-900/30  dark:text-blue-400',
  advanced:     'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
};

const STATUS_CONFIG: Record<AssignmentStatus, { label: string; color: string }> = {
  submitted: { label: '待批改', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  grading:   { label: '批改中', color: 'bg-blue-100  text-blue-700  dark:bg-blue-900/30  dark:text-blue-400'  },
  graded:    { label: '已批改', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'  },
  returned:  { label: '已退回', color: 'bg-red-100   text-red-700   dark:bg-red-900/30   dark:text-red-400'    },
};

const TYPE_ICON: Record<AssignmentType, React.ReactNode> = {
  text:  <FileText className="h-3.5 w-3.5" />,
  audio: <Mic      className="h-3.5 w-3.5" />,
  video: <Video    className="h-3.5 w-3.5" />,
  image: <ImageIcon className="h-3.5 w-3.5" />,
  pdf:   <FileText className="h-3.5 w-3.5" />,
};

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  // Single auth call — createClient is called once, user + profile fetched in parallel.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Fetch profile in parallel with the user check result already in hand.
  // No second getUser() call needed.
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  let profile = existingProfile;

  if (!profile) {
    const displayName =
      user.user_metadata?.full_name ??
      user.user_metadata?.name ??
      user.email?.split('@')[0] ??
      '學習者';

    const { data: newProfile } = await supabase
      .from('profiles')
      .upsert({
        id:           user.id,
        display_name: displayName,
        role:         'student',
      })
      .select()
      .single();

    profile = newProfile;
  }

  if (!profile) {
    // profiles 表不存在（schema 未套用），顯示提示而非無限 redirect
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-8">
        <div className="max-w-md text-center space-y-4">
          <div className="text-4xl">⚠️</div>
          <h1 className="text-xl font-bold">資料庫尚未初始化</h1>
          <p className="text-muted-foreground text-sm">
            請到 Supabase Dashboard → SQL Editor，執行專案根目錄的{' '}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">supabase/schema.sql</code>{' '}
            以建立所需資料表。
          </p>
        </div>
      </div>
    );
  }

  const {
    enrollments,
    recentAssignments,
    completedLessons,
    totalLessons,
    completedByCourse,
  } = await getDashboardData(profile.id);

  // XP / Level計算
  const xpPct     = Math.round(levelProgress(profile.exp, profile.level) * 100);
  const toNextXP  = xpToNextLevel(profile.exp, profile.level);
  const currentXP = profile.exp - xpForLevel(profile.level);
  const neededXP  = xpForLevel(profile.level + 1) - xpForLevel(profile.level);

  const completionPct = totalLessons > 0
    ? Math.round((completedLessons / totalLessons) * 100)
    : 0;

  const initials = profile.display_name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const timeGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return '早安';
    if (h < 18) return '午安';
    return '晚安';
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">

        {/* ── Top bar ──────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BookOpen className="h-4 w-4" />
            <span>我的學習中心</span>
          </div>
          <UserNav
            displayName={profile.display_name}
            avatarUrl={profile.avatar_url}
            email={user.email ?? ''}
          />
        </div>

        {/* ── Hero card ─────────────────────────────────────────── */}
        <Card className="overflow-hidden border-border/60 shadow-sm">
          <div className="relative bg-gradient-to-br from-primary via-primary/90 to-primary/70 p-6 text-primary-foreground">
            {/* Dot pattern */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-10"
              style={{
                backgroundImage:
                  'radial-gradient(circle, white 1px, transparent 1px)',
                backgroundSize: '24px 24px',
              }}
            />

            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              {/* Left: greeting */}
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border-4 border-white/30 shadow-lg">
                  <AvatarImage src={profile.avatar_url ?? undefined} alt={profile.display_name} />
                  <AvatarFallback className="bg-white/20 text-white text-xl font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>

                <div className="space-y-1">
                  <p className="text-sm text-primary-foreground/70">{timeGreeting()}，</p>
                  <h1 className="text-2xl font-bold leading-tight">{profile.display_name}</h1>
                  <div className="flex items-center gap-2">
                    <LevelBadge level={profile.level} size="md" showLabel />
                  </div>
                </div>
              </div>

              {/* Right: streak */}
              <div className="flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2.5 backdrop-blur-sm ring-1 ring-white/20 self-start sm:self-auto">
                <Flame className="h-5 w-5 text-orange-300" />
                <div>
                  <p className="text-lg font-bold leading-none">{profile.streak_days}</p>
                  <p className="text-[11px] text-primary-foreground/70 mt-0.5">連續天數</p>
                </div>
              </div>
            </div>

            {/* XP bar */}
            <div className="relative mt-5 space-y-1.5">
              <div className="flex justify-between text-xs text-primary-foreground/70">
                <span>經驗值 {currentXP} / {neededXP} XP</span>
                <span>距離下一級還差 {toNextXP} XP</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-white transition-all duration-700"
                  style={{ width: `${xpPct}%` }}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* ── Stats row ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            {
              icon:  <BookOpen    className="h-5 w-5 text-primary" />,
              label: '已報名課程',
              value: enrollments.length,
              unit:  '門',
            },
            {
              icon:  <CheckCircle2 className="h-5 w-5 text-green-500" />,
              label: '已完成課堂',
              value: completedLessons,
              unit:  '堂',
            },
            {
              icon:  <GraduationCap className="h-5 w-5 text-blue-500" />,
              label: '提交作業',
              value: recentAssignments.length,
              unit:  '份',
            },
            {
              icon:  <Trophy className="h-5 w-5 text-amber-500" />,
              label: '累積 XP',
              value: profile.total_xp_earned,
              unit:  'XP',
            },
          ].map(({ icon, label, value, unit }) => (
            <Card key={label} className="border-border/60 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="rounded-lg bg-muted p-2">{icon}</div>
                </div>
                <div className="mt-3">
                  <p className="text-2xl font-bold">{value.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {unit} {label}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Main content (2 col) ──────────────────────────────── */}
        <div className="grid gap-6 lg:grid-cols-5">

          {/* Left: Courses (3/5) */}
          <div className="space-y-4 lg:col-span-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">繼續學習</h2>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/courses" className="gap-1 text-xs">
                  瀏覽所有課程 <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>

            {enrollments.length === 0 ? (
              <Card className="border-dashed border-border/60">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <BookOpen className="h-10 w-10 text-muted-foreground/40 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">還沒有報名任何課程</p>
                  <Button size="sm" className="mt-4" asChild>
                    <Link href="/courses">探索課程</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {enrollments.map((enrollment, i) => {
                  const course = enrollment.course as {
                    id: string;
                    title: string;
                    thumbnail_url: string | null;
                    level: CourseLevel;
                    lesson_count: number;
                    teacher: { display_name: string; avatar_url: string | null } | null;
                  } | null;
                  if (!course) return null;

                  const courseCompleted = completedByCourse[course.id] ?? 0;
                  const courseTotal = course.lesson_count || 0;
                  const coursePct = calcCompletionRate(
                    courseCompleted,
                    courseTotal,
                  );

                  return (
                    <Link key={i} href={`/courses/${course.id}`}>
                      <Card className="group cursor-pointer border-border/60 shadow-sm transition-all hover:shadow-md hover:border-primary/30">
                        <CardContent className="p-4">
                          <div className="flex gap-4">
                            {/* Thumbnail */}
                            <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-muted">
                              {course.thumbnail_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={course.thumbnail_url}
                                  alt={course.title}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                  <BookOpen className="h-6 w-6 text-muted-foreground/40" />
                                </div>
                              )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0 space-y-1.5">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-semibold leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                                  {course.title}
                                </p>
                                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${LEVEL_COLORS[course.level]}`}>
                                  {LEVEL_LABELS[course.level]}
                                </span>
                              </div>

                              {course.teacher && (
                                <p className="text-xs text-muted-foreground">
                                  {course.teacher.display_name}
                                </p>
                              )}

                              <div className="flex items-center gap-2">
                                <Progress value={coursePct} className="h-1.5 flex-1" />
                                <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                                  {courseCompleted} / {courseTotal} 堂
                                </span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Overall progress */}
            {totalLessons > 0 && (
              <Card className="border-border/60 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium">整體學習完成度</p>
                    <span className="text-sm font-bold text-primary">{completionPct}%</span>
                  </div>
                  <Progress value={completionPct} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1.5">
                    共完成 {completedLessons} / {totalLessons} 堂課
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right: Assignments + Quick actions (2/5) */}
          <div className="space-y-4 lg:col-span-2">

            {/* Recent assignments */}
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">最近作業</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {recentAssignments.length === 0 ? (
                  <div className="flex flex-col items-center py-8 text-center px-4">
                    <Clock className="h-8 w-8 text-muted-foreground/40 mb-2" />
                    <p className="text-xs text-muted-foreground">尚未提交任何作業</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-border">
                    {recentAssignments.map((a) => {
                      const lesson = a.lesson as {
                        title: string;
                        course: { title: string } | null;
                      } | null;
                      const statusCfg = STATUS_CONFIG[a.status as AssignmentStatus];

                      return (
                        <li key={a.id} className="flex items-start gap-3 px-4 py-3">
                          <div className="mt-0.5 rounded-md bg-muted p-1.5 text-muted-foreground">
                            {TYPE_ICON[a.type as AssignmentType]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium line-clamp-1">
                              {lesson?.title ?? '未知課堂'}
                            </p>
                            <p className="text-[11px] text-muted-foreground line-clamp-1">
                              {lesson?.course?.title ?? ''}
                            </p>
                            <div className="mt-1 flex items-center gap-1.5">
                              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${statusCfg.color}`}>
                                {statusCfg.label}
                              </span>
                              {a.grade != null && (
                                <span className="text-[11px] font-semibold text-foreground">
                                  {a.grade} 分
                                </span>
                              )}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>

            {/* Quick actions */}
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">快速入口</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-2">
                {[
                  { href: '/courses',          icon: <BookOpen       className="h-4 w-4" />, label: '課程目錄' },
                  { href: '/profile',          icon: <GraduationCap  className="h-4 w-4" />, label: '個人資料' },
                  { href: '/leaderboard',      icon: <Trophy         className="h-4 w-4" />, label: '排行榜'   },
                  { href: '/profile/settings', icon: <Flame          className="h-4 w-4" />, label: '帳號設定' },
                ].map(({ href, icon, label }) => (
                  <Button
                    key={href}
                    variant="outline"
                    size="sm"
                    className="justify-start gap-2 h-9 text-xs"
                    asChild
                  >
                    <Link href={href}>
                      {icon}
                      {label}
                    </Link>
                  </Button>
                ))}
              </CardContent>
            </Card>

          </div>
        </div>

        <Separator />

        {/* Footer note */}
        <p className="text-center text-xs text-muted-foreground">
          LinguaLearn · {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
