'use client';

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

/** 課程 Stripe 付款導回：確認報名並清 URL */
export function CourseCheckoutSuccess() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const checkout = searchParams?.get('checkout');
    const sessionId = searchParams?.get('session_id')?.trim() ?? '';
    if (checkout !== 'success' || !sessionId) return;

    const clean = pathname ?? '/courses';
    router.replace(clean, { scroll: false });

    let cancelled = false;

    const run = async () => {
      for (let attempt = 0; attempt < 6 && !cancelled; attempt += 1) {
        if (attempt > 0) {
          await new Promise((r) => window.setTimeout(r, 1000));
        }
        const res = await fetch('/api/stripe/checkout/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });
        const json = (await res.json()) as {
          ok?: boolean;
          status?: string;
          purchaseKind?: string;
        };
        if (!json.ok || json.status === 'pending') continue;
        if (json.purchaseKind === 'course') {
          router.refresh();
          return;
        }
      }
      router.refresh();
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [searchParams, pathname, router]);

  return null;
}
