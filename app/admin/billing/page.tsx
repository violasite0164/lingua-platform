import { redirect } from 'next/navigation';

/** 舊管理員後台路徑 → 獨立訂閱與商店模組 */
export default function AdminBillingRedirectPage() {
  redirect('/commerce/manage');
}
