export const dynamic = 'force-dynamic';

import { Suspense } from 'react';

import { requireCommerceShopAccess } from '@/lib/commerce/auth';
import { getActiveShopItems, getActiveSubscriptionPlans } from '@/lib/billing/queries';
import { CommerceCheckoutBanner } from '@/components/billing/commerce-checkout-banner';
import { SubscribeShopPage } from '@/components/billing/subscribe-shop-page';

export const metadata = {
  title: '訂閱與商店',
};

type CommercePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function toSearchParams(input: Record<string, string | string[] | undefined>): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        params.append(key, item);
      }
    } else if (typeof value === 'string') {
      params.set(key, value);
    }
  }
  return params;
}

export default async function CommerceShopPage({ searchParams }: CommercePageProps) {
  const sp = await searchParams;
  const q = toSearchParams(sp).toString();
  const redirectPath = q ? `/commerce?${q}` : '/commerce';
  await requireCommerceShopAccess(redirectPath);

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
