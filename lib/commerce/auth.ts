/**
 * 訂閱與商店模組授權（與 /admin 管理員後台分離）
 * - /commerce 前台：任一已登入使用者
 * - /commerce/manage：僅 admin
 */
import { redirect } from 'next/navigation';

import { getCurrentProfile } from '@/lib/supabase/queries';
import type { Profile, UserRole } from '@/types/database.types';

export function canManageCommerce(role: UserRole | string): boolean {
  return role === 'admin';
}

/** @deprecated 請用 canManageCommerce；保留以免舊程式碼編譯失敗 */
export function canAccessCommerce(role: UserRole | string): boolean {
  return canManageCommerce(role);
}

/** 商店前台 /commerce：已登入即可 */
export async function requireCommerceShopAccess(
  redirectPath = '/commerce',
): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect(`/login?redirect=${encodeURIComponent(redirectPath)}`);
  }
  return profile;
}

/** 商家後台 /commerce/manage：僅 admin */
export async function requireCommerceManageAccess(
  redirectPath = '/commerce/manage',
): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect(`/login?redirect=${encodeURIComponent(redirectPath)}`);
  }
  if (!canManageCommerce(profile.role)) {
    redirect('/');
  }
  return profile;
}

/** 商家後台專用（與 requireCommerceManageAccess 相同） */
export async function requireCommerceAccess(
  redirectPath = '/commerce/manage',
): Promise<Profile> {
  return requireCommerceManageAccess(redirectPath);
}
