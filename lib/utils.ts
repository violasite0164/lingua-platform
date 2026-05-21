import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 格式化影片秒數 → "mm:ss" 或 "h:mm:ss" */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** 格式化價格 → "HK$xxx" 或 "免費" */
export function formatPrice(price: number, currency = 'HKD'): string {
  if (price === 0) return '免費';
  return new Intl.NumberFormat('zh-HK', { style: 'currency', currency }).format(price);
}

/** 計算課程完成百分比 */
export function calcCompletionRate(completed: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}
