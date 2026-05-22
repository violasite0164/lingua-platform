import type { Metadata } from 'next';

import { GamesHub } from '@/components/games/games-hub';

export const metadata: Metadata = {
  title: '英語小遊戲',
  description: '英語小遊戲專區：AI英語鬥與更多練習遊戲。',
};

export default function GamesPage() {
  return (
    <div className="flex min-h-[calc(100dvh-4rem)] flex-1 flex-col">
      <div className="shrink-0 border-b bg-background/80 px-4 py-4 backdrop-blur-sm md:px-6">
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">英語小遊戲</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          遊戲選單在下方遊戲區內三等分顯示；點選後於同一區域切換為遊戲畫面。平板與電腦為
          4:3，手機為直式螢幕比例。
        </p>
      </div>
      <div className="flex min-h-[min(70dvh,640px)] flex-1 flex-col">
        <GamesHub />
      </div>
    </div>
  );
}
