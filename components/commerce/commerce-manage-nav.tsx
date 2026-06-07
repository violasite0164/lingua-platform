'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ArrowLeft,
  CreditCard,
  LayoutDashboard,
  Package,
  ShoppingCart,
  Store,
  Users,
} from 'lucide-react';

import { GUEST_HOME_PATH } from '@/lib/site-routes';
import { cn } from '@/lib/utils';

const NAV: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
}[] = [
  { href: '/commerce/manage', label: '總覽', icon: LayoutDashboard, exact: true },
  { href: '/commerce/manage/products', label: '商品目錄', icon: Package },
  { href: '/commerce/manage/plans', label: '訂閱方案', icon: CreditCard },
  { href: '/commerce/manage/orders', label: '訂單', icon: ShoppingCart },
  { href: '/commerce/manage/subscriptions', label: '訂閱會員', icon: Users },
];

const STOREFRONT = { href: '/commerce', label: '商店前台', icon: Store } as const;

function isActive(pathname: string, href: string, exact?: boolean): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function CommerceManageNav({ variant }: { variant: 'sidebar' | 'mobile' }) {
  const pathname = usePathname() ?? '';

  const linkClass = (active: boolean) =>
    cn(
      'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
      active
        ? 'bg-emerald-600/10 font-medium text-emerald-700 dark:text-emerald-300'
        : 'text-muted-foreground hover:bg-accent hover:text-foreground',
      variant === 'mobile' && 'shrink-0 text-xs',
    );

  if (variant === 'mobile') {
    return (
      <div className="flex gap-1 overflow-x-auto border-b border-border bg-card px-2 py-2 lg:hidden">
        {[...NAV, STOREFRONT].map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={linkClass(
              isActive(pathname, href, href === '/commerce/manage'),
            )}
          >
            {label}
          </Link>
        ))}
      </div>
    );
  }

  return (
    <aside className="relative hidden w-56 shrink-0 flex-col border-r border-border bg-card lg:flex">
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <Store className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
        <span className="font-semibold tracking-tight">商家後台</span>
      </div>
      <nav className="flex flex-col gap-0.5 p-3">
        {NAV.map(({ href, label, icon: Icon, exact }) => (
          <Link
            key={href}
            href={href}
            className={linkClass(isActive(pathname, href, exact))}
          >
            <Icon className="size-4 shrink-0 opacity-80" />
            {label}
          </Link>
        ))}
        <div className="my-2 border-t border-border" />
        <Link href={STOREFRONT.href} className={linkClass(isActive(pathname, STOREFRONT.href))}>
          <STOREFRONT.icon className="size-4 shrink-0 opacity-80" />
          {STOREFRONT.label}
        </Link>
      </nav>
      <div className="mt-auto border-t border-border p-4">
        <Link
          href={GUEST_HOME_PATH}
          className="flex items-center gap-2 text-[11px] text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          返回網站首頁
        </Link>
      </div>
    </aside>
  );
}
