/**
 * 管理員路由授權（profile.role === 'admin'）
 */
import { redirect } from 'next/navigation';

import { getCurrentProfile } from '@/lib/supabase/queries';
import type { Profile } from '@/types/database.types';

export async function requireAdmin(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/login?redirect=/admin');
  if (profile.role !== 'admin') redirect('/');
  return profile;
}
