import { redirect } from 'next/navigation';

/** 舊路徑導向獨立訂閱與商店模組 */
export default function SubscribeRedirectPage() {
  redirect('/commerce');
}
