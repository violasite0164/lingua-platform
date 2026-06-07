'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Inbox, Loader2 } from 'lucide-react';

import { ProfileInboxPanel } from '@/components/profile/profile-inbox-panel';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';

export default function ProfileInboxPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push('/login');
        return;
      }
      setCheckingAuth(false);
    }
    void checkAuth();
  }, [router, supabase]);

  if (checkingAuth) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-10">
        <div className="flex items-center justify-between gap-3">
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <Inbox className="h-5 w-5 text-primary" />
            收件匣
          </h1>
          <Button asChild variant="ghost" size="sm">
            <Link href="/profile">返回個人資料</Link>
          </Button>
        </div>

        <ProfileInboxPanel />
      </div>
    </div>
  );
}
