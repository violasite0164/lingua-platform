'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Loader2,
  BookOpen,
  Eye,
  EyeOff,
  AlertCircle,
  GraduationCap,
  Trophy,
  Zap,
} from 'lucide-react';

import { createClient } from '@/lib/supabase/client';
import { getBrowserSiteOrigin } from '@/lib/site-url';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

// ─── Zod schema ────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email:    z.string().email('請輸入有效的電子郵件'),
  password: z.string().min(6, '密碼至少 6 個字元'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

// ─── Static assets ─────────────────────────────────────────────────────────

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className ?? 'h-4 w-4'} aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

const FEATURES = [
  { icon: BookOpen,      label: '500+ 堂互動課程' },
  { icon: GraduationCap, label: '專業認證師資' },
  { icon: Trophy,        label: '成就解鎖系統' },
  { icon: Zap,           label: 'AI 個人學習路徑' },
] as const;

// ─── Page ──────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const redirectTo   = searchParams?.get('redirect') ?? '/dashboard';

  // Read error injected by auth/callback on OAuth failure
  const urlError = searchParams?.get('error') ?? null;

  const [serverError,   setServerError]   = useState<string | null>(urlError);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword,  setShowPassword]  = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  const supabase = createClient();
  const isBusy   = isSubmitting || googleLoading;

  // ── Email / Password ──────────────────────────────────────

  async function onSubmit(values: LoginFormValues) {
    setServerError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email:    values.email,
      password: values.password,
    });

    if (error) {
      setServerError(
        error.message === 'Invalid login credentials'
          ? '電子郵件或密碼不正確，請重試。'
          : error.message,
      );
      return;
    }

    router.push(redirectTo);
    router.refresh();
  }

  // ── Google OAuth ──────────────────────────────────────────

  async function handleGoogleLogin() {
    setGoogleLoading(true);
    setServerError(null);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${getBrowserSiteOrigin()}/auth/callback?redirect=${encodeURIComponent(redirectTo)}`,
      },
    });

    if (error) {
      setServerError('Google 登入失敗，請稍後再試。');
      setGoogleLoading(false);
    }
  }

  // ─────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen">

      {/* ── Left decorative panel (hidden on mobile) ─────── */}
      <aside className="relative hidden w-[45%] flex-col justify-between overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-primary/70 p-12 text-primary-foreground lg:flex">
        {/* Background pattern */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'radial-gradient(circle at 25% 25%, white 1px, transparent 1px), radial-gradient(circle at 75% 75%, white 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        {/* Brand */}
        <div className="relative flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm ring-1 ring-white/30">
            <BookOpen className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold tracking-tight">Lingua</span>
        </div>

        {/* Hero text */}
        <div className="relative space-y-6">
          <div className="space-y-3">
            <h2 className="text-4xl font-bold leading-tight">
              開啟你的<br />語言學習旅程
            </h2>
            <p className="text-base text-primary-foreground/75 leading-relaxed">
              與數千名學習者一起，透過互動課程、AI 輔助和遊戲化學習，流利掌握新語言。
            </p>
          </div>

          {/* Feature list */}
          <ul className="space-y-3">
            {FEATURES.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3 text-sm">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/20">
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-primary-foreground/90">{label}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Testimonial */}
        <blockquote className="relative space-y-2 border-l-2 border-white/30 pl-4">
          <p className="text-sm italic text-primary-foreground/80">
            「三個月內日語從零到 N3，Lingua 的學習系統真的太有效了！」
          </p>
          <footer className="text-xs text-primary-foreground/60">— Mei, 學習者</footer>
        </blockquote>
      </aside>

      {/* ── Right: form area ─────────────────────────────── */}
      <main className="flex flex-1 flex-col items-center justify-center bg-background px-4 py-12">
        <div className="w-full max-w-[380px] space-y-6">

          {/* Mobile-only brand */}
          <div className="flex flex-col items-center gap-2 text-center lg:hidden">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
              <BookOpen className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold">Lingua</span>
          </div>

          {/* Card */}
          <Card className="border-border/60 shadow-lg shadow-black/5 dark:shadow-black/20">
            <CardHeader className="space-y-1 pb-5">
              <CardTitle className="text-2xl font-bold">歡迎回來</CardTitle>
              <CardDescription className="text-sm">
                登入你的帳號，繼續學習之旅
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">

              {/* Google button */}
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full gap-2.5 font-medium"
                onClick={handleGoogleLogin}
                disabled={isBusy}
              >
                {googleLoading
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <GoogleIcon />
                }
                使用 Google 帳號登入
              </Button>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <Separator className="flex-1" />
                <span className="text-xs text-muted-foreground">或使用電子郵件</span>
                <Separator className="flex-1" />
              </div>

              {/* Error banner */}
              {serverError && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/8 px-3.5 py-3 text-sm text-destructive dark:bg-destructive/15"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{serverError}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>

                {/* Email */}
                <div className="space-y-1.5">
                  <Label htmlFor="email">電子郵件</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    disabled={isBusy}
                    aria-invalid={!!errors.email}
                    className={errors.email ? 'border-destructive focus-visible:ring-destructive' : ''}
                    {...register('email')}
                  />
                  {errors.email && (
                    <p className="flex items-center gap-1 text-xs text-destructive">
                      <AlertCircle className="h-3 w-3" />
                      {errors.email.message}
                    </p>
                  )}
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">密碼</Label>
                    <Link
                      href="/forgot-password"
                      className="text-xs text-muted-foreground transition-colors hover:text-primary"
                      tabIndex={-1}
                    >
                      忘記密碼？
                    </Link>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      disabled={isBusy}
                      aria-invalid={!!errors.password}
                      className={
                        errors.password
                          ? 'border-destructive pr-10 focus-visible:ring-destructive'
                          : 'pr-10'
                      }
                      {...register('password')}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      aria-label={showPassword ? '隱藏密碼' : '顯示密碼'}
                      onClick={() => setShowPassword((v: boolean) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {showPassword
                        ? <EyeOff className="h-4 w-4" />
                        : <Eye className="h-4 w-4" />
                      }
                    </button>
                  </div>
                  {errors.password && (
                    <p className="flex items-center gap-1 text-xs text-destructive">
                      <AlertCircle className="h-3 w-3" />
                      {errors.password.message}
                    </p>
                  )}
                </div>

                {/* Submit */}
                <Button
                  type="submit"
                  size="lg"
                  className="w-full font-semibold"
                  disabled={isBusy}
                >
                  {isSubmitting && <Loader2 className="animate-spin" />}
                  登入
                </Button>
              </form>
            </CardContent>

            <CardFooter className="flex justify-center border-t pt-5">
              <p className="text-sm text-muted-foreground">
                還沒有帳號？{' '}
                <Link
                  href="/register"
                  className="font-semibold text-primary underline-offset-4 transition-colors hover:underline"
                >
                  免費註冊
                </Link>
              </p>
            </CardFooter>
          </Card>

          {/* Legal */}
          <p className="text-center text-xs text-muted-foreground">
            繼續即代表你同意{' '}
            <Link href="/terms" className="underline-offset-4 hover:text-foreground hover:underline">
              服務條款
            </Link>{' '}
            與{' '}
            <Link href="/privacy" className="underline-offset-4 hover:text-foreground hover:underline">
              隱私政策
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
