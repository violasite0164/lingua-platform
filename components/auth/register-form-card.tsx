'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Eye, EyeOff, AlertCircle, UserRound } from 'lucide-react';

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
import { cn } from '@/lib/utils';

const registerSchema = z.object({
  fullName: z
    .string()
    .min(2, '姓名至少 2 個字元')
    .max(50, '姓名不能超過 50 個字元'),
  email: z.string().email('請輸入有效的電子郵件'),
  password: z
    .string()
    .min(6, '密碼至少 6 個字元')
    .max(72, '密碼不能超過 72 個字元'),
  agreeToTerms: z.boolean().refine((v) => v === true, {
    message: '請閱讀並同意服務條款及私隱政策',
  }),
});

export type RegisterFormValues = z.infer<typeof registerSchema>;

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className ?? 'h-4 w-4'} aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function getPasswordStrength(password: string): {
  level: number;
  label: string;
  color: string;
} {
  if (password.length === 0) return { level: 0, label: '', color: '' };
  if (password.length < 6) return { level: 1, label: '太短', color: 'bg-destructive' };
  if (password.length < 8) return { level: 2, label: '普通', color: 'bg-yellow-500' };
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const score = [hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
  if (score === 3) return { level: 4, label: '非常強', color: 'bg-green-500' };
  if (score >= 1) return { level: 3, label: '強', color: 'bg-primary' };
  return { level: 2, label: '普通', color: 'bg-yellow-500' };
}

export type RegisterFormCardProps = {
  /** 嵌入首頁等處時略緊湊、滿寬由外層決定 */
  variant?: 'page' | 'embedded';
  /** `external`：登入連結由外層放在卡片下方（與 /register 頁內建頁尾擇一） */
  loginLinkPlacement?: 'card-footer' | 'external';
  /** 避免同頁多表單時 id 重複 */
  fieldIdPrefix?: string;
  cardTitle?: string;
  cardDescription?: string;
  className?: string;
};

export function RegisterFormCard({
  variant = 'page',
  loginLinkPlacement = 'card-footer',
  fieldIdPrefix = '',
  cardTitle = '建立新帳號',
  cardDescription = '免費加入，開始你的語言學習之旅',
  className,
}: RegisterFormCardProps) {
  const router = useRouter();
  const prefix = fieldIdPrefix ? `${fieldIdPrefix}-` : '';

  const [serverError, setServerError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordValue, setPasswordValue] = useState('');
  const [needsConfirm, setNeedsConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      agreeToTerms: false,
    },
  });

  const supabase = createClient();
  const isBusy = isSubmitting || googleLoading;
  const strength = getPasswordStrength(passwordValue);
  const agreeToTerms = watch('agreeToTerms');

  async function onSubmit(values: RegisterFormValues) {
    setServerError(null);

    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: { data: { full_name: values.fullName } },
    });

    if (error) {
      setServerError(
        error.message.includes('already registered')
          ? '此電子郵件已被使用，請直接登入。'
          : error.message,
      );
      return;
    }

    if (data.session) {
      router.push('/dashboard');
      router.refresh();
    } else if (data.user) {
      setNeedsConfirm(true);
    }
  }

  async function handleGoogleRegister() {
    if (!getValues('agreeToTerms')) {
      setServerError('請先閱讀並同意服務條款及私隱政策。');
      return;
    }
    setGoogleLoading(true);
    setServerError(null);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${getBrowserSiteOrigin()}/auth/callback`,
      },
    });

    if (error) {
      setServerError('Google 註冊失敗，請稍後再試。');
      setGoogleLoading(false);
    }
  }

  const showFooter = loginLinkPlacement === 'card-footer';

  return (
    <Card
      className={cn(
        'border-border/60 text-left shadow-lg shadow-black/5 dark:shadow-black/20',
        variant === 'embedded' && 'w-full max-w-md shadow-md',
        className,
      )}
    >
      <CardHeader className={cn('space-y-1', variant === 'embedded' ? 'pb-4' : 'pb-5')}>
        <CardTitle className={cn('font-bold', variant === 'embedded' ? 'text-xl' : 'text-2xl')}>
          {cardTitle}
        </CardTitle>
        <CardDescription className="text-sm">{cardDescription}</CardDescription>
      </CardHeader>

      <CardContent className={cn('space-y-5', variant === 'embedded' && 'space-y-4')}>
        {needsConfirm ? (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <svg className="h-7 w-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                />
              </svg>
            </div>
            <div className="space-y-1">
              <p className="text-base font-semibold">請確認你的電子郵件</p>
              <p className="text-sm text-muted-foreground">
                我們已寄送確認信到你的信箱。
                <br />
                點擊信中的連結後即可開始學習。
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              沒收到？請檢查垃圾郵件資料夾，或{' '}
              <button
                type="button"
                onClick={() => setNeedsConfirm(false)}
                className="text-primary underline-offset-4 hover:underline"
              >
                重新填寫
              </button>
            </p>
          </div>
        ) : (
          <>
            {serverError && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/8 px-3.5 py-3 text-sm text-destructive dark:bg-destructive/15"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{serverError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div className="flex gap-2.5">
                <input
                  id={`${prefix}agreeTerms`}
                  type="checkbox"
                  className={cn(
                    'mt-1 size-4 shrink-0 rounded border border-input bg-background text-primary ring-offset-background',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    errors.agreeToTerms && 'border-destructive',
                  )}
                  {...register('agreeToTerms', {
                    setValueAs: (v) => v === true || v === 'on',
                  })}
                />
                <div className="text-sm leading-snug text-muted-foreground">
                  <label htmlFor={`${prefix}agreeTerms`} className="cursor-pointer">
                    我已閱讀並同意
                  </label>{' '}
                  <Link
                    href="/terms"
                    className="font-medium text-primary underline-offset-4 hover:underline"
                  >
                    服務條款
                  </Link>
                  {' '}及{' '}
                  <Link
                    href="/privacy"
                    className="font-medium text-primary underline-offset-4 hover:underline"
                  >
                    私隱政策
                  </Link>
                </div>
              </div>
              {errors.agreeToTerms && (
                <p className="flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="h-3 w-3" />
                  {errors.agreeToTerms.message}
                </p>
              )}

              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full gap-2.5 font-medium"
                onClick={handleGoogleRegister}
                disabled={isBusy || !agreeToTerms}
              >
                {googleLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <GoogleIcon />
                )}
                使用 Google 帳號註冊
              </Button>

              <div className="flex items-center gap-3">
                <Separator className="flex-1" />
                <span className="text-xs text-muted-foreground">或使用電子郵件</span>
                <Separator className="flex-1" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`${prefix}fullName`}>姓名 / 暱稱</Label>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id={`${prefix}fullName`}
                    type="text"
                    placeholder="你的名字"
                    autoComplete="name"
                    disabled={isBusy}
                    aria-invalid={!!errors.fullName}
                    className={
                      errors.fullName
                        ? 'border-destructive pl-9 focus-visible:ring-destructive'
                        : 'pl-9'
                    }
                    {...register('fullName')}
                  />
                </div>
                {errors.fullName && (
                  <p className="flex items-center gap-1 text-xs text-destructive">
                    <AlertCircle className="h-3 w-3" />
                    {errors.fullName.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`${prefix}email`}>電子郵件</Label>
                <Input
                  id={`${prefix}email`}
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  disabled={isBusy}
                  aria-invalid={!!errors.email}
                  className={
                    errors.email ? 'border-destructive focus-visible:ring-destructive' : ''
                  }
                  {...register('email')}
                />
                {errors.email && (
                  <p className="flex items-center gap-1 text-xs text-destructive">
                    <AlertCircle className="h-3 w-3" />
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`${prefix}password`}>設定密碼</Label>
                <div className="relative">
                  <Input
                    id={`${prefix}password`}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="至少 6 個字元"
                    autoComplete="new-password"
                    disabled={isBusy}
                    aria-invalid={!!errors.password}
                    className={
                      errors.password
                        ? 'border-destructive pr-10 focus-visible:ring-destructive'
                        : 'pr-10'
                    }
                    {...register('password', {
                      onChange: (e) => setPasswordValue(e.target.value),
                    })}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    aria-label={showPassword ? '隱藏密碼' : '顯示密碼'}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {passwordValue.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                            i <= strength.level ? strength.color : 'bg-muted'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      密碼強度：
                      <span className="font-medium text-foreground">{strength.label}</span>
                    </p>
                  </div>
                )}

                {errors.password && (
                  <p className="flex items-center gap-1 text-xs text-destructive">
                    <AlertCircle className="h-3 w-3" />
                    {errors.password.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full font-semibold"
                disabled={isBusy || !agreeToTerms}
              >
                {isSubmitting && <Loader2 className="animate-spin" />}
                建立帳號
              </Button>
            </form>
          </>
        )}
      </CardContent>

      {showFooter && (
        <CardFooter className="flex justify-center border-t pt-5">
          <p className="text-sm text-muted-foreground">
            已經有帳號？{' '}
            <Link
              href="/login"
              className="font-semibold text-primary underline-offset-4 transition-colors hover:underline"
            >
              立即登入
            </Link>
          </p>
        </CardFooter>
      )}
    </Card>
  );
}
