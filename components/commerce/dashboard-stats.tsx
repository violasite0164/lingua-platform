import Link from 'next/link';
import { ArrowRight, CreditCard, DollarSign, Package, ShoppingCart, Users } from 'lucide-react';

import { COMMERCE_DEFAULT_CURRENCY } from '@/lib/commerce/constants';
import { formatMoneyCents } from '@/lib/commerce/format';
import type { CommerceDashboardStats as DashboardStats } from '@/lib/commerce/admin-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function CommerceDashboardView({ stats }: { stats: DashboardStats }) {
  const cards: {
    label: string;
    value: string;
    sub?: string;
    icon: typeof DollarSign;
    href: string;
  }[] = [
    {
      label: '累計營收（已付款訂單）',
      value: formatMoneyCents(stats.revenueCents, COMMERCE_DEFAULT_CURRENCY),
      icon: DollarSign,
      href: '/commerce/manage/orders',
    },
    {
      label: '訂單',
      value: `${stats.orderPaid} 已付 / ${stats.orderPending} 待付`,
      sub: `共 ${stats.orderTotal} 筆`,
      icon: ShoppingCart,
      href: '/commerce/manage/orders',
    },
    {
      label: '商品',
      value: `${stats.activeProductCount} 上架`,
      sub: `共 ${stats.productCount} 項`,
      icon: Package,
      href: '/commerce/manage/products',
    },
    {
      label: '訂閱會員',
      value: `${stats.subscriptionActive} 有效`,
      sub: `共 ${stats.subscriptionTotal} 筆紀錄`,
      icon: Users,
      href: '/commerce/manage/subscriptions',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, sub, icon: Icon, href }) => (
          <Link
            key={label}
            href={href}
            className="group block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <Card className="h-full transition-colors hover:border-emerald-200/60">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
                <Icon className="h-4 w-4 text-emerald-600 opacity-80 dark:text-emerald-400" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{value}</p>
                {sub ? <p className="mt-1 text-xs text-muted-foreground">{sub}</p> : null}
                <p className="mt-2 flex items-center text-xs text-emerald-600 group-hover:text-emerald-700 dark:text-emerald-400">
                  查看詳情
                  <ArrowRight className="ml-0.5 h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <QuickLinkCard
          href="/commerce/manage/products"
          title="商品目錄"
          description="新增、編輯、上下架一次性商品（體力包等）。"
          icon={Package}
        />
        <QuickLinkCard
          href="/commerce/manage/plans"
          title="訂閱方案"
          description="設定 basic / pro 方案與 Stripe Price ID。"
          icon={CreditCard}
        />
      </div>
    </div>
  );
}

function QuickLinkCard({
  href,
  title,
  description,
  icon: Icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: typeof Package;
}) {
  return (
    <Link
      href={href}
      className="group flex gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-emerald-200/60 hover:bg-accent/30"
    >
      <Icon className="h-8 w-8 shrink-0 text-emerald-600 dark:text-emerald-400" />
      <div className="min-w-0 flex-1">
        <p className="font-medium">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 self-center text-muted-foreground group-hover:text-foreground" />
    </Link>
  );
}
