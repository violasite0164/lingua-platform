import { Quote } from 'lucide-react';

import { HOME_TESTIMONIALS, HOME_TESTIMONIALS_TITLE } from '@/lib/marketing-home-content';

export function HomeTestimonials() {
  return (
    <section className="bg-marketing-testimonials-bg py-16 md:py-20">
      <div className="container mx-auto max-w-6xl px-4">
        <h2 className="text-center text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          {HOME_TESTIMONIALS_TITLE}
        </h2>
        <ul className="mt-12 grid gap-6 md:grid-cols-2">
          {HOME_TESTIMONIALS.map((text, i) => (
            <li
              key={i}
              className="relative rounded-xl border border-border/80 bg-card p-6 shadow-sm"
            >
              <Quote className="absolute right-4 top-4 size-8 text-primary/15" aria-hidden />
              <p className="text-sm leading-relaxed text-foreground">&ldquo;{text}&rdquo;</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
