'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { CommerceActionBanner } from '@/components/commerce/commerce-action-banner';
import { commerceInputClass, commerceLabelClass } from '@/components/commerce/field-classes';
import { formatCentsAsDollarInput } from '@/lib/billing/price-format';
import {
  upsertSubscriptionPlanFormAction,
  type CommerceManageFormState,
} from '@/lib/commerce/manage-actions';
import { COMMERCE_DEFAULT_CURRENCY } from '@/lib/commerce/constants';
import { formatMoneyCents } from '@/lib/commerce/format';
import type { SubscriptionPlanGiftEntry } from '@/lib/commerce/admin-data';
import type { ShopItem, SubscriptionPlan } from '@/types/database.types';

const PLAN_CODES = ['basic', 'pro'] as const;

const PLAN_LABELS: Record<(typeof PLAN_CODES)[number], string> = {
  basic: '基本訂閱',
  pro: '進階訂閱',
};

export function PlansManager({
  plans,
  shopItems,
  giftsByPlan,
}: {
  plans: SubscriptionPlan[];
  shopItems: ShopItem[];
  giftsByPlan: Record<string, SubscriptionPlanGiftEntry[]>;
}) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        訂閱使用 Stripe Checkout（每月扣款）。已填價格即可結帳；若有 Stripe recurring Price ID
        可填入以沿用既有方案，未填則結帳時依價格自動建立。
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        {PLAN_CODES.map((code) => {
          const plan = plans.find((p) => p.code === code) ?? null;
          return (
            <PlanEditorCard
              key={code}
              code={code}
              plan={plan}
              shopItems={shopItems}
              planGifts={giftsByPlan[code] ?? []}
            />
          );
        })}
      </div>
    </div>
  );
}

function PlanEditorCard({
  code,
  plan,
  shopItems,
  planGifts,
}: {
  code: (typeof PLAN_CODES)[number];
  plan: SubscriptionPlan | null;
  shopItems: ShopItem[];
  planGifts: SubscriptionPlanGiftEntry[];
}) {
  const giftQtyByItemId = Object.fromEntries(
    planGifts.map((g) => [g.shopItemId, g.quantity]),
  );

  const router = useRouter();
  const [formRevision, setFormRevision] = useState(0);
  const [state, formAction] = useActionState<CommerceManageFormState, FormData>(
    upsertSubscriptionPlanFormAction,
    null,
  );

  useEffect(() => {
    if (state?.ok !== true) return;
    setFormRevision((v) => v + 1);
    router.refresh();
  }, [state?.ok, state?.message, router]);

  const formKey = `${code}-${plan?.updated_at ?? plan?.id ?? 'new'}-${formRevision}`;

  return (
    <form
      key={formKey}
      action={formAction}
      className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm"
    >
      <input type="hidden" name="code" value={code} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold">{PLAN_LABELS[code]}</h3>
          <p className="font-mono text-xs text-muted-foreground">{code}</p>
        </div>
        {plan ? (
          <span className="text-sm text-muted-foreground">
            現價 {formatMoneyCents(plan.price_cents, plan.currency)}
          </span>
        ) : null}
      </div>

      <CommerceActionBanner state={state} />

      <label className={commerceLabelClass}>
        啟用
        <span className="mt-1 flex items-center gap-2 text-sm">
          <input type="checkbox" name="is_active" defaultChecked={plan?.is_active ?? true} />
          於商店顯示
        </span>
      </label>

      <label className={commerceLabelClass}>
        遊戲權益
        <span className="mt-1 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="free_play_games"
            defaultChecked={plan?.free_play_games ?? false}
          />
          訂閱期內 FREE PLAY（遊戲不扣體力）
        </span>
      </label>

      <label className={commerceLabelClass}>
        標題
        <input
          name="title"
          required
          defaultValue={plan?.title ?? PLAN_LABELS[code]}
          className={commerceInputClass}
        />
      </label>

      <label className={commerceLabelClass}>
        描述
        <textarea
          name="description"
          rows={2}
          defaultValue={plan?.description ?? ''}
          className={commerceInputClass}
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className={commerceLabelClass}>
          價格（HKD）
          <input
            name="price_dollars"
            type="number"
            min={0}
            step={0.01}
            inputMode="decimal"
            defaultValue={formatCentsAsDollarInput(plan?.price_cents)}
            className={commerceInputClass}
          />
        </label>
        <label className={commerceLabelClass}>
          幣別
          <input
            name="currency"
            defaultValue={plan?.currency ?? COMMERCE_DEFAULT_CURRENCY}
            className={commerceInputClass}
          />
        </label>
      </div>

      <div className={commerceLabelClass}>
        <span>訂閱成功後贈送商品（可選多項；件數為獨立收件匣道具各一則）</span>
        {shopItems.length > 0 ? (
          <ul className="mt-2 max-h-48 space-y-2 overflow-y-auto rounded-md border border-border p-2">
            {shopItems.map((item) => (
              <li key={item.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="gift_shop_item_ids"
                  value={item.id}
                  defaultChecked={item.id in giftQtyByItemId}
                  className="h-4 w-4 shrink-0 rounded border-input"
                  aria-label={`贈送 ${item.title}`}
                />
                <span className="min-w-0 flex-1">
                  {item.title}
                  <span className="ml-1 text-xs text-muted-foreground">
                    ({item.kind}
                    {item.stamina_amount != null ? ` · 每組 +${item.stamina_amount} 體力` : ''})
                  </span>
                </span>
                <label className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                  件數
                  <input
                    type="number"
                    name={`gift_qty_${item.id}`}
                    min={1}
                    max={99}
                    defaultValue={giftQtyByItemId[item.id] ?? 1}
                    className={`${commerceInputClass} h-8 w-14 px-2 text-center text-sm`}
                  />
                </label>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-xs text-muted-foreground">
            尚無商店商品，請先到「商品管理」建立體力包等商品。
          </p>
        )}
      </div>

      <label className={commerceLabelClass}>
        Stripe Price ID
        <input
          name="stripe_price_id"
          placeholder="price_..."
          defaultValue={plan?.stripe_price_id ?? ''}
          className={`${commerceInputClass} font-mono text-xs`}
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className={commerceLabelClass}>
          排序
          <input
            name="sort_order"
            type="number"
            defaultValue={plan?.sort_order ?? (code === 'basic' ? 0 : 1)}
            className={commerceInputClass}
          />
        </label>
        <button
          type="submit"
          className="mt-5 h-10 rounded-md bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-500"
        >
          儲存方案
        </button>
      </div>
    </form>
  );
}
