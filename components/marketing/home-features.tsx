import Image from 'next/image';

import {
  HOME_FEATURES_LEFT,
  HOME_FEATURES_RIGHT,
  HOME_FEATURES_TITLE,
} from '@/lib/marketing-home-content';

function FeatureItem({ title, desc }: { title: string; desc: string }) {
  return (
    <li className="flex gap-3 sm:gap-4">
      <span
        className="mt-2 size-2.5 shrink-0 rounded-full border-2 border-marketing-accent"
        aria-hidden
      />
      <div className="min-w-0">
        <h3 className="text-base font-bold tracking-tight text-foreground md:text-lg">{title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-marketing-muted md:text-[15px]">
          {desc}
        </p>
      </div>
    </li>
  );
}

function FeaturesRightVisual({ imageUrl }: { imageUrl: string }) {
  const isSvg = imageUrl.endsWith('.svg');
  return (
    <div className="mx-auto w-full max-w-[340px] py-4 lg:mx-0 lg:ml-auto lg:py-0">
      <Image
        src={imageUrl}
        alt="學習平台學生形象"
        width={400}
        height={500}
        unoptimized={isSvg}
        className="h-auto w-full rounded-xl object-contain"
      />
    </div>
  );
}

export function HomeFeatures({
  featuresStudentImageUrl,
}: {
  featuresStudentImageUrl: string | null;
}) {
  const hasImage = !!featuresStudentImageUrl?.trim();

  return (
    <section
      className="border-y border-primary/15 bg-marketing-features-bg py-16 md:py-20"
      aria-labelledby="home-features-heading"
    >
      <div className="container mx-auto max-w-6xl px-4">
        <h2
          id="home-features-heading"
          className="text-center text-2xl font-bold tracking-tight text-foreground md:text-3xl"
        >
          {HOME_FEATURES_TITLE}
        </h2>

        <div
          className={
            hasImage
              ? 'mt-12 flex flex-col gap-10 lg:mt-14 lg:flex-row lg:items-center lg:gap-12 xl:gap-16'
              : 'mt-12 lg:mt-14'
          }
        >
          <div className={hasImage ? 'min-w-0 flex-1' : 'mx-auto max-w-4xl'}>
            <div className="grid gap-8 sm:grid-cols-2 sm:gap-x-8 lg:gap-x-10 xl:gap-x-14">
              <ul className="flex flex-col gap-8 sm:gap-9">
                {HOME_FEATURES_LEFT.map((f) => (
                  <FeatureItem key={f.title} title={f.title} desc={f.desc} />
                ))}
              </ul>
              <ul className="flex flex-col gap-8 sm:gap-9">
                {HOME_FEATURES_RIGHT.map((f) => (
                  <FeatureItem key={f.title} title={f.title} desc={f.desc} />
                ))}
              </ul>
            </div>
          </div>

          {hasImage && (
            <div className="shrink-0 lg:w-[min(340px,38%)]">
              <FeaturesRightVisual imageUrl={featuresStudentImageUrl} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
