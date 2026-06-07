import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { GamesHub } from '@/components/games/games-hub';
import { MobileLandscapeEnforcer } from '@/components/games/mobile-landscape-enforcer';
import { createClient } from '@/lib/supabase/server';

export default async function GamesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirect=/games');
  }

  return (
    <MobileLandscapeEnforcer className="flex h-[min(calc(100dvh-3.5rem),calc(100svh-3.5rem))] min-h-0 w-full flex-1 flex-col">
      <Suspense
        fallback={
          <div className="flex min-h-0 flex-1 items-center justify-center">
            <div className="size-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        }
      >
        <GamesHub />
      </Suspense>
    </MobileLandscapeEnforcer>
  );
}
