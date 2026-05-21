'use client';

import { useEffect, useRef, useState } from 'react';
import { Award, Heart, TrendingUp, Users } from 'lucide-react';

import { HOME_STATS } from '@/lib/marketing-home-content';
import { cn } from '@/lib/utils';

const ICONS = [Users, Award, TrendingUp, Heart] as const;

export function HomeHeroStats() {
  const ref = useRef<HTMLUListElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) setVisible(true);
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div className="relative z-20 -mt-14 pb-4 md:-mt-20 md:pb-6">
      <ul
        ref={ref}
        className="container mx-auto grid max-w-6xl grid-cols-2 gap-3 px-4 sm:gap-4 md:grid-cols-4 md:gap-5"
      >
        {HOME_STATS.map((s, i) => {
          const Icon = ICONS[i] ?? Users;
          return (
            <li
              key={s.label}
              className={cn(
                'group relative aspect-square max-h-[168px] overflow-hidden rounded-xl border-2 border-primary/15 bg-card p-4 shadow-md transition-all duration-500 ease-out sm:rounded-2xl sm:p-5 md:max-h-none',
                'hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/15',
                visible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0',
              )}
              style={{ transitionDelay: visible ? `${i * 80}ms` : '0ms' }}
            >
              {/* 方格底紋 */}
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.35] transition-opacity group-hover:opacity-50"
                style={{
                  backgroundImage: `
                    linear-gradient(to right, hsl(var(--primary) / 0.12) 1px, transparent 1px),
                    linear-gradient(to bottom, hsl(var(--primary) / 0.12) 1px, transparent 1px)
                  `,
                  backgroundSize: '14px 14px',
                }}
                aria-hidden
              />
              <div className="pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-primary/10 transition-transform duration-500 group-hover:scale-110" />

              <div className="relative flex h-full flex-col items-center justify-center text-center">
                <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground sm:size-11">
                  <Icon className="size-5 sm:size-6" aria-hidden />
                </div>
                <p className="text-xl font-bold tabular-nums tracking-tight text-primary sm:text-2xl md:text-3xl">
                  {s.value}
                </p>
                <p className="mt-1 text-xs font-medium leading-snug text-marketing-muted sm:text-sm">
                  {s.label}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
