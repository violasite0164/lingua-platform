/**
 * 導師路由與 Server Actions 授權
 */
import { redirect } from 'next/navigation';

import { getCurrentProfile } from '@/lib/supabase/queries';
import type { Profile } from '@/types/database.types';

/** 允許進入導師後台的角色（admin 方便協助維運） */
export function canAccessMentorDashboard(role: string): boolean {
  return role === 'mentor' || role === 'admin';
}

/** Server Components / Actions：非導師則 redirect */
export async function requireMentor(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect('/login?redirect=/mentor');
  }
  if (!canAccessMentorDashboard(profile.role)) {
    redirect('/dashboard');
  }
  return profile;
}
