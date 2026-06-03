export const dynamic = 'force-dynamic';

import { Suspense } from 'react';

import { requireCommerceShopAccess } from '@/lib/commerce/auth';
import { getActiveShopItems, getActiveSubscriptionPlans } from '@/lib/billing/queries';
import { CommerceCheckoutBanner } from '@/components/billing/commerce-checkout-banner';
import { SubscribeShopPage } from '@/components/billing/subscribe-shop-page';

export const metadata = {
  title: '訂閱與商店',
};

export default async function CommerceShopPage() {
  await requireCommerceShopAccess('/commerce');

  const [plans, items] = await Promise.all([
    getActiveSubscriptionPlans(),
    getActiveShopItems(),
  ]);

  return (
    <div className="container mx-auto px-4 py-8">
      <Suspense fallback={null}>
        <CommerceCheckoutBanner />
      </Suspense>
      <SubscribeShopPage plans={plans as never} items={items as never} />
    </div>
  );
}
