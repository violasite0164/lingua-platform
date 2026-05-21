import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { HOME_STEPS, HOME_STEPS_TITLE } from '@/lib/marketing-home-content';

export function HomeSteps({ loggedIn = false }: { loggedIn?: boolean }) {
  return (
    <section className="bg-background py-16 md:py-20">
      <div className="container mx-auto max-w-6xl px-4 text-center">
        <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          {HOME_STEPS_TITLE}
        </h2>
        <ol className="mx-auto mt-12 grid max-w-4xl gap-8 md:grid-cols-3">
          {HOME_STEPS.map((s) => (
            <li key={s.step} className="flex flex-col items-center">
              <span className="flex size-14 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground shadow-md">
                {s.step}
              </span>
              <h3 className="mt-4 font-semibold text-foreground">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-marketing-muted">{s.desc}</p>
            </li>
          ))}
        </ol>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Button
            asChild
            size="lg"
            className="rounded-full bg-marketing-cta px-8 font-semibold text-marketing-cta-foreground hover:bg-marketing-cta/90"
          >
            <a href="#quiz">幫子女免費測驗</a>
          </Button>
          <Button asChild variant="outline" size="lg" className="rounded-full border-primary/40 text-primary">
            {loggedIn ? (
              <Link href="/dashboard">你的學習進度</Link>
            ) : (
              <Link href="/register">註冊帳號</Link>
            )}
          </Button>
        </div>
      </div>
    </section>
  );
}
