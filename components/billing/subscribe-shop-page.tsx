'use client';

import { useState } from 'react';
import { AlertCircle, Loader2, Package, ShoppingBag, Sparkles, Zap } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { startStripeCheckout } from '@/lib/billing/checkout-client';
import { COMMERCE_DEFAULT_CURRENCY } from '@/lib/commerce/constants';
import { formatMoneyCents } from '@/lib/commerce/format';
import { cn } from '@/lib/utils';

type Plan = {
  id: string;
  code: string;
  title: string;
  description: string;
  price_cents: number;
  currency: string;
  free_play_games?: boolean;
};

type Item = {
  id: string;
  kind: string;
  title: string;
  description: string;
  price_cents: number;
  currency: string;
  stamina_amount: number | null;
};

const STAMINA_PACK_FALLBACK = {
  title: '遊戲體力包',
  description: '回復 10 體力',
  price_cents: 1500,
  stamina_amount: 10,
} as const;

export function SubscribeShopPage({
  plans,
  items,
}: {
  plans: Plan[];
  items: Item[];
}) {
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const basic = plans.find((p) => p.code === 'basic') ?? null;
  const pro = plans.find((p) => p.code === 'pro') ?? null;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 py-2">
      <header className="space-y-1 text-center lg:text-left">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">訂閱與商店</h1>
        <p className="text-sm text-muted-foreground">
          左側選擇訂閱方案，右側商店可購買遊戲道具。體力包付款成功後會送至個人資料收件匣。
        </p>
      </header>

      {checkoutError ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>{checkoutError}</p>
        </div>
      ) : null}

      {/* 打直三部分：左二（訂閱）＋右一（商店） */}
      <div className="grid gap-4 lg:grid-cols-3 lg:items-stretch">
        <div className="grid gap-4 lg:col-span-2 lg:grid-rows-2">
          <PlanCard
            title={basic?.title ?? '基本訂閱'}
            description={basic?.description ?? '適合一般學習需求'}
            priceLabel={
              basic && basic.price_cents > 0
                ? formatMoneyCents(basic.price_cents, basic.currency)
                : '請於後台設定價格'
            }
            disabled={!basic}
            loading={loadingKey === `plan:${basic?.code ?? 'basic'}`}
            onClick={async () => {
              if (!basic) return;
              setLoadingKey(`plan:${basic.code}`);
              setCheckoutError(null);
              try {
                const url = await startStripeCheckout({ kind: 'subscription', planCode: basic.code });
                window.location.href = url;
              } catch (e) {
                setCheckoutError(e instanceof Error ? e.message : '無法開始付款，請稍後再試');
                setLoadingKey(null);
              }
            }}
          />

          <PlanCard
            variant="pro"
            title={pro?.title ?? '進階訂閱'}
            description={pro?.description ?? '適合高頻練習與進階功能'}
            priceLabel={
              pro && pro.price_cents > 0
                ? formatMoneyCents(pro.price_cents, pro.currency)
                : '請於後台設定價格'
            }
            disabled={!pro}
            loading={loadingKey === `plan:${pro?.code ?? 'pro'}`}
            onClick={async () => {
              if (!pro) return;
              setLoadingKey(`plan:${pro.code}`);
              setCheckoutError(null);
              try {
                const url = await startStripeCheckout({ kind: 'subscription', planCode: pro.code });
                window.location.href = url;
              } catch (e) {
                setCheckoutError(e instanceof Error ? e.message : '無法開始付款，請稍後再試');
                setLoadingKey(null);
              }
            }}
          />
        </div>

        <section className="flex min-h-[280px] flex-col rounded-xl border bg-card p-5 shadow-sm lg:min-h-0">
          <div className="flex items-center gap-2 border-b border-border/60 pb-3">
            <ShoppingBag className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-semibold">商店</h2>
            {items.length > 0 ? (
              <span className="ml-auto text-xs text-muted-foreground">{items.length} 項商品</span>
            ) : null}
          </div>

          <div className="mt-4 flex flex-1 flex-col gap-3 overflow-y-auto">
            {items.length > 0 ? (
              items.map((item) => (
                <ShopItemCard
                  key={item.id}
                  item={item}
                  loading={loadingKey === `item:${item.id}`}
                  onBuy={async () => {
                    setLoadingKey(`item:${item.id}`);
                    setCheckoutError(null);
                    try {
                      const url = await startStripeCheckout({
                        kind: 'shop_item',
                        shopItemId: item.id,
                      });
                      window.location.href = url;
                    } catch (e) {
                      setCheckoutError(
                        e instanceof Error ? e.message : '無法開始付款，請稍後再試',
                      );
                      setLoadingKey(null);
                    }
                  }}
                />
              ))
            ) : (
              <div className="flex flex-1 flex-col justify-center rounded-lg border border-dashed border-border/80 bg-muted/30 p-4 text-center">
                <Zap className="mx-auto h-8 w-8 text-amber-500" />
                <p className="mt-2 font-medium">{STAMINA_PACK_FALLBACK.title}</p>
                <p className="text-sm text-muted-foreground">
                  {STAMINA_PACK_FALLBACK.description}
                </p>
                <p className="mt-2 text-lg font-bold">
                  {formatMoneyCents(STAMINA_PACK_FALLBACK.price_cents, COMMERCE_DEFAULT_CURRENCY)}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  尚無已上架商品，請於商家後台新增並啟用。
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function PlanCard({
  title,
  description,
  priceLabel,
  freePlayGames,
  disabled,
  loading,
  onClick,
  variant,
}: {
  title: string;
  description: string;
  priceLabel: string;
  freePlayGames?: boolean;
  disabled?: boolean;
  loading?: boolean;
  onClick: () => void;
  variant?: 'pro';
}) {
  return (
    <div
      className={cn(
        'flex h-full min-h-[200px] flex-col rounded-xl border bg-card p-5 shadow-sm',
        variant === 'pro' && 'border-violet-300/40 bg-violet-50/20 dark:bg-violet-950/20',
      )}
    >
      <div className="flex items-center gap-2">
        <Sparkles
          className={cn('h-5 w-5', variant === 'pro' ? 'text-violet-500' : 'text-sky-500')}
        />
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      <p className="mt-2 flex-1 text-sm text-muted-foreground">{description}</p>
      {freePlayGames ? (
        <p className="mt-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          訂閱期內遊戲 FREE PLAY（不扣體力）
        </p>
      ) : null}
      <div className="mt-4 flex items-end justify-between gap-3 border-t border-border/50 pt-4">
        <div>
          <p className="text-2xl font-bold">{priceLabel}</p>
          <p className="text-xs text-muted-foreground">每月</p>
        </div>
        <Button disabled={disabled || loading} onClick={onClick}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          訂閱
        </Button>
      </div>
    </div>
  );
}

function ShopItemCard({
  item,
  loading,
  onBuy,
}: {
  item: Item;
  loading?: boolean;
  onBuy: () => void;
}) {
  const isStamina = item.kind === 'stamina_pack';
  const Icon = isStamina ? Zap : Package;
  const staminaHint =
    item.stamina_amount != null && item.stamina_amount > 0
      ? `回復 ${item.stamina_amount} 體力`
      : null;

  return (
    <div
      className={cn(
        'rounded-lg border p-4',
        isStamina
          ? 'border-amber-200/50 bg-amber-50/30 dark:border-amber-900/40 dark:bg-amber-950/20'
          : 'border-border/80 bg-muted/20',
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-lg',
            isStamina ? 'bg-amber-500/15' : 'bg-muted',
          )}
        >
          <Icon
            className={cn(
              'h-6 w-6',
              isStamina ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground',
            )}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-snug">{item.title}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {item.description || staminaHint || item.kind}
          </p>
          <p className="mt-2 text-xl font-bold">
            {formatMoneyCents(item.price_cents, item.currency)}
          </p>
        </div>
      </div>
      <Button className="mt-4 w-full" disabled={loading} onClick={onBuy}>
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        購買
      </Button>
    </div>
  );
}
