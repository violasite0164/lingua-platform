export const dynamic = 'force-dynamic';

import { CommercePageHeader } from '@/components/commerce/commerce-page-header';
import { ProductsManager } from '@/components/commerce/products-manager';
import { fetchAllShopItems } from '@/lib/commerce/admin-data';
import type { ShopItem } from '@/types/database.types';

export const metadata = {
  title: '商品目錄 · 商家後台',
};

export default async function CommerceProductsPage() {
  let items: ShopItem[] = [];
  let loadError: string | null = null;

  try {
    items = await fetchAllShopItems();
  } catch (e) {
    loadError = e instanceof Error ? e.message : '無法載入商品';
  }

  return (
    <div className="mx-auto max-w-6xl">
      <CommercePageHeader title="商品目錄" description="管理商店一次性商品與定價。" />
      {loadError ? (
        <p className="mb-4 rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {loadError}
        </p>
      ) : null}
      <ProductsManager items={items} />
    </div>
  );
}
