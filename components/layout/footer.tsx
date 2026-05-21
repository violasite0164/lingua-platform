'use client';

import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useFooterVisibility } from '@/components/providers/footer-visibility-provider';
import { GUEST_HOME_PATH } from '@/lib/site-routes';

const LINKS = {
  學習: [
    { href: '/courses',     label: '所有課程' },
    { href: '/leaderboard', label: '排行榜' },
  ],
  關於: [
    { href: '/about',   label: '關於我們' },
    { href: '/pricing', label: '定價方案' },
    { href: '/blog',    label: '學習資訊' },
  ],
  支援: [
    { href: '/faq',     label: '常見問題' },
    { href: '/contact', label: '聯絡我們' },
    { href: '/privacy', label: '私隱政策' },
    { href: '/terms',   label: '服務條款' },
  ],
};

export function Footer() {
  const { footerVisible } = useFooterVisibility();

  if (!footerVisible) return null;

  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href={GUEST_HOME_PATH} className="flex items-center gap-2 font-bold text-base mb-3">
              <BookOpen className="h-5 w-5 text-primary" />
              LinguaLearn
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              系統化學習語言，互動影片課程配合<br />
              遊戲化進度追蹤，讓學習更有趣。
            </p>
          </div>

          {/* Links */}
          {Object.entries(LINKS).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-sm font-semibold mb-3">{category}</h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} LinguaLearn. 保留所有權利。</p>
          <p>Made with Next.js · Supabase · Cloudflare</p>
        </div>
      </div>
    </footer>
  );
}
