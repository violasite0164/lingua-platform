'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, Loader2, Package, Zap } from 'lucide-react';

import { StripeEmbeddedCheckoutMount } from '@/components/billing/stripe-embedded-checkout-mount';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { rememberGamesStaminaCheckoutSession } from '@/lib/billing/games-checkout-storage';
import {
  createEmbeddedShopCheckout,
  verifyCheckoutAndClaimStamina,
} from '@/lib/billing/checkout-client';
import { formatMoneyCents } from '@/lib/commerce/format';
import {
  formatStaminaRegenCountdown,
  msUntilStaminaRegen,
  type GameStaminaState,
} from '@/lib/game/stamina';
import { getGameStaminaStateClient } from '@/lib/game/stamina-client';
import {
  canClaimStaminaPack,
  type ProfileInboxMessage,
} from '@/lib/profile/inbox-types';
import { claimProfileInboxStaminaPackClient } from '@/lib/profile/inbox-client';
import { createClient } from '@/lib/supabase/client';
import {
  hasPendingContinue,
  signalContinueAfterStamina,
} from '@/lib/game/pending-continue-storage';
import { getGamePortalRoot } from '@/lib/dom-fullscreen';
import { cn } from '@/lib/utils';
import {
  isGameShellFullscreenPortal,
  useGamePortalRoot,
} from '@/lib/hooks/use-game-portal-root';

export type StaminaPackShopItem = {
  id: string;
  kind: string;
  title: string;
  description: string;
  price_cents: number;
  currency: string;
  stamina_amount: number | null;
};

export type StaminaShopPopupProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stamina: GameStaminaState | null;
  requiredAmount?: number;
  hintMessage?: string;
  onStaminaUpdated?: (state: GameStaminaState) => void;
};

type Panel = 'shop' | 'checkout';

export function StaminaShopPopup({
  open,
  onOpenChange,
  stamina,
  requiredAmount,
  hintMessage,
  onStaminaUpdated,
}: StaminaShopPopupProps) {
  const [packs, setPacks] = useState<StaminaPackShopItem[]>([]);
  const [inventory, setInventory] = useState<ProfileInboxMessage[]>([]);
  const [loadingPacks, setLoadingPacks] = useState(false);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const [panel, setPanel] = useState<Panel>('shop');
  const [checkoutSecret, setCheckoutSecret] = useState<string | null>(null);
  const [pendingSessionId, setPendingSessionId] = useState<string | null>(null);
  const [checkoutShopItemId, setCheckoutShopItemId] = useState<string | null>(null);
  const [checkoutRemountKey, setCheckoutRemountKey] = useState(0);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [reloadingCheckout, setReloadingCheckout] = useState(false);

  const resetCheckoutPanel = useCallback(() => {
    setPanel('shop');
    setCheckoutSecret(null);
    setPendingSessionId(null);
    setCheckoutShopItemId(null);
    setCheckoutRemountKey(0);
    setReloadingCheckout(false);
  }, []);

  const expireCheckoutSession = useCallback((sessionId: string | null) => {
    if (!sessionId) return;
    void fetch('/api/stripe/checkout/expire', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    }).catch(() => {
      /* best effort */
    });
  }, []);

  const exitCheckout = useCallback(() => {
    expireCheckoutSession(pendingSessionId);
    resetCheckoutPanel();
    setError('已取消付款，可重新選擇體力包');
  }, [expireCheckoutSession, pendingSessionId, resetCheckoutPanel]);

  const handleDialogOpenChange = useCallback(
    (next: boolean) => {
      if (!next) resetCheckoutPanel();
      onOpenChange(next);
    },
    [onOpenChange, resetCheckoutPanel],
  );

  const applyStaminaState = useCallback(
    (state: GameStaminaState) => {
      onStaminaUpdated?.(state);
      setSuccessMessage('體力已回復');
    },
    [onStaminaUpdated],
  );

  const loadInventory = useCallback(async () => {
    setLoadingInventory(true);
    try {
      const res = await fetch('/api/profile/inbox?reconcile=1');
      const json = (await res.json()) as {
        ok?: boolean;
        messages?: ProfileInboxMessage[];
      };
      if (json.ok && Array.isArray(json.messages)) {
        const claimable = json.messages.filter((m) => canClaimStaminaPack(m));
        setInventory(claimable);
      } else {
        setInventory([]);
      }
    } catch {
      setInventory([]);
    } finally {
      setLoadingInventory(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [open]);

  useEffect(() => {
    if (!open) {
      setError(null);
      setSuccessMessage(null);
      resetCheckoutPanel();
      return;
    }

    let cancelled = false;
    setLoadingPacks(true);
    setError(null);
    void loadInventory();

    void (async () => {
      const supabase = createClient();
      try {
        const { data, error: fetchError } = await supabase
          .from('shop_items')
          .select('id, kind, title, description, price_cents, currency, stamina_amount')
          .eq('is_active', true)
          .eq('kind', 'stamina_pack')
          .order('sort_order', { ascending: true });
        if (!cancelled) {
          if (fetchError) {
            setError('無法載入體力商品，請稍後再試');
            setPacks([]);
          } else {
            setPacks((data ?? []) as StaminaPackShopItem[]);
          }
        }
      } catch {
        if (!cancelled) setError('無法載入體力商品，請稍後再試');
      } finally {
        if (!cancelled) setLoadingPacks(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, loadInventory, resetCheckoutPanel]);

  const handleClaimItem = useCallback(
    async (messageId: string) => {
      setClaimingId(messageId);
      setError(null);
      setSuccessMessage(null);
      try {
        const res = await claimProfileInboxStaminaPackClient(messageId);
        if (!res.ok) {
          setError(res.message);
          return;
        }
        applyStaminaState(res.stamina);
        await loadInventory();
      } finally {
        setClaimingId(null);
      }
    },
    [applyStaminaState, loadInventory],
  );

  const completePayment = useCallback(
    async (sessionId: string) => {
      setVerifyingPayment(true);
      setError(null);
      try {
        const result = await verifyCheckoutAndClaimStamina(sessionId);
        if (!result.ok) {
          setError(result.message);
          return;
        }
        if ('status' in result && result.status === 'pending') {
          for (let i = 0; i < 4; i += 1) {
            await new Promise((r) => window.setTimeout(r, 1500));
            const retry = await verifyCheckoutAndClaimStamina(sessionId);
            if (
              retry.ok &&
              !('status' in retry && retry.status === 'pending') &&
              'stamina' in retry &&
              retry.stamina
            ) {
              applyStaminaState(retry.stamina);
              await loadInventory();
              resetCheckoutPanel();
              if (hasPendingContinue()) {
                signalContinueAfterStamina();
                onOpenChange(false);
              }
              return;
            }
          }
          setError(result.message);
          return;
        }
        if ('stamina' in result && result.stamina) {
          applyStaminaState(result.stamina);
        } else if ('staminaClaimed' in result && result.staminaClaimed) {
          const refreshed = await getGameStaminaStateClient();
          if (refreshed.ok) applyStaminaState(refreshed.state);
          else setSuccessMessage('體力已回復');
        }
        await loadInventory();
        resetCheckoutPanel();
        if (hasPendingContinue()) {
          signalContinueAfterStamina();
          onOpenChange(false);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : '付款確認失敗');
      } finally {
        setVerifyingPayment(false);
      }
    },
    [applyStaminaState, loadInventory, onOpenChange, resetCheckoutPanel],
  );

  const handleBuy = useCallback(
    async (itemId: string) => {
      setLoadingItemId(itemId);
      setError(null);
      setSuccessMessage(null);
      try {
        const { clientSecret, sessionId } = await createEmbeddedShopCheckout({
          kind: 'shop_item',
          shopItemId: itemId,
          returnTo: 'games',
        });
        rememberGamesStaminaCheckoutSession(sessionId);
        setCheckoutSecret(clientSecret);
        setPendingSessionId(sessionId);
        setPanel('checkout');
      } catch (e) {
        setError(e instanceof Error ? e.message : '無法開始付款');
      } finally {
        setLoadingItemId(null);
      }
    },
    [],
  );

  const reloadCheckout = useCallback(async () => {
    if (!checkoutShopItemId) {
      exitCheckout();
      return;
    }
    setReloadingCheckout(true);
    setError(null);
    expireCheckoutSession(pendingSessionId);
    try {
      const { clientSecret, sessionId } = await createEmbeddedShopCheckout({
        kind: 'shop_item',
        shopItemId: checkoutShopItemId,
        returnTo: 'games',
      });
      rememberGamesStaminaCheckoutSession(sessionId);
      setCheckoutSecret(clientSecret);
      setPendingSessionId(sessionId);
      setCheckoutRemountKey((k) => k + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : '無法重新載入付款');
      resetCheckoutPanel();
    } finally {
      setReloadingCheckout(false);
    }
  }, [
    checkoutShopItemId,
    exitCheckout,
    expireCheckoutSession,
    pendingSessionId,
    resetCheckoutPanel,
  ]);

  const regenMs =
    stamina && !stamina.isAdmin ? msUntilStaminaRegen(stamina.nextRegenAt, nowMs) : null;
  const regenLabel =
    regenMs != null && regenMs > 0 ? formatStaminaRegenCountdown(regenMs) : null;

  const hasEnough =
    stamina &&
    (stamina.isAdmin ||
      (typeof requiredAmount === 'number'
        ? stamina.stamina >= requiredAmount
        : stamina.stamina >= 1));

  useEffect(() => {
    if (!open || !successMessage || !stamina) return;
    const need = typeof requiredAmount === 'number' && requiredAmount > 0 ? requiredAmount : 1;
    if (stamina.isAdmin || stamina.stamina >= need) {
      const t = window.setTimeout(() => onOpenChange(false), 1600);
      return () => window.clearTimeout(t);
    }
  }, [open, successMessage, stamina, requiredAmount, onOpenChange]);

  const inCheckout = panel === 'checkout' && checkoutSecret;
  const portalRoot = useGamePortalRoot();
  const portalContainer =
    portalRoot ??
    (typeof document !== 'undefined' ? getGamePortalRoot() : null);
  const inShellFullscreen = isGameShellFullscreenPortal(portalContainer);
  const overlayZ = inShellFullscreen ? 'z-[1200]' : 'z-[200]';
  const contentZ = inShellFullscreen ? 'z-[1201]' : 'z-[201]';

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent
        portalContainer={portalContainer}
        overlayClassName={overlayZ}
        className={
          inCheckout
            ? cn(
                contentZ,
                'flex max-h-[min(92vh,720px)] flex-col overflow-hidden p-0 sm:max-w-lg',
              )
            : cn(
                contentZ,
                'max-h-[min(90vh,640px)] overflow-y-auto sm:max-w-md',
              )
        }
      >
        {inCheckout ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="relative z-[1302] shrink-0 border-b bg-background shadow-sm">
              <div className="flex items-center gap-2 px-3 py-2.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  disabled={verifyingPayment || reloadingCheckout}
                  onClick={() => {
                    if (!verifyingPayment && !reloadingCheckout) exitCheckout();
                  }}
                  aria-label="返回商店"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <DialogTitle className="min-w-0 flex-1 text-sm font-semibold leading-none">
                  付款
                </DialogTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 shrink-0 text-xs"
                  disabled={verifyingPayment || reloadingCheckout}
                  onClick={() => exitCheckout()}
                >
                  取消
                </Button>
              </div>
              <DialogDescription className="sr-only">
                購買體力包的安全付款流程
              </DialogDescription>
              <p className="border-t border-border/60 px-3 py-2 text-center text-xs text-muted-foreground">
                誤開 Link 並已關閉視窗？
                <button
                  type="button"
                  className="ml-1 font-medium text-primary underline underline-offset-2 disabled:opacity-50"
                  disabled={verifyingPayment || reloadingCheckout}
                  onClick={() => void reloadCheckout()}
                >
                  {reloadingCheckout ? '載入中…' : '重新載入付款'}
                </button>
              </p>
            </div>
            {verifyingPayment ? (
              <div className="flex flex-1 items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                付款完成，正在回復體力…
              </div>
            ) : reloadingCheckout ? (
              <div className="flex flex-1 items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                正在重新載入付款…
              </div>
            ) : (
              <div className="relative z-0 min-h-0 flex-1 overflow-y-auto px-2 pb-4">
                <StripeEmbeddedCheckoutMount
                  key={checkoutRemountKey}
                  clientSecret={checkoutSecret}
                  onComplete={() => {
                    if (pendingSessionId) void completePayment(pendingSessionId);
                  }}
                />
              </div>
            )}
            {error ? (
              <p className="relative z-[1302] border-t bg-background px-4 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg">
                <Zap className="h-5 w-5 text-amber-500" aria-hidden />
                {hasEnough ? '體力與道具' : '體力不足'}
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
                </div>
              </DialogDescription>
            </DialogHeader>

            {successMessage ? (
              <p className="flex items-center gap-2 rounded-md border border-green-800/40 bg-green-950/30 px-3 py-2 text-sm text-green-400">
                <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
                {successMessage}
              </p>
            ) : null}

            <div className="space-y-4">
              <section>
                <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                  <Package className="h-4 w-4 text-amber-500" aria-hidden />
                  持有的體力道具
                </h3>
                {loadingInventory ? (
                  <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    載入道具…
                  </div>
                ) : inventory.length > 0 ? (
                  <ul className="space-y-2">
                    {inventory.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-center gap-3 rounded-lg border bg-card p-3 shadow-sm"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/15">
                          <Zap className="h-5 w-5 text-amber-500" aria-hidden />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold leading-tight">{item.title}</p>
                          <p className="text-xs text-muted-foreground">
                            +{item.payload.stamina_amount ?? 0} 體力
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          className="shrink-0 gap-1"
                          disabled={claimingId !== null}
                          onClick={() => void handleClaimItem(item.id)}
                        >
                          {claimingId === item.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Zap className="h-3.5 w-3.5" />
                          )}
                          使用
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="rounded-lg border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
                    目前沒有可使用的體力道具
                  </p>
                )}
              </section>

              <section>
                <h3 className="mb-2 text-sm font-semibold">購買體力包</h3>
                {loadingPacks ? (
                  <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    載入商品…
                  </div>
                ) : packs.length > 0 ? (
                  <ul className="space-y-2">
                    {packs.map((item) => {
                      const staminaHint =
                        item.stamina_amount != null && item.stamina_amount > 0
                          ? `回復 ${item.stamina_amount} 體力`
                          : null;
                      return (
                        <li
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
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                    暫無上架的體力包，請稍後再試。
                  </p>
                )}
              </section>

              {error ? <p className="text-sm text-destructive">{error}</p> : null}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
