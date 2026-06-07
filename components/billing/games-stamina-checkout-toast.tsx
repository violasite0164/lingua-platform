'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, Loader2 } from 'lucide-react';

import { verifyCheckoutAndClaimStamina } from '@/lib/billing/checkout-client';
import { GAMES_STAMINA_CHECKOUT_SESSION_KEY } from '@/lib/billing/games-checkout-storage';
import {
  hasPendingContinue,
  signalContinueAfterStamina,
} from '@/lib/game/pending-continue-storage';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useGameStamina } from '@/lib/game/stamina-context';

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

function isStaminaCheckout(shopKind: string | null | undefined): boolean {
  return shopKind === 'stamina_pack' || shopKind == null;
}

/** 遊戲頁結帳導回：立即清 URL、驗證付款並回復體力，小彈窗只顯示「體力已回復」 */
export function GamesStaminaCheckoutToast() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { refreshStamina } = useGameStamina();

  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<'loading' | 'done'>('loading');

  const clearUrl = useCallback(() => {
    const clean = stripCheckoutParams(pathname ?? '/games', searchParams);
    router.replace(clean, { scroll: false });
  }, [pathname, router, searchParams]);

  useEffect(() => {
    const checkout = searchParams?.get('checkout');
    const shopKind = searchParams?.get('shop_kind');
    let sessionId = searchParams?.get('session_id')?.trim() ?? '';

    if (checkout === 'success' && sessionId && isStaminaCheckout(shopKind)) {
      try {
        sessionStorage.setItem(GAMES_STAMINA_CHECKOUT_SESSION_KEY, sessionId);
      } catch {
        /* ignore */
      }
      clearUrl();
    }

    if (!sessionId) {
      try {
        sessionId = sessionStorage.getItem(GAMES_STAMINA_CHECKOUT_SESSION_KEY)?.trim() ?? '';
      } catch {
        sessionId = '';
      }
    }

    if (!sessionId) return;

    const doneKey = `games-stamina-verified:${sessionId}`;
    try {
      if (sessionStorage.getItem(doneKey) === '1') {
        sessionStorage.removeItem(GAMES_STAMINA_CHECKOUT_SESSION_KEY);
        return;
      }
    } catch {
      /* continue verify */
    }

    let cancelled = false;
    setOpen(true);
    setPhase('loading');

    const run = async () => {
      let succeeded = false;

      for (let attempt = 0; attempt < 8 && !succeeded; attempt += 1) {
        if (attempt > 0) {
          await new Promise((r) => window.setTimeout(r, 1000));
        }
        const result = await verifyCheckoutAndClaimStamina(sessionId);
        if (cancelled) return;

        if (!result.ok) continue;

        if ('status' in result && result.status === 'pending') continue;
        if (!('staminaClaimed' in result)) continue;

        const claimed = result.staminaClaimed === true || Boolean(result.stamina);
        if (!claimed) continue;

        succeeded = true;
        await refreshStamina();
        try {
          sessionStorage.setItem(doneKey, '1');
          sessionStorage.removeItem(GAMES_STAMINA_CHECKOUT_SESSION_KEY);
        } catch {
          /* ignore */
        }

        if (hasPendingContinue()) {
          signalContinueAfterStamina();
        }

        setPhase('done');
        window.setTimeout(() => {
          if (!cancelled) setOpen(false);
        }, 2000);
        return;
      }

      if (!cancelled) {
        setOpen(false);
        try {
          sessionStorage.removeItem(GAMES_STAMINA_CHECKOUT_SESSION_KEY);
        } catch {
          /* ignore */
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [searchParams, clearUrl, refreshStamina]);

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="z-[250] max-w-xs gap-3 border-green-800/40 bg-card p-6 text-center sm:max-w-sm">
        <DialogHeader className="items-center space-y-2 text-center">
          {phase === 'loading' ? (
            <>
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" aria-hidden />
              <DialogTitle className="text-base">正在回復體力…</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                付款成功，請稍候
              </DialogDescription>
            </>
          ) : (
            <>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/15">
                <CheckCircle2 className="h-7 w-7 text-green-500" aria-hidden />
              </div>
              <DialogTitle className="text-lg">體力已回復</DialogTitle>
              <DialogDescription className="sr-only">體力已加入帳戶</DialogDescription>
            </>
          )}
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
