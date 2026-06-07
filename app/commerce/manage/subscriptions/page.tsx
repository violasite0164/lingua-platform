export const dynamic = 'force-dynamic';

import { CommercePageHeader } from '@/components/commerce/commerce-page-header';
import { CommerceStatusBadge } from '@/components/commerce/commerce-status-badge';
import { formatCommerceDate } from '@/lib/commerce/format';
import { fetchCommerceSubscriptions, type CommerceSubscriptionRow } from '@/lib/commerce/admin-data';

export const metadata = {
  title: '訂閱會員 · 商家後台',
};

export default async function CommerceSubscriptionsPage() {
  let rows: CommerceSubscriptionRow[] = [];
  let loadError: string | null = null;

  try {
    rows = await fetchCommerceSubscriptions();
  } catch (e) {
    loadError = e instanceof Error ? e.message : '無法載入訂閱紀錄';
  }

  return (
    <div className="mx-auto max-w-6xl">
      <CommercePageHeader
        title="訂閱會員"
        description="使用者訂閱狀態（由 Stripe subscription webhook 更新）。"
      />

      {loadError ? (
        <p className="mb-4 rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {loadError}
        </p>
      ) : null}

      {rows.length === 0 && !loadError ? (
        <div className="rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center text-muted-foreground">
          尚無訂閱紀錄。
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">會員</th>
                <th className="px-4 py-3 font-medium">方案</th>
                <th className="px-4 py-3 font-medium">狀態</th>
                <th className="px-4 py-3 font-medium">本期結束</th>
                <th className="px-4 py-3 font-medium">更新時間</th>
                <th className="px-4 py-3 font-medium">Stripe Sub</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <p className="font-medium">{row.buyer_name ?? '—'}</p>
                    <p className="font-mono text-[10px] text-muted-foreground">{row.user_id.slice(0, 8)}…</p>
                  </td>
                  <td className="px-4 py-3">
                    <p>{row.plan_title}</p>
                    <p className="font-mono text-xs text-muted-foreground">{row.plan_code}</p>
                  </td>
                  <td className="px-4 py-3">
                    <CommerceStatusBadge status={row.status} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatCommerceDate(row.current_period_end)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatCommerceDate(row.updated_at)}
                  </td>
                  <td className="max-w-[120px] truncate px-4 py-3 font-mono text-[10px] text-muted-foreground">
                    {row.stripe_subscription_id ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
