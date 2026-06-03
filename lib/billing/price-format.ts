/** 資料庫 price_cents ↔ 後台金額輸入（主貨幣 HKD，單位為元） */

export function formatCentsAsDollarInput(cents: number | null | undefined): string {
  const value = (cents ?? 0) / 100;
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

export function parsePriceDollarsToCents(raw: unknown): number | null {
  const s = String(raw ?? '').trim();
  if (!s) return 0;
  const dollars = Number.parseFloat(s);
  if (!Number.isFinite(dollars) || dollars < 0) return null;
  return Math.round(dollars * 100);
}
