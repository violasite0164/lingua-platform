import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '英語大冒險',
  description: '四選一英語測驗，累積 XP 與排行榜。',
};

export default function GamesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
