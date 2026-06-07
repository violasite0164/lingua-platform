export const dynamic = 'force-dynamic';

import { CommercePageHeader } from '@/components/commerce/commerce-page-header';
import { CommerceStatusBadge } from '@/components/commerce/commerce-status-badge';
import { COMMERCE_DEFAULT_CURRENCY } from '@/lib/commerce/constants';
import { formatCommerceDate, formatMoneyCents } from '@/lib/commerce/format';
import { fetchCommerceOrders, type CommerceOrderRow } from '@/lib/commerce/admin-data';

export const metadata = {
  title: '訂單 · 商家後台',
};

export default async function CommerceOrdersPage() {
  let orders: CommerceOrderRow[] = [];
  let loadError: string | null = null;

  try {
    orders = await fetchCommerceOrders();
  } catch (e) {
    loadError = e instanceof Error ? e.message : '無法載入訂單';
  }

  return (
    <div className="mx-auto max-w-6xl">
      <CommercePageHeader
        title="訂單"
        description="商店一次性購買紀錄（Stripe Checkout）。開啟結帳後逾 10 分鐘未付款會自動標為 cancelled。"
      />

      {loadError ? (
        <p className="mb-4 rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {loadError}
        </p>
      ) : null}

      {orders.length === 0 && !loadError ? (
        <div className="rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center text-muted-foreground">
          尚無訂單。完成一筆商店結帳後會出現於此。
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">時間</th>
                <th className="px-4 py-3 font-medium">買家</th>
                <th className="px-4 py-3 font-medium">商品</th>
                <th className="px-4 py-3 font-medium">金額</th>
                <th className="px-4 py-3 font-medium">狀態</th>
                <th className="px-4 py-3 font-medium">Stripe</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatCommerceDate(order.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{order.buyer_name ?? '—'}</p>
                    <p className="font-mono text-[10px] text-muted-foreground">{order.user_id.slice(0, 8)}…</p>
                  </td>
                  <td className="px-4 py-3">
                    <p>{order.item_title ?? order.kind}</p>
                    {order.item_kind ? (
                      <p className="font-mono text-xs text-muted-foreground">{order.item_kind}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    {formatMoneyCents(order.amount_cents, order.currency ?? COMMERCE_DEFAULT_CURRENCY)}
                  </td>
                  <td className="px-4 py-3">
                    <CommerceStatusBadge status={order.status} />
                  </td>
                  <td className="max-w-[140px] truncate px-4 py-3 font-mono text-[10px] text-muted-foreground">
                    {order.stripe_checkout_session_id ?? '—'}
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
