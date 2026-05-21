'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import {
  BookOpen,
  ChevronsDown,
  ChevronsUp,
  Flame,
  LogOut,
  Maximize2,
  Menu,
  Minimize2,
  Moon,
  Settings,
  Sun,
  Trophy,
  User,
  X,
} from 'lucide-react';
import { useState, useEffect } from 'react';

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
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/types/database.types';
import { useFooterVisibility } from '@/components/providers/footer-visibility-provider';
import { GUEST_HOME_PATH } from '@/lib/site-routes';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
  { href: '/dashboard',   label: '學習進度' },
  { href: '/courses',     label: '課程' },
  { href: '/leaderboard', label: '排行榜' },
  { href: '/quiz',        label: 'AI英語鬥' },
];

/** 是否具備 DOM 全螢幕 API（無則隱藏按鈕，例如多數 iPhone Safari） */
function supportsDomFullscreen(): boolean {
  if (typeof document === 'undefined') return false;
  const root = document.documentElement;
  const hasStandard = typeof root.requestFullscreen === 'function';
  const hasWebkit =
    typeof (root as HTMLElement & { webkitRequestFullscreen?: () => void }).webkitRequestFullscreen ===
    'function';
  if (!hasStandard && !hasWebkit) return false;
  if ('fullscreenEnabled' in document && document.fullscreenEnabled === false) return false;
  return true;
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const { footerVisible, toggleFooter } = useFooterVisibility();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenCapable, setFullscreenCapable] = useState(false);
  const [themeMounted, setThemeMounted] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    setThemeMounted(true);
  }, []);

  useEffect(() => {
    setFullscreenCapable(supportsDomFullscreen());
    const sync = () => {
      const d = document as Document & { webkitFullscreenElement?: Element | null };
      setIsFullscreen(!!(document.fullscreenElement ?? d.webkitFullscreenElement));
    };
    sync();
    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('webkitfullscreenchange', sync);
    return () => {
      document.removeEventListener('fullscreenchange', sync);
      document.removeEventListener('webkitfullscreenchange', sync);
    };
  }, []);

  async function toggleFullscreen() {
    const root = document.documentElement;
    const doc = document as Document & {
      webkitExitFullscreen?: () => Promise<void> | void;
      webkitFullscreenElement?: Element | null;
    };
    const rootWk = root as HTMLElement & { webkitRequestFullscreen?: () => void };
    try {
      const inFs = document.fullscreenElement ?? doc.webkitFullscreenElement;
      if (!inFs) {
        if (typeof root.requestFullscreen === 'function') {
          await root.requestFullscreen();
        } else if (typeof rootWk.webkitRequestFullscreen === 'function') {
          await Promise.resolve(rootWk.webkitRequestFullscreen());
        }
      } else {
        if (typeof document.exitFullscreen === 'function') {
          await document.exitFullscreen();
        } else if (typeof doc.webkitExitFullscreen === 'function') {
          await Promise.resolve(doc.webkitExitFullscreen());
        }
      }
    } catch {
      // 瀏覽器拒絕全螢幕
    }
  }

  useEffect(() => {
    // getSession() reads the JWT from cookie — no network round-trip.
    // We use it only for the initial render; the auth state listener keeps
    // things in sync whenever the session actually changes.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) return;
      supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()
        .then(({ data }) => setProfile(data));
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setProfile(null);
        return;
      }
      // Refresh profile on sign-in or token refresh
      if (session?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
        supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => setProfile(data));
      }
    });
    return () => listener.subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    /** 避免 `window.location` 整頁重載在 dev / Turbopack 下與 manifest 寫入競態 */
    router.replace(GUEST_HOME_PATH);
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center px-4">

        {/* Logo */}
        <Link href={GUEST_HOME_PATH} className="flex items-center gap-2 font-bold text-lg mr-6">
          <BookOpen className="h-5 w-5 text-primary" />
          <span>LinguaLearn</span>
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden md:flex items-center gap-1 flex-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'px-3 py-1.5 text-sm rounded-md transition-colors',
                (pathname ?? '').startsWith(link.href)
                  ? 'text-foreground font-medium bg-accent'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
              )}
            >
              {link.label}
            </Link>
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

          {fullscreenCapable && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => void toggleFullscreen()}
              aria-label={isFullscreen ? '離開全螢幕' : '全螢幕顯示'}
              title={isFullscreen ? '離開全螢幕' : '全螢幕顯示'}
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" aria-hidden />
              ) : (
                <Maximize2 className="h-4 w-4" aria-hidden />
              )}
            </Button>
          )}

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
                    <Link href="/profile">
                      <User className="h-4 w-4" />個人資料
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
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center px-3 py-2 rounded-md text-sm transition-colors',
                (pathname ?? '').startsWith(link.href)
                  ? 'bg-accent text-foreground font-medium'
                  : 'text-muted-foreground hover:bg-accent/50',
              )}
            >
              {link.label}
            </Link>
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
