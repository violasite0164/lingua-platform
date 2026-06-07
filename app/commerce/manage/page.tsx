export const dynamic = 'force-dynamic';

import Link from 'next/link';

import { CommerceDashboardView } from '@/components/commerce/dashboard-stats';
import { CommercePageHeader } from '@/components/commerce/commerce-page-header';
import { fetchCommerceDashboardStats } from '@/lib/commerce/admin-data';

export default async function CommerceManageDashboardPage() {
  let stats;
  let loadError: string | null = null;

  try {
    stats = await fetchCommerceDashboardStats();
  } catch (e) {
    loadError = e instanceof Error ? e.message : '無法載入統計資料';
    stats = {
      productCount: 0,
      activeProductCount: 0,
      planCount: 0,
      orderTotal: 0,
      orderPaid: 0,
      orderPending: 0,
      revenueCents: 0,
      subscriptionActive: 0,
      subscriptionTotal: 0,
    };
  }

  return (
    <div className="mx-auto max-w-6xl">
      <CommercePageHeader
        title="商家總覽"
        description="訂閱與商店營運數據。結帳經 Stripe，訂單與訂閱狀態由 webhook 更新。"
      />

      {loadError ? (
        <p className="mb-4 rounded-md border border-amber-900/50 bg-amber-950/40 px-3 py-2 text-sm text-amber-200">
          {loadError}（請確認已設定 SUPABASE_SERVICE_ROLE_KEY）
        </p>
      ) : null}

      <CommerceDashboardView stats={stats} />

      <p className="mt-8 text-center text-sm text-muted-foreground">
        商店前台：
        <Link href="/commerce" className="ml-1 font-mono text-emerald-600 hover:underline dark:text-emerald-400">
          /commerce
        </Link>
        （目前僅管理員可進入）
      </p>
    </div>
  );
}
