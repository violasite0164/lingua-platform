'use client';

import { cn } from '@/lib/utils';

type QuAizBotMood = 'idle' | 'correct' | 'wrong';

const MOOD_EMOJI: Record<QuAizBotMood, string> = {
  idle: '🤖',
  correct: '✨',
  wrong: '💭',
};

/** Rive 不可用時的測驗機器人靜態後備 */
export function QuAizBot({
  mood,
  text,
  className,
}: {
  mood: QuAizBotMood;
  text?: string | null;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-2 rounded-xl border border-border/60 bg-card/80 px-4 py-3 text-center shadow-sm',
        className,
      )}
      aria-hidden
    >
      <span className="text-4xl leading-none" role="img" aria-hidden>
        {MOOD_EMOJI[mood]}
      </span>
      {text ? (
        <p className="max-w-[220px] text-xs leading-snug text-muted-foreground">{text}</p>
      ) : null}
    </div>
  );
}
