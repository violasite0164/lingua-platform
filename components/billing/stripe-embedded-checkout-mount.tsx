'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { StripeEmbeddedCheckout } from '@stripe/stripe-js';

import { loadStripeClient } from '@/lib/stripe/load-stripe';
import { cn } from '@/lib/utils';

/**
 * 在既有容器內掛載 Stripe Embedded Checkout（勿再包第二層 Dialog，避免 Radix 巢狀失效）。
 */
export function StripeEmbeddedCheckoutMount({
  clientSecret,
  onComplete,
  className,
}: {
  clientSecret: string;
  onComplete: () => void | Promise<void>;
  className?: string;
}) {
  const checkoutRef = useRef<StripeEmbeddedCheckout | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const [mountEl, setMountEl] = useState<HTMLDivElement | null>(null);
  const [mountError, setMountError] = useState<string | null>(null);
  const [mounting, setMounting] = useState(true);

  const mountRef = useCallback((node: HTMLDivElement | null) => {
    setMountEl(node);
  }, []);

  const destroyCheckout = useCallback(() => {
    try {
      checkoutRef.current?.destroy();
    } catch {
      /* ignore */
    }
    checkoutRef.current = null;
  }, []);

  useEffect(() => {
    if (!clientSecret || !mountEl) return;

    let cancelled = false;
    setMounting(true);
    setMountError(null);

    void (async () => {
      const stripe = await loadStripeClient();
      if (cancelled) return;
      if (!stripe) {
        setMountError('Stripe 尚未設定（請在 .env.local 設定 NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY）');
        setMounting(false);
        return;
      }

      destroyCheckout();
      try {
        const checkout = await stripe.initEmbeddedCheckout({
          clientSecret,
          onComplete: () => {
            void onCompleteRef.current();
          },
        });
        if (cancelled) {
          checkout.destroy();
          return;
        }
        checkoutRef.current = checkout;
        checkout.mount(mountEl);
      } catch (e) {
        if (!cancelled) {
          setMountError(e instanceof Error ? e.message : '無法載入付款畫面');
        }
      } finally {
        if (!cancelled) setMounting(false);
      }
    })();

    return () => {
      cancelled = true;
      destroyCheckout();
    };
  }, [clientSecret, mountEl, destroyCheckout]);

  return (
    <div className={cn('relative w-full', className)}>
      {mounting ? (
        <div className="absolute inset-0 z-10 flex min-h-[420px] items-center justify-center bg-background/80">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
        </div>
      ) : null}
      {mountError ? (
        <p className="min-h-[120px] p-4 text-sm text-destructive">{mountError}</p>
      ) : null}
      <div ref={mountRef} className="min-h-[420px] w-full" />
    </div>
  );
}
