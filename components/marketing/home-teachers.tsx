import Image from 'next/image';

import { HOME_TEACHERS, HOME_TEACHERS_TITLE } from '@/lib/marketing-home-content';
import type { TeachersCardImageUrls } from '@/lib/homepage-public';
import { cn } from '@/lib/utils';

/** 直向方格：寬度跟隨欄位（平板／電腦約 44% 卡寬），三張卡同一比例 */
const TEACHER_IMAGE_FRAME_CLASS = cn(
  'relative mx-auto w-full max-w-[min(100%,18rem)] overflow-hidden rounded-2xl',
  'aspect-[4/5] bg-card',
  'sm:max-w-[20rem] md:mx-0 md:max-w-none',
);

type TeacherCardColor = 'primary' | 'accent';

/** 第 1、3 格副色；第 2 格主色 */
function teacherCardColor(idx: number): TeacherCardColor {
  return idx === 1 ? 'primary' : 'accent';
}

/** 整卡底色：主色 / 副色（marketing-accent），透明度提高以便與白底區分 */
const TEACHER_CARD_SHELL: Record<TeacherCardColor, string> = {
  primary: 'border-primary/40 bg-primary/20',
  accent: 'border-marketing-accent/40 bg-marketing-accent/20',
};

function TeacherCardVisual({
  imageUrl,
  fallbackLetter,
  alt,
}: {
  imageUrl: string | null;
  fallbackLetter: string;
  alt: string;
}) {
  const url = imageUrl?.trim();

  if (url) {
    const isSvg = url.endsWith('.svg');
    return (
      <div className={TEACHER_IMAGE_FRAME_CLASS}>
        <Image
          src={url}
          alt={alt}
          fill
          unoptimized={isSvg}
          sizes="(max-width: 767px) 320px, 44vw"
          className="object-contain"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        TEACHER_IMAGE_FRAME_CLASS,
        'flex items-center justify-center bg-card text-4xl font-bold text-foreground shadow-md',
      )}
    >
      {fallbackLetter}
    </div>
  );
}

export function HomeTeachers({
  teachersCardImageUrls,
}: {
  teachersCardImageUrls: TeachersCardImageUrls;
}) {
  return (
    <section className="overflow-x-hidden bg-background py-16 md:py-20">
      <div className="container mx-auto max-w-6xl px-4">
        <h2 className="text-center text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          {HOME_TEACHERS_TITLE}
        </h2>

        <ul className="mt-10 space-y-6 sm:mt-12 sm:space-y-8">
          {HOME_TEACHERS.map((t, idx) => {
            const imageOnRight = idx % 2 === 1;
            const cardColor = teacherCardColor(idx);

            return (
              <li
                key={t.name}
                className={cn(
                  'overflow-hidden rounded-2xl border',
                  TEACHER_CARD_SHELL[cardColor],
                  'grid grid-cols-1 gap-5 p-5 sm:p-6 md:items-center md:gap-8 md:p-8',
                  imageOnRight
                    ? 'md:grid-cols-[minmax(0,1fr)_44%]'
                    : 'md:grid-cols-[44%_minmax(0,1fr)]',
                )}
              >
                <div
                  className={cn(
                    'mx-auto w-full min-w-0 md:mx-0',
                    imageOnRight ? 'md:col-start-2 md:row-start-1' : 'md:col-start-1',
                  )}
                >
                  <TeacherCardVisual
                    imageUrl={teachersCardImageUrls[idx] ?? null}
                    fallbackLetter={t.name.slice(0, 1)}
                    alt={t.name}
                  />
                </div>

                <div
                  className={cn(
                    'flex min-w-0 flex-col justify-center text-left',
                    imageOnRight ? 'md:col-start-1 md:row-start-1' : 'md:col-start-2',
                  )}
                >
                  <h3 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                    {t.name}
                  </h3>
                  <p className="mt-1 text-sm font-medium text-primary">{t.role}</p>
                  <p className="mt-3 text-[15px] leading-relaxed text-marketing-muted sm:text-base sm:leading-7">
                    {t.bio}
                  </p>
                  <dl className="mt-5 flex flex-wrap justify-start gap-x-8 gap-y-3">
                    {t.stats.map((s) => (
                      <div key={s.label}>
                        <dt className="text-xs text-marketing-muted">{s.label}</dt>
                        <dd className="text-lg font-bold tabular-nums text-foreground">{s.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
