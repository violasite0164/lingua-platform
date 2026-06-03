'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Store, Zap } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { startStripeCheckout } from '@/lib/billing/checkout-client';
import { fetchActiveStaminaPacks, type StaminaPackShopItem } from '@/lib/billing/stamina-shop-actions';
import {
  formatStaminaRegenCountdown,
  msUntilStaminaRegen,
  type GameStaminaState,
} from '@/lib/game/stamina';
import { formatMoneyCents } from '@/lib/commerce/format';
import { cn } from '@/lib/utils';

export type StaminaShopPopupProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stamina: GameStaminaState | null;
  requiredAmount?: number;
  hintMessage?: string;
  onRefreshStamina?: () => void;
};

export function StaminaShopPopup({
  open,
  onOpenChange,
  stamina,
  requiredAmount,
  hintMessage,
  onRefreshStamina,
}: StaminaShopPopupProps) {
  const [packs, setPacks] = useState<StaminaPackShopItem[]>([]);
  const [loadingPacks, setLoadingPacks] = useState(false);
  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!open) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingPacks(true);
    setError(null);
    void fetchActiveStaminaPacks()
      .then((items) => {
        if (!cancelled) setPacks(items);
      })
      .catch(() => {
        if (!cancelled) setError('無法載入體力商品，請稍後再試');
      })
      .finally(() => {
        if (!cancelled) setLoadingPacks(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleBuy = useCallback(async (itemId: string) => {
    setLoadingItemId(itemId);
    setError(null);
    try {
      const url = await startStripeCheckout({
        kind: 'shop_item',
        shopItemId: itemId,
        returnTo: 'commerce',
      });
      window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : '無法開始付款');
      setLoadingItemId(null);
    }
  }, []);

  const regenMs =
    stamina && !stamina.isAdmin ? msUntilStaminaRegen(stamina.nextRegenAt, nowMs) : null;
  const regenLabel =
    regenMs != null && regenMs > 0 ? formatStaminaRegenCountdown(regenMs) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90vh,640px)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Zap className="h-5 w-5 text-amber-500" aria-hidden />
            體力不足
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-2 text-sm text-muted-foreground">
              {hintMessage ? <p>{hintMessage}</p> : null}
              {stamina && !stamina.isAdmin ? (
                <p>
                  目前體力{' '}
                  <span className="font-semibold text-foreground">
                    {stamina.stamina} / {stamina.max}
                  </span>
                  {typeof requiredAmount === 'number' && requiredAmount > 0
                    ? `，需要 ${requiredAmount} 點才能繼續`
                    : null}
                  {regenLabel ? ` · 下次回復 ${regenLabel}` : null}
                </p>
              ) : null}
              <p>
                可直接在此購買體力包。付款成功後道具會送至
                <Link href="/profile#inbox" className="text-primary underline underline-offset-2">
                  個人資料收件匣
                </Link>
                ，請點「使用」回復體力。
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {loadingPacks ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              載入商品…
            </div>
          ) : packs.length > 0 ? (
            packs.map((item) => {
              const staminaHint =
                item.stamina_amount != null && item.stamina_amount > 0
                  ? `回復 ${item.stamina_amount} 體力`
                  : null;
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-lg border bg-card p-3 shadow-sm"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-amber-500/15">
                    <Zap className="h-5 w-5 text-amber-500" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold leading-tight">{item.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.description || staminaHint || '體力包'}
                    </p>
                    <p className="mt-1 text-sm font-bold">
                      {formatMoneyCents(item.price_cents, item.currency)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    className="shrink-0"
                    disabled={loadingItemId !== null}
                    onClick={() => void handleBuy(item.id)}
                  >
                    {loadingItemId === item.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      '購買'
                    )}
                  </Button>
                </div>
              );
            })
          ) : (
            <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
              暫無上架的體力包，請稍後再試或前往商店。
            </div>
          )}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="flex flex-col gap-2 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
            <Button type="button" variant="outline" size="sm" onClick={() => onRefreshStamina?.()}>
              重新整理體力
            </Button>
            <Link
              href="/commerce"
              className={cn(
                'inline-flex items-center justify-center gap-1.5 text-sm font-medium text-primary hover:underline',
              )}
              onClick={() => onOpenChange(false)}
            >
              <Store className="h-4 w-4" aria-hidden />
              前往訂閱與商店
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
