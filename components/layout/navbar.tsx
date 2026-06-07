'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import {
  ChevronsDown,
  ChevronsUp,
  Flame,
  LogOut,
  Menu,
  Moon,
  Settings,
  Sun,
  Trophy,
  User,
  X,
  Inbox,
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LevelBadge } from '@/components/gamification/level-badge';
import { MarketingThemeCycleButton } from '@/components/marketing-theme-cycle-button';
import { XpBar } from '@/components/gamification/xp-bar';
import { fetchProfileInboxUnreadCountClient } from '@/lib/profile/inbox-client';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/types/database.types';
import type {
  ProfileSubscriptionRow,
  SubscriptionPlanMeta,
} from '@/lib/profile/subscription-display';
import { PlatformBrandMark } from '@/components/layout/platform-brand-mark';
import { Badge } from '@/components/ui/badge';
import { useFooterVisibility } from '@/components/providers/footer-visibility-provider';
import { GUEST_HOME_PATH } from '@/lib/site-routes';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
  { href: '/dashboard',   label: '學習進度' },
  { href: '/courses',     label: '課程' },
  { href: '/commerce',    label: '訂閱與商店' },
  { href: '/games',       label: '英語大冒險' },
  { href: '/leaderboard', label: '排行榜' },
];

function navHrefPath(href: string): string {
  return href.split('#')[0] ?? href;
}

function isNavLinkActive(pathname: string, link: (typeof NAV_LINKS)[number]): boolean {
  const base = navHrefPath(link.href);
  if (link.href === '/games') {
    return pathname.startsWith('/games') || pathname.startsWith('/quiz');
  }
  if (base === '/commerce') {
    return pathname.startsWith('/commerce');
  }
  return pathname.startsWith(base);
}

type NavbarProps = {
  /** 由 Server Component 注入，避免客戶端 session 與 cookie 不同步時誤顯示「登入」 */
  initialProfile?: Profile | null;
  initialSubscriptions?: ProfileSubscriptionRow[];
  initialPlanMeta?: SubscriptionPlanMeta[];
};

export function Navbar({
  initialProfile = null,
  initialSubscriptions = [],
  initialPlanMeta = [],
}: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const { footerVisible, toggleFooter } = useFooterVisibility();
  const [profile, setProfile] = useState<Profile | null>(initialProfile);
  const [subscriptions, setSubscriptions] =
    useState<ProfileSubscriptionRow[]>(initialSubscriptions);
  const [planMeta, setPlanMeta] = useState<SubscriptionPlanMeta[]>(initialPlanMeta);
  const [inboxUnread, setInboxUnread] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [themeMounted, setThemeMounted] = useState(false);
  const [hideForMobileLandscapeGame, setHideForMobileLandscapeGame] = useState(false);
  const supabase = createClient();

  const refreshProfile = useCallback(async () => {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) {
      setProfile(null);
      setSubscriptions([]);
      setPlanMeta([]);
      setInboxUnread(0);
      return;
    }
    const [{ data }, { data: subRows }, { data: planRows }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase
        .from('user_subscriptions')
        .select('plan_code, status, current_period_end, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false }),
      supabase
        .from('subscription_plans')
        .select('code, title, description')
        .eq('is_active', true)
        .order('sort_order', { ascending: true }),
    ]);
    if (data) setProfile(data);
    setSubscriptions(
      (subRows ?? []).map((row) => ({
        plan_code: row.plan_code,
        status: row.status,
        current_period_end: row.current_period_end,
        updated_at: row.updated_at,
      })),
    );
    setPlanMeta(
      (planRows ?? []).map((row) => ({
        code: row.code,
        title: row.title,
        description: row.description,
      })),
    );
    if (data) {
      try {
        const count = await fetchProfileInboxUnreadCountClient();
        setInboxUnread(count);
      } catch {
        setInboxUnread(0);
      }
    } else {
      setInboxUnread(0);
    }
  }, [supabase]);

  useEffect(() => {
    setThemeMounted(true);
  }, []);

  useEffect(() => {
    setProfile(initialProfile);
  }, [initialProfile]);

  useEffect(() => {
    setSubscriptions(initialSubscriptions);
  }, [initialSubscriptions]);

  useEffect(() => {
    setPlanMeta(initialPlanMeta);
  }, [initialPlanMeta]);

  useEffect(() => {
    void refreshProfile();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session?.user) {
        setProfile(null);
        setSubscriptions([]);
        setPlanMeta([]);
        setInboxUnread(0);
        return;
      }
      if (
        event === 'SIGNED_IN' ||
        event === 'TOKEN_REFRESHED' ||
        event === 'INITIAL_SESSION' ||
        event === 'USER_UPDATED'
      ) {
        void refreshProfile();
      }
    });
    return () => listener.subscription.unsubscribe();
  }, [supabase, refreshProfile]);

  useEffect(() => {
    if (!profile) return;
    if (pathname === '/profile') {
      void fetch('/api/profile/inbox/unread', { cache: 'no-store' })
        .then((r) => r.json())
        .then((json: { count?: number }) =>
          setInboxUnread(typeof json.count === 'number' ? json.count : 0),
        )
        .catch(() => setInboxUnread(0));
    }
  }, [pathname, profile]);

  useEffect(() => {
    const isGameRoute =
      (pathname ?? '').startsWith('/games') || (pathname ?? '').startsWith('/quiz');
    if (!isGameRoute) {
      setHideForMobileLandscapeGame(false);
      return;
    }

    const landscapeMobileMq = window.matchMedia(
      '(orientation: landscape) and ((hover: none) or (pointer: coarse)) and (max-height: 540px)',
    );

    const sync = () => {
      setHideForMobileLandscapeGame(landscapeMobileMq.matches);
    };

    sync();
    landscapeMobileMq.addEventListener('change', sync);
    window.addEventListener('resize', sync);
    window.addEventListener('orientationchange', sync);
    return () => {
      landscapeMobileMq.removeEventListener('change', sync);
      window.removeEventListener('resize', sync);
      window.removeEventListener('orientationchange', sync);
    };
  }, [pathname]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    /** 避免 `window.location` 整頁重載在 dev / Turbopack 下與 manifest 寫入競態 */
    router.replace(GUEST_HOME_PATH);
    router.refresh();
  }

  const isAdmin = profile?.role === 'admin';
  const visibleNavLinks = NAV_LINKS;

  if (hideForMobileLandscapeGame) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center px-4">

        {/* Logo */}
        <PlatformBrandMark
          subscriptions={subscriptions}
          plans={planMeta}
          className="mr-6"
        />

        {/* Desktop nav links */}
        <nav className="hidden md:flex items-center gap-1 flex-1">
          {visibleNavLinks.map((link) => (
            <span key={`${link.href}-${link.label}`} className="inline-flex items-center gap-1">
              <Link
                href={link.href}
                className={cn(
                  'px-3 py-1.5 text-sm rounded-md transition-colors',
                  isNavLinkActive(pathname ?? '', link)
                    ? 'text-foreground font-medium bg-accent'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
                )}
              >
                {link.label}
              </Link>
              {link.href === '/games' && profile?.role === 'admin' ? (
                <span className="inline-flex items-center gap-1">
                  <Link
                    href="/games?stage=junior"
                    className={cn(
                      'rounded-md border border-violet-500/40 bg-violet-500/10 px-2 py-1 text-[11px] font-semibold text-violet-700 transition-colors hover:bg-violet-500/20 dark:text-violet-200',
                      (pathname ?? '').startsWith('/games') ||
                        (pathname ?? '').startsWith('/quiz')
                        ? 'ring-1 ring-violet-500/30'
                        : '',
                    )}
                    title="管理員：直達 Stage 2 分身術"
                  >
                    Stage 2
                  </Link>
                  <Link
                    href="/games?stage=college"
                    className={cn(
                      'rounded-md border border-fuchsia-500/40 bg-fuchsia-500/10 px-2 py-1 text-[11px] font-semibold text-fuchsia-700 transition-colors hover:bg-fuchsia-500/20 dark:text-fuchsia-200',
                      (pathname ?? '').startsWith('/games') ||
                        (pathname ?? '').startsWith('/quiz')
                        ? 'ring-1 ring-fuchsia-500/30'
                        : '',
                    )}
                    title="管理員：直達 Stage 3 迪斯可拼字"
                  >
                    Stage 3
                  </Link>
                </span>
              ) : null}
            </span>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2 ml-auto">

          <MarketingThemeCycleButton />

          {/* Dark mode toggle：目前為暗黑時顯示太陽（切換為亮色）；亮色時顯示月亮 */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            aria-label={
              themeMounted && resolvedTheme === 'dark'
                ? '切換為亮色模式'
                : themeMounted && resolvedTheme === 'light'
                  ? '切換為暗黑模式'
                  : '切換深色／淺色模式'
            }
          >
            {!themeMounted ? (
              <Moon className="h-4 w-4 opacity-60" aria-hidden />
            ) : resolvedTheme === 'dark' ? (
              <Sun className="h-4 w-4" aria-hidden />
            ) : (
              <Moon className="h-4 w-4" aria-hidden />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFooter}
            aria-label={footerVisible ? '隱藏頁尾' : '顯示頁尾'}
            title={footerVisible ? '隱藏頁尾' : '顯示頁尾'}
          >
            {footerVisible ? (
              <ChevronsUp className="h-4 w-4" aria-hidden />
            ) : (
              <ChevronsDown className="h-4 w-4" aria-hidden />
            )}
          </Button>

          {profile ? (
            <>
              {/* Streak indicator */}
              {profile.streak_days > 0 && (
                <div className="hidden sm:flex items-center gap-1 text-xs text-[hsl(var(--streak))] font-medium">
                  <Flame className="h-3.5 w-3.5" />
                  {profile.streak_days}
                </div>
              )}

              {/* XP bar (desktop) */}
              <div className="hidden lg:block w-28">
                <XpBar exp={profile.exp} level={profile.level} compact />
              </div>

              {/* Level badge */}
              <LevelBadge level={profile.level} size="sm" />

              {/* User menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={profile.avatar_url ?? undefined} alt={profile.display_name} />
                      <AvatarFallback className="text-xs">
                        {profile.display_name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent className="w-64 shadow-lg" align="end">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={profile.avatar_url ?? undefined} />
                          <AvatarFallback className="text-xs">
                            {profile.display_name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <p className="text-sm font-medium">{profile.display_name}</p>
                          <LevelBadge level={profile.level} size="sm" showLabel />
                        </div>
                      </div>
                      <XpBar exp={profile.exp} level={profile.level} />
                    </div>
                  </DropdownMenuLabel>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        個人資料
                      </span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/profile/inbox" className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2">
                        <Inbox className="h-4 w-4" />
                        收件匣
                      </span>
                      {inboxUnread > 0 ? (
                        <Badge
                          variant="destructive"
                          className="h-5 min-w-5 rounded-full px-1.5 text-[10px] font-bold animate-pulse"
                        >
                          {inboxUnread > 99 ? '99+' : inboxUnread}
                        </Badge>
                      ) : null}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/leaderboard">
                      <Trophy className="h-4 w-4" />排行榜
                    </Link>
                  </DropdownMenuItem>

                  {profile.role !== 'student' && (
                    <>
                      <DropdownMenuSeparator />
                      {/* 非 student 角色的專屬後台 */}
                      {profile.role === 'admin' && (
                        <DropdownMenuItem asChild>
                          <Link href="/admin">
                            <Settings className="h-4 w-4" />管理員後台
                          </Link>
                        </DropdownMenuItem>
                      )}
                      {(profile.role === 'mentor' || profile.role === 'admin') && (
                        <DropdownMenuItem asChild>
                          <Link href="/mentor">
                            <Settings className="h-4 w-4" />導師後台
                          </Link>
                        </DropdownMenuItem>
                      )}
                      {profile.role === 'admin' && (
                        <DropdownMenuItem asChild>
                          <Link href="/commerce/manage">
                            <Settings className="h-4 w-4" />
                            商家後台
                          </Link>
                        </DropdownMenuItem>
                      )}
                    </>
                  )}

                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                    <LogOut className="h-4 w-4" />登出
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">登入</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/register">免費註冊</Link>
              </Button>
            </div>
          )}

          {/* Mobile menu toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="md:hidden border-t bg-background px-4 py-3 space-y-1">
          {visibleNavLinks.map((link) => (
            <div key={`${link.href}-${link.label}`} className="space-y-1">
              <Link
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center px-3 py-2 rounded-md text-sm transition-colors',
                  isNavLinkActive(pathname ?? '', link)
                    ? 'bg-accent text-foreground font-medium'
                    : 'text-muted-foreground hover:bg-accent/50',
                )}
              >
                {link.label}
              </Link>
              {link.href === '/games' && profile?.role === 'admin' ? (
                <div className="mx-3 flex flex-col gap-1.5">
                  <Link
                    href="/games?stage=junior"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center rounded-md border border-violet-500/40 bg-violet-500/10 px-3 py-2 text-sm font-semibold text-violet-700 dark:text-violet-200"
                  >
                    Stage 2（管理員）
                  </Link>
                  <Link
                    href="/games?stage=college"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center rounded-md border border-fuchsia-500/40 bg-fuchsia-500/10 px-3 py-2 text-sm font-semibold text-fuchsia-700 dark:text-fuchsia-200"
                  >
                    Stage 3（管理員）
                  </Link>
                </div>
              ) : null}
            </div>
          ))}
          <Separator className="my-2" />
          <div className="flex items-center gap-2 px-3 py-2">
            <MarketingThemeCycleButton />
            <span className="text-sm text-muted-foreground">切換主題配色</span>
          </div>
          <Separator className="my-2" />
          <button
            type="button"
            onClick={() => {
              toggleFooter();
              setMobileOpen(false);
            }}
            className="flex w-full items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-accent/50"
          >
            {footerVisible ? (
              <>
                <ChevronsUp className="h-4 w-4" />隱藏頁尾
              </>
            ) : (
              <>
                <ChevronsDown className="h-4 w-4" />顯示頁尾
              </>
            )}
          </button>
          <Separator className="my-2" />
          {profile ? (
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-2 px-3 py-2 rounded-md text-sm text-destructive hover:bg-accent/50"
            >
              <LogOut className="h-4 w-4" />登出
            </button>
          ) : (
            <div className="flex gap-2 pt-1">
              <Button variant="outline" size="sm" className="flex-1" asChild>
                <Link href="/login" onClick={() => setMobileOpen(false)}>登入</Link>
              </Button>
              <Button size="sm" className="flex-1" asChild>
                <Link href="/register" onClick={() => setMobileOpen(false)}>免費註冊</Link>
              </Button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
