import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { FooterVisibilityProvider } from '@/components/providers/footer-visibility-provider';
import { NavbarShell } from '@/components/layout/navbar-shell';
import { Footer } from '@/components/layout/footer';
import { SiteMarketingTheme } from '@/components/site-marketing-theme';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    template: '%s | Vint Platform',
    default: 'Vint Platform — 語言學習平台',
  },
  description: '香港中小學生英文學習平台：貼近本地教資、趣味線上課程、AI 輔助與資深師資，時間彈性在家學',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Vint Platform',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#0d9668' },
    { media: '(prefers-color-scheme: dark)',  color: '#030712' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-HK" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${inter.className} flex min-h-screen flex-col antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <SiteMarketingTheme />
          <FooterVisibilityProvider>
            <NavbarShell />
            <main className="flex min-h-0 w-full min-w-0 flex-1 flex-col">{children}</main>
            <Footer />
          </FooterVisibilityProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
