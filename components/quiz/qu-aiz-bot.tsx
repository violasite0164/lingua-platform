'use client';

import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

type QuAizBotMood = 'idle' | 'correct' | 'wrong';

export function QuAizBot({
  className,
  mood = 'idle',
  text,
}: {
  className?: string;
  mood?: QuAizBotMood;
  text?: string | null;
}) {
  const frames = useMemo(() => {
    const isTalking = Boolean(text);
    const amp = mood === 'wrong' ? 3 : mood === 'correct' ? 2 : 2;
    const speed = mood === 'wrong' ? 80 : isTalking ? 90 : 110;
    const MAX_SHIFT = 2;
    const NEUTRAL_PAD = 6;

    // 以「重繪」方式做像素動畫：
    // - 頭部：只做極小位移（幾乎不動）
    // - 表情：偶爾合眼 / 合咀
    // - 下身：大幅度左右扭動（靠方塊出現/消失與位移）
    const headOpen = [
      '┌─■─┐',
      '▄███████▄',
      '███ ● ● ███',
      '███   ▽ ███',
      '▀███████▀',
    ];

    const headClosedEyes = [
      '┌─■─┐',
      '▄███████▄',
      '███ ─ ─ ███',
      '███   ▽ ███',
      '▀███████▀',
    ];

    const headClosedMouth = [
      '┌─■─┐',
      '▄███████▄',
      '███ ● ● ███',
      '███   ─ ███',
      '▀███████▀',
    ];

    const bodyA = [
      '▄██████████▄',
      '████████████',
      '████████████',
      '▀████████▀',
      '   █     █',
      '  ███   ███',
      ' █▀█   █▀█',
    ];

    // 臀部向右（幅度加大）：下身位移 + 局部方塊閃現/消失
    const bodyB = [
      '▄██████████▄',
      '████████████',
      '████████████',
      '▀████████▀',
      '      █  █  █',
      '     ███ ███',
      '    █▀█  █▀█',
    ];

    // 臀部向右（更誇張一格）
    const bodyB2 = [
      '▄██████████▄',
      '████████████',
      '████████████',
      '▀████████▀',
      '       █ █   █',
      '      ███ ███',
      '     █▀█  █▀█',
    ];

    // 臀部向左（幅度加大）：另一側
    const bodyC = [
      '▄██████████▄',
      '████████████',
      '████████████',
      '▀████████▀',
      '█  █  █      ',
      '███ ███      ',
      '█▀█  █▀█     ',
    ];

    // 臀部向左（更誇張一格）
    const bodyC2 = [
      '▄██████████▄',
      '████████████',
      '████████████',
      '▀████████▀',
      '█   █ █     ',
      '███ ███     ',
      '█▀█  █▀█    ',
    ];

    type ArmPose = 'up' | 'mid' | 'down';
    const withStraightArms = (body: string[], pose: ArmPose, len: number) => {
      // 伸直手臂 + 手掌（更容易看出「手在擺」）
      const armCore = '─'.repeat(Math.max(2, len));
      // 用純 ASCII 避免像素字缺字導致顯示成奇怪中文字（例如「出」）
      const handL = '[]';
      const handR = '[]';
      const arm = `${handL}${armCore}`;
      const armR = `${armCore}${handR}`;
      const empty = ' '.repeat(arm.length);
      const emptyR = ' '.repeat(armR.length);

      const poseRow =
        pose === 'up' ? 0
        : pose === 'mid' ? 1
        : 2;

      // 讓手臂有「擺動」厚度：主行顯示完整手臂，隔壁行顯示短一截（殘影）
      const left = (i: number) => {
        if (i === poseRow) return arm;
        if (i === poseRow - 1 || i === poseRow + 1) return `${handL}${'─'.repeat(Math.max(1, len - 2))} `;
        return empty;
      };
      const right = (i: number) => {
        if (i === poseRow) return armR;
        if (i === poseRow - 1 || i === poseRow + 1) return ` ${'─'.repeat(Math.max(1, len - 2))}${handR}`;
        return emptyR;
      };
      return body.map((line, i) => {
        // 所有行都補齊左右 padding，避免上下半身「換行就縮排」看起來不對齊
        return `${left(i)}${line}${right(i)}`;
      });
    };

    // 位移要套用在「整行」（包含手臂）上，否則手臂會同身體錯位。
    const shiftLines = (lines: string[], shift: number) => {
      const clamped = Math.max(-MAX_SHIFT, Math.min(MAX_SHIFT, shift));
      const left = NEUTRAL_PAD + (clamped + MAX_SHIFT);
      const leftPad = ' '.repeat(Math.max(0, left));
      return lines.map((l) => `${leftPad}${l}`);
    };

    const padHead = (head: string[], armLen: number, nudge: number) => {
      // 頭部固定，但要同身體的「中立位置」共用同一條基準線
      const base = armLen + NEUTRAL_PAD + MAX_SHIFT;
      const leftPad = ' '.repeat(Math.max(0, base + nudge));
      const rightPad = ' '.repeat(Math.max(0, base - nudge));
      return head.map((l) => `${leftPad}${l}${rightPad}`);
    };

    const join = (head: string[], body: string[]) => [...head, ...body].join('\n');

    // 目標：
    // - 頭部不動
    // - 從「頭以下第一行身體」開始整段左右搖（用位移達到最直觀效果）
    // - 手同時上下擺（up/mid/down 循環）
    const swingSeq: Array<{
      shift: number;
      body: string[];
      pose: ArmPose;
      armLen: number;
    }> = [
      { shift: amp, body: bodyB2, pose: 'up', armLen: 6 },
      { shift: Math.max(1, amp - 1), body: bodyB, pose: 'mid', armLen: 6 },
      { shift: 0, body: bodyA, pose: 'down', armLen: 5 },
      { shift: -Math.max(1, amp - 1), body: bodyC, pose: 'mid', armLen: 6 },
      { shift: -amp, body: bodyC2, pose: 'up', armLen: 6 },
      { shift: -Math.max(1, amp - 1), body: bodyC, pose: 'down', armLen: 5 },
      { shift: 0, body: bodyA, pose: 'mid', armLen: 5 },
      { shift: Math.max(1, amp - 1), body: bodyB, pose: 'up', armLen: 6 },
    ];

    const headFor = (i: number) => {
      if (isTalking) return i % 2 === 0 ? headOpen : headClosedMouth; // 「講嘢」嘴巴開合
      if (i % 7 === 3) return headClosedEyes; // 偶爾眨眼
      return headOpen;
    };

    const headNudgeFor = (i: number) => {
      // 頭部只做極輕微的左右郁動（±1），避免搶走身體搖動的主視覺
      if (isTalking) return i % 4 === 0 ? 1 : 0;
      return i % 8 === 0 ? 1 : 0;
    };

    const computedFrames = swingSeq.map(({ shift, body, pose, armLen }, i) =>
      join(
        padHead(headFor(i), armLen, headNudgeFor(i)),
        shiftLines(withStraightArms(body, pose, armLen), shift),
      ),
    );

    return { frames: computedFrames, speed };
  }, [mood, text]);

  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if (prefersReducedMotion) return;

    const id = window.setInterval(() => {
      setFrame((f) => (f + 1) % frames.frames.length);
    }, frames.speed);
    return () => window.clearInterval(id);
  }, [frames.frames.length, frames.speed]);

  return (
    <div className={cn('pointer-events-none relative flex justify-center', className)} aria-hidden>
      <div
        className={cn(
          'pointer-events-auto inline-flex items-center justify-center',
          'px-3 py-2',
        )}
        role="presentation"
      >
        <pre
          className={cn(
            'qu-aiz-robot',
            'm-0 whitespace-pre font-mono leading-none text-[#00ffcc]',
          )}
        >
          {frames.frames[frame]}
        </pre>
      </div>

      {text && (
        <div className="pointer-events-none absolute -top-2 left-1/2 w-[min(92vw,520px)] -translate-x-1/2 -translate-y-full px-3">
          <div
            className={cn(
              'rounded-xl border bg-background/90 px-3 py-2 text-center text-xs leading-relaxed shadow-md backdrop-blur',
              mood === 'correct' && 'border-emerald-500/40 text-emerald-700 dark:text-emerald-300',
              mood === 'wrong' && 'border-destructive/40 text-destructive',
              mood === 'idle' && 'border-border/40 text-muted-foreground',
            )}
          >
            {text}
          </div>
        </div>
      )}
出"
 ""     <style jsx>{`
        .qu-aiz-robot {
          font-size: 15px;
          text-shadow: 0 0 10px rgba(0, 255, 204, 0.7), 0 0 26px rgba(0, 255, 255, 0.35);
          transform-origin: 50% 100%;
        }
      `}</style>
    </div>
  );
}

