import Link from 'next/link';
import { Press_Start_2P } from 'next/font/google';
import { Gamepad2 } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const pressStart2p = Press_Start_2P({ weight: '400', subsets: ['latin'], display: 'swap' });

const LEVEL_LABELS: Record<string, string> = {
  beginner: '初級',
  intermediate: '中級',
  advanced: '進階',
};

export type HomeLoggedInCourse = {
  id: string;
  title: string;
  level: string;
  thumbnail_url: string | null;
  is_free: boolean;
  price: number;
};

type HomeLoggedInDashboardProps = {
  courses: HomeLoggedInCourse[];
};

/**
 * 登入後首頁：全寬區塊 — 最新課程、8-bit 風格 AI英語鬥 入口
 * 亮色：第一行淺灰帶 `hsl(220 13% 90%)`；第二行白；暗黑：兩段皆沿用頁面 background。
 */
export function HomeLoggedInDashboard({ courses }: HomeLoggedInDashboardProps) {
  return (
    <div className="flex min-h-0 w-full flex-1 flex-col bg-[hsl(var(--background))]">
      {/* 第一行：最新課程；亮色淺灰帶（略深於先前 94% 以便與白底區隔） */}
      <section
        className="relative w-full border-b border-border bg-[hsl(220_13%_90%)] py-12 sm:py-14 lg:py-16 dark:bg-[hsl(var(--background))]"
        aria-labelledby="home-latest-courses"
      >
        <div className="relative mx-auto w-full max-w-[1800px] space-y-5 px-4 sm:px-6 lg:px-10">
          <div className="flex w-full flex-wrap items-end justify-between gap-4 border-b border-border pb-4">
            <div>
              <h2
                id="home-latest-courses"
                className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl"
              >
                最新課程
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">依上架時間排序，掌握最新內容</p>
            </div>
            <Link
              href="/courses"
              className="text-sm font-medium text-primary underline-offset-4 transition-colors hover:underline"
            >
              查看全部課程
            </Link>
          </div>

          {courses.length === 0 ? (
            <p className="rounded-lg border border-dashed border-muted-foreground/40 bg-muted/30 px-4 py-10 text-center text-sm text-muted-foreground">
              暫無公開課程，請稍後再來或前往{' '}
              <Link href="/courses" className="text-primary underline-offset-4 hover:underline">
                課程目錄
              </Link>
              。
            </p>
          ) : (
            <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {courses.map((c) => (
                <Link key={c.id} href={`/courses/${c.id}`} className="group block min-w-0">
                  <Card className="h-full overflow-hidden border-border/80 transition-shadow duration-200 hover:shadow-lg">
                    <div className="relative aspect-[16/10] w-full bg-muted">
                      {c.thumbnail_url ? (
                        <img
                          src={c.thumbnail_url}
                          alt=""
                          className="absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                          無縮圖
                        </div>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <p className="line-clamp-2 text-sm font-medium leading-snug text-foreground">
                        {c.title}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {LEVEL_LABELS[c.level] ?? c.level}
                        {c.is_free ? ' · 免費' : ` · $${c.price}`}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 第二行：AI英語鬥 8-bit */}
      <section
        className="relative w-full flex-1 bg-white py-12 sm:py-14 lg:py-16 dark:bg-[hsl(var(--background))]"
        aria-labelledby="home-quiz-arcade"
      >
        <div className="relative mx-auto w-full max-w-[1800px] space-y-4 px-4 sm:px-6 lg:px-10">
          <h2 id="home-quiz-arcade" className="sr-only">
            AI英語鬥
          </h2>
          <Link href="/quiz" className="group block w-full select-none outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            <div
              className={cn(
                pressStart2p.className,
                'relative w-full overflow-hidden border-4 border-zinc-900 bg-[#24144f]',
                'p-6 sm:p-8 md:p-10',
                /* 厚實像素陰影 + hover 略抬起 */
                'shadow-[8px_8px_0_0_rgb(24_24_27)] transition-all duration-200',
                'hover:-translate-y-1 hover:shadow-[10px_10px_0_0_rgb(24_24_27)]',
                'active:translate-x-1 active:translate-y-0 active:shadow-[4px_4px_0_0_rgb(24_24_27)]',
                'dark:border-zinc-100 dark:shadow-[8px_8px_0_0_rgb(250_250_250)]',
                'dark:hover:shadow-[10px_10px_0_0_rgb(250_250_250)] dark:active:shadow-[4px_4px_0_0_rgb(250_250_250)]',
              )}
            >
              {/* 背景像素漸層 */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#4c1d95] via-[#2e1065] to-[#1a0b38]"
              />
              {/* 簡易 scanline */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-[0.12] bg-[repeating-linear-gradient(180deg,rgba(0,0,0,0.35)_0px,rgba(0,0,0,0.35)_2px,transparent_2px,transparent_4px)]"
              />
              {/* 內框高光 */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-2 border-2 border-white/10 sm:inset-3"
              />

              <div className="relative flex flex-col gap-8 md:flex-row md:items-center md:justify-between md:gap-10">
                <div className="flex flex-1 flex-col gap-4 md:flex-row md:items-center md:gap-6">
                  <div className="flex size-16 shrink-0 items-center justify-center border-4 border-[#fde047] bg-black/50 shadow-[4px_4px_0_0_rgba(0,0,0,0.7)] sm:size-20">
                    <Gamepad2 className="size-8 text-[#fde047] sm:size-10" aria-hidden />
                  </div>
                  <div className="min-w-0 space-y-2 text-left">
                    <p className="text-[10px] tracking-[0.35em] text-[#c4b5fd] sm:text-xs">
                      ◆ ARCADE MODE ◆
                    </p>
                    <p className="text-xl leading-tight text-[#fef08a] drop-shadow-[3px_3px_0_rgba(0,0,0,0.85)] sm:text-2xl md:text-3xl">
                      AI英語鬥
                    </p>
                    <p className="font-sans text-xs leading-relaxed text-violet-100/95 sm:text-sm">
                      四種難度 · 登入記錄最高分與經驗值
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 flex-col items-center gap-2 md:items-end">
                  <span
                    className={cn(
                      'inline-flex items-center justify-center border-4 border-zinc-900 bg-[#111827] px-8 py-4 text-sm text-[#fef08a]',
                      'shadow-[inset_0_-4px_0_rgba(0,0,0,0.45)]',
                      'press-start-blink group-hover:animate-none group-hover:bg-[#1f2937]',
                    )}
                  >
                    ▶ PRESS START
                  </span>
                  <span className="font-sans text-[10px] tracking-wider text-violet-200/80">
                    點擊進入遊戲
                  </span>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}
