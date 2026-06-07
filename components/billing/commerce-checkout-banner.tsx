'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, CheckCircle2, Inbox, Loader2, X, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type BannerState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'success'; title: string; detail?: string; inboxLink?: boolean }
  | { kind: 'warning'; title: string; detail?: string }
  | { kind: 'error'; title: string; detail?: string }
  | { kind: 'canceled'; title: string; detail?: string };

function readCheckoutQuery(
  searchParams: URLSearchParams | Readonly<URLSearchParams> | null,
): {
  outcome: 'success' | 'canceled' | null;
  sessionId: string | null;
  shopKind: string | null;
} {
  if (!searchParams) {
    return { outcome: null, sessionId: null, shopKind: null };
  }
  const checkout = searchParams.get('checkout');
  const legacySuccess = searchParams.get('success') === '1';
  const legacyCanceled = searchParams.get('canceled') === '1';

  let outcome: 'success' | 'canceled' | null = null;
  if (checkout === 'canceled' || legacyCanceled) outcome = 'canceled';
  else if (checkout === 'success' || legacySuccess) outcome = 'success';

  return {
    outcome,
    sessionId: searchParams.get('session_id'),
    shopKind: searchParams.get('shop_kind'),
  };
}

function stripCheckoutParams(
  pathname: string,
  searchParams: URLSearchParams | Readonly<URLSearchParams> | null,
): string {
  const next = new URLSearchParams(searchParams?.toString() ?? '');
  for (const key of ['checkout', 'session_id', 'shop_kind', 'success', 'canceled']) {
    next.delete(key);
  }
  const q = next.toString();
  return q ? `${pathname}?${q}` : pathname;
}

export function CommerceCheckoutBanner() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const isGamesPage = pathname?.startsWith('/games') ?? false;
  const [banner, setBanner] = useState<BannerState>({ kind: 'idle' });
  const [dismissed, setDismissed] = useState(false);

  const clearUrl = useCallback(() => {
    const clean = stripCheckoutParams(pathname ?? '/', searchParams);
    router.replace(clean, { scroll: false });
  }, [pathname, router, searchParams]);

  const dismiss = useCallback(() => {
    setDismissed(true);
    clearUrl();
  }, [clearUrl]);

  useEffect(() => {
    let cancelled = false;
    if (isGamesPage) {
      setBanner({ kind: 'idle' });
      return () => {
        cancelled = true;
      };
    }
    const { outcome, sessionId, shopKind } = readCheckoutQuery(searchParams);

    if (!outcome) {
      setBanner({ kind: 'idle' });
      return () => {
        cancelled = true;
      };
    }

    setDismissed(false);

    if (outcome === 'canceled') {
      setBanner({
        kind: 'canceled',
        title: '已取消付款',
        detail: '未扣款。若要購買體力或訂閱，請再試一次。',
      });
      return () => {
        cancelled = true;
      };
    }

    const run = async () => {
      setBanner({ kind: 'loading' });

      try {
        if (!sessionId) {
          try {
            await fetch('/api/stripe/checkout/reconcile', { method: 'POST' });
          } catch {
            // ignore
          }
          if (cancelled) return;
          const isStaminaLegacy = shopKind === 'stamina_pack' || shopKind == null;
          setBanner({
            kind: 'success',
            title: '購買成功',
            detail: isStaminaLegacy
              ? '體力道具已送至個人資料收件匣，請點「使用」回復體力。'
              : '付款已完成，感謝您的購買。',
            inboxLink: isStaminaLegacy,
          });
          return;
        }

        const res = await fetch('/api/stripe/checkout/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });
        const json = (await res.json()) as {
          ok?: boolean;
          status?: string;
          message?: string;
          purchaseKind?: string;
          shopItemKind?: string;
          staminaDelivered?: boolean;
          shopItemTitle?: string;
        };

        if (cancelled) return;

        if (!res.ok || json.ok === false) {
          setBanner({
            kind: 'error',
            title: '無法確認付款結果',
            detail:
              typeof json.message === 'string'
                ? json.message
                : '若已扣款，請稍後至個人資料收件匣查看，或聯絡客服。',
          });
          return;
        }

        if (json.status === 'pending') {
          setBanner({
            kind: 'warning',
            title: '付款處理中',
            detail: json.message ?? '請稍候再重新整理此頁',
          });
          return;
        }

        if (json.purchaseKind === 'subscription') {
          setBanner({
            kind: 'success',
            title: '訂閱成功',
            detail: '感謝您的訂閱，相關權益將於帳戶生效。',
          });
          return;
        }

        const isStamina =
          json.shopItemKind === 'stamina_pack' || shopKind === 'stamina_pack';

        if (isStamina) {
          if (!json.staminaDelivered) {
            try {
              await fetch('/api/stripe/checkout/reconcile', { method: 'POST' });
            } catch {
              // ignore
            }
          }
          if (cancelled) return;
          setBanner({
            kind: 'success',
            title: '購買成功',
            detail: `「${json.shopItemTitle ?? '體力道具'}」已送至個人資料收件匣，請點「使用」回復體力。`,
            inboxLink: true,
          });
          return;
        }

        setBanner({
          kind: 'success',
          title: '購買成功',
          detail: '感謝您的購買。',
        });
      } catch {
        if (!cancelled) {
          setBanner({
            kind: 'error',
            title: '無法確認付款結果',
            detail: '請檢查網路後重新整理；若已扣款請至個人資料收件匣查看。',
          });
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [isGamesPage, searchParams]);

  /** 遊戲頁由 GamesStaminaCheckoutToast 處理，避免頂部橫幅破版 */
  if (isGamesPage) return null;

  if (dismissed || banner.kind === 'idle') return null;

  const styles =
    banner.kind === 'success'
      ? 'border-green-500/40 bg-green-500/10 text-green-900 dark:text-green-100'
      : banner.kind === 'canceled' || banner.kind === 'warning'
        ? 'border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-100'
        : banner.kind === 'error'
          ? 'border-destructive/40 bg-destructive/10 text-destructive'
          : 'border-border bg-muted/40 text-muted-foreground';

  const Icon =
    banner.kind === 'success'
      ? CheckCircle2
      : banner.kind === 'error'
        ? XCircle
        : AlertCircle;

  return (
    <div
      role="status"
      className={cn(
        'mb-6 flex gap-3 rounded-xl border px-4 py-3 text-sm shadow-sm',
        styles,
      )}
    >
      {banner.kind === 'loading' ? (
        <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin" aria-hidden />
      ) : (
        <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
      )}

      <div className="min-w-0 flex-1 space-y-1">
        <p className="font-semibold leading-snug">
          {banner.kind === 'loading' ? '正在確認付款結果…' : banner.title}
        </p>
        {'detail' in banner && banner.detail ? (
          <p className="text-[13px] opacity-90 leading-relaxed">{banner.detail}</p>
        ) : null}
        {banner.kind === 'success' && 'inboxLink' in banner && banner.inboxLink ? (
          <Link
            href="/profile/inbox"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium underline underline-offset-2"
          >
            <Inbox className="h-3.5 w-3.5" />
            前往收件匣使用體力
          </Link>
        ) : null}
      </div>

      {banner.kind !== 'loading' ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 opacity-70 hover:opacity-100"
          onClick={dismiss}
          aria-label="關閉提示"
        >
          <X className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );
}
