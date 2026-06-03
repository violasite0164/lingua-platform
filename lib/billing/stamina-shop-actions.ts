'use server';

import { getActiveShopItems } from '@/lib/billing/queries';

export type StaminaPackShopItem = {
  id: string;
  kind: string;
  title: string;
  description: string;
  price_cents: number;
  currency: string;
  stamina_amount: number | null;
};

export async function fetchActiveStaminaPacks(): Promise<StaminaPackShopItem[]> {
  const items = await getActiveShopItems();
  return items.filter((item) => item.kind === 'stamina_pack') as StaminaPackShopItem[];
}
