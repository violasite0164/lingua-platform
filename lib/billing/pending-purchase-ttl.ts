/** 未完成結帳的 pending 訂單保留時間（與 Stripe Checkout session 過期一致） */
export const PENDING_PURCHASE_TTL_MINUTES = 10;

export const PENDING_PURCHASE_TTL_MS = PENDING_PURCHASE_TTL_MINUTES * 60 * 1000;

export function pendingPurchaseExpiresAt(from = new Date()): Date {
  return new Date(from.getTime() + PENDING_PURCHASE_TTL_MS);
}

export function pendingPurchaseExpiresAtUnix(from = new Date()): number {
  return Math.floor(pendingPurchaseExpiresAt(from).getTime() / 1000);
}
