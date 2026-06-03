import { COMMERCE_DEFAULT_CURRENCY } from '@/lib/commerce/constants';

/** 金額顯示（資料庫為 cents） */

export function formatMoneyCents(
  cents: number | null | undefined,
  currency = COMMERCE_DEFAULT_CURRENCY,
): string {
  const code = (currency || COMMERCE_DEFAULT_CURRENCY).toUpperCase();
  const amount = (cents ?? 0) / 100;
  try {
    return new Intl.NumberFormat('zh-Hant', { style: 'currency', currency: code }).format(
      amount,
    );
  } catch {
    return `${code} ${amount.toFixed(2)}`;
  }
}

export function formatCommerceDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('zh-Hant', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}
