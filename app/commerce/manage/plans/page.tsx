export const dynamic = 'force-dynamic';

import { CommercePageHeader } from '@/components/commerce/commerce-page-header';
import { PlansManager } from '@/components/commerce/plans-manager';
import {
  fetchAllShopItems,
  fetchAllSubscriptionPlans,
  fetchSubscriptionPlanGiftMap,
} from '@/lib/commerce/admin-data';
import type { ShopItem, SubscriptionPlan } from '@/types/database.types';

export const metadata = {
  title: '訂閱方案 · 商家後台',
};

export default async function CommercePlansPage() {
  let plans: SubscriptionPlan[] = [];
  let shopItems: ShopItem[] = [];
  let giftsByPlan: Awaited<ReturnType<typeof fetchSubscriptionPlanGiftMap>> = {};
  let loadError: string | null = null;

  try {
    [plans, shopItems, giftsByPlan] = await Promise.all([
      fetchAllSubscriptionPlans(),
      fetchAllShopItems(),
      fetchSubscriptionPlanGiftMap(),
    ]);
  } catch (e) {
    loadError = e instanceof Error ? e.message : '無法載入訂閱方案';
  }

  return (
    <div className="mx-auto max-w-6xl">
      <CommercePageHeader title="訂閱方案" description="設定月費／年費方案與 Stripe 串接。" />
      {loadError ? (
        <p className="mb-4 rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {loadError}
        </p>
      ) : null}
      <PlansManager plans={plans} shopItems={shopItems} giftsByPlan={giftsByPlan} />
    </div>
  );
}
