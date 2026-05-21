'use client';

import { HOME_FAQ, HOME_FAQ_TITLE } from '@/lib/marketing-home-content';
import { cn } from '@/lib/utils';

export function HomeFaq() {
  return (
    <section className="border-y border-primary/15 bg-marketing-features-bg py-16 md:py-20">
      <div className="container mx-auto max-w-3xl px-4">
        <h2 className="text-center text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          {HOME_FAQ_TITLE}
        </h2>
        <div className="mt-10 space-y-3">
          {HOME_FAQ.map((item) => (
            <details
              key={item.q}
              className="group rounded-xl border border-border/80 bg-card px-5 py-1 shadow-sm open:shadow-md"
            >
              <summary
                className={cn(
                  'flex cursor-pointer list-none items-center justify-between gap-3 py-4 text-left font-medium text-foreground',
                  '[&::-webkit-details-marker]:hidden',
                )}
              >
                {item.q}
                <span className="text-primary transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="border-t border-border/60 pb-4 pt-2 text-sm leading-relaxed text-marketing-muted">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
