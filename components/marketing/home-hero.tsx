import Image from 'next/image';
import Link from 'next/link';

import { HomeHeroStats } from '@/components/marketing/home-hero-stats';
import { Button } from '@/components/ui/button';
import { HOME_HERO } from '@/lib/marketing-home-content';
import type { HomeBackdropMedia } from '@/lib/homepage-public';

export function HomeHero({ media }: { media: HomeBackdropMedia | null }) {
  const img =
    media?.imageEnabled !== false ? media?.imageUrl?.trim() || null : null;
  const video =
    media?.videoEnabled !== false ? media?.videoUrl?.trim() || null : null;
  const showVideo = Boolean(video) && !img;

  return (
    <section className="relative w-full">
      {/* Part 1：全幅背景 + 置中文案 */}
      <div className="relative flex min-h-[min(72vh,640px)] w-full items-center justify-center overflow-hidden md:min-h-[min(78vh,720px)]">
        {showVideo ? (
          <video
            className="absolute inset-0 size-full object-cover"
            src={video!}
            autoPlay
            muted
            loop
            playsInline
            aria-hidden
          />
        ) : img ? (
          <Image
            src={img}
            alt=""
            fill
            priority
            className="object-cover object-center"
            sizes="100vw"
          />
        ) : (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage:
                'linear-gradient(135deg, hsl(158 45% 32%) 0%, hsl(158 55% 22%) 50%, hsl(200 40% 25%) 100%)',
            }}
            aria-hidden
          />
        )}

        {/* 遮罩：中央較深、上下漸淺，方便白字閱讀 */}
        <div
          className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/45 to-black/65"
          aria-hidden
        />

        <div className="relative z-10 mx-auto max-w-4xl px-4 py-16 text-center sm:px-6">
          <p className="text-sm font-medium tracking-wide text-white/90 md:text-base">
            {HOME_HERO.eyebrow}
          </p>
          <h1 className="mt-4 text-balance text-3xl font-bold leading-tight tracking-tight text-white drop-shadow-sm sm:text-4xl md:text-5xl lg:text-[3.25rem]">
            {HOME_HERO.title}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-relaxed text-white/90 sm:text-lg">
            {HOME_HERO.subtitle}
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="h-14 min-w-[220px] rounded-full bg-marketing-cta px-10 text-base font-bold text-marketing-cta-foreground shadow-lg shadow-black/30 hover:scale-[1.03] hover:bg-marketing-cta/95 active:scale-[0.98]"
            >
              <a href="#quiz">{HOME_HERO.ctaPrimary}</a>
            </Button>
            <Link
              href="/courses"
              className="text-sm font-semibold text-white underline-offset-4 hover:underline"
            >
              {HOME_HERO.ctaSecondary}
            </Link>
          </div>
        </div>

        {/* 底部漸層，接下方方格區 */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[hsl(var(--marketing-surface))] to-transparent"
          aria-hidden
        />
      </div>

      {/* Part 2：Hero 正下方 — 有方格效果的統計卡（略為上移疊在 hero 底） */}
      <HomeHeroStats />
    </section>
  );
}
