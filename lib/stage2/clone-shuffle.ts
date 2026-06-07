/** Fisher–Yates；盡量與原順序不同（至少 2 個分身時） */
export function shuffledCloneIds(ids: string[]): string[] {
  if (ids.length <= 1) return [...ids];

  const shuffle = () => {
    const next = [...ids];
    for (let i = next.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [next[i], next[j]] = [next[j]!, next[i]!];
    }
    return next;
  };

  let next = shuffle();
  let attempts = 0;
  while (next.join('\0') === ids.join('\0') && attempts < 12) {
    next = shuffle();
    attempts += 1;
  }
  return next;
}

export type CloneShuffleMotionOptions = {
  anticipationMs?: number;
  durationMs?: number;
  staggerMs?: number;
  settleMs?: number;
  windupStaggerMs?: number;
  style?: CloneShuffleStyle;
};

export type CloneShuffleStyle =
  | 'glide'
  | 'arc'
  | 'phase'
  | 'zigzag'
  | 'slingshot'
  | 'drift'
  | 'snap'
  | 'vortex';
const SHUFFLE_STYLES: readonly CloneShuffleStyle[] = [
  'glide',
  'arc',
  'phase',
  'zigzag',
  'slingshot',
  'drift',
  'snap',
  'vortex',
] as const;

const DEFAULT_MOTION: Required<CloneShuffleMotionOptions> = {
  anticipationMs: 120,
  durationMs: 520,
  staggerMs: 32,
  settleMs: 90,
  windupStaggerMs: 16,
};

const FLIGHT_EASING = 'cubic-bezier(0.2, 0.8, 0.2, 1)';

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function waitFrames(count = 2): Promise<void> {
  return new Promise((resolve) => {
    let left = count;
    const step = () => {
      left -= 1;
      if (left <= 0) resolve();
      else requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

function clearInlineMotionStyles(el: HTMLElement): void {
  el.style.removeProperty('transform');
  el.style.removeProperty('transition');
  el.style.removeProperty('z-index');
  el.style.removeProperty('filter');
  el.style.removeProperty('will-change');
  el.style.removeProperty('transform-origin');
  el.style.removeProperty('opacity');
  el.style.removeProperty('visibility');
}

function cancelElementAnimations(el: HTMLElement): void {
  for (const animation of el.getAnimations()) {
    try {
      animation.cancel();
    } catch {
      /* ignore */
    }
  }
}

function cloneMotionTarget(cloneEl: HTMLElement): HTMLElement {
  return cloneEl.querySelector<HTMLElement>('.stage2-clone-stack') ?? cloneEl;
}

export function pickRandomCloneShuffleStyle(
  previous?: CloneShuffleStyle,
): CloneShuffleStyle {
  if (!previous) return SHUFFLE_STYLES[Math.floor(Math.random() * SHUFFLE_STYLES.length)]!;
  const pool = SHUFFLE_STYLES.filter((style) => style !== previous);
  return pool[Math.floor(Math.random() * pool.length)] ?? 'glide';
}

function shuffleFlightKeyframes(
  style: CloneShuffleStyle,
  dx: number,
  dy: number,
): Keyframe[] {
  if (style === 'arc') {
    const travel = Math.hypot(dx, dy);
    const lift = Math.min(56, 16 + travel * 0.14);
    const midX = dx * 0.5;
    const midY = dy * 0.5 - lift;
    return [
      { transform: `translate(${dx}px, ${dy}px) scale(1)` },
      { transform: `translate(${midX}px, ${midY}px) scale(1.045)`, offset: 0.54 },
      { transform: 'translate(0, 0) scale(1)' },
    ];
  }

  if (style === 'phase') {
    const sign = dx === 0 ? (Math.random() > 0.5 ? 1 : -1) : Math.sign(dx);
    const overshootX = -dx * 0.12 + sign * 6;
    const overshootY = -dy * 0.08;
    return [
      { transform: `translate(${dx}px, ${dy}px) scale(1) rotate(0deg)` },
      {
        transform: `translate(${overshootX}px, ${overshootY}px) scale(1.035) rotate(${sign * 2.8}deg)`,
        offset: 0.84,
      },
      { transform: 'translate(0, 0) scale(1) rotate(0deg)' },
    ];
  }

  if (style === 'zigzag') {
    const side = dx === 0 ? (Math.random() > 0.5 ? 1 : -1) : Math.sign(dx);
    const z1x = dx * 0.62 + side * 14;
    const z1y = dy * 0.62 - 5;
    const z2x = dx * 0.28 - side * 12;
    const z2y = dy * 0.28 + 4;
    return [
      { transform: `translate(${dx}px, ${dy}px)` },
      { transform: `translate(${z1x}px, ${z1y}px)`, offset: 0.34 },
      { transform: `translate(${z2x}px, ${z2y}px)`, offset: 0.72 },
      { transform: 'translate(0, 0)' },
    ];
  }

  if (style === 'slingshot') {
    const pullX = dx * 1.08;
    const pullY = dy * 1.08;
    const reboundX = -dx * 0.1;
    const reboundY = -dy * 0.1;
    return [
      { transform: `translate(${pullX}px, ${pullY}px) scale(0.985)` },
      { transform: `translate(${reboundX}px, ${reboundY}px) scale(1.03)`, offset: 0.84 },
      { transform: 'translate(0, 0) scale(1)' },
    ];
  }

  if (style === 'drift') {
    const cross = Math.sign(dx || 1) * Math.min(18, Math.abs(dx) * 0.2 + 8);
    return [
      { transform: `translate(${dx}px, ${dy}px)` },
      {
        transform: `translate(${dx * 0.46 + cross}px, ${dy * 0.46 - 6}px)`,
        offset: 0.52,
      },
      { transform: 'translate(0, 0)' },
    ];
  }

  if (style === 'snap') {
    const snapX = dx * 0.18;
    const snapY = dy * 0.18;
    return [
      { transform: `translate(${dx}px, ${dy}px)` },
      { transform: `translate(${snapX}px, ${snapY}px)`, offset: 0.9 },
      { transform: 'translate(0, 0)' },
    ];
  }

  if (style === 'vortex') {
    const turn = (Math.sign(dx || 1) * 8).toFixed(2);
    const midX = dx * 0.5;
    const midY = dy * 0.5 - Math.min(24, Math.abs(dx) * 0.08 + 10);
    return [
      { transform: `translate(${dx}px, ${dy}px) rotate(0deg)` },
      { transform: `translate(${midX}px, ${midY}px) rotate(${turn}deg) scale(1.025)`, offset: 0.56 },
      { transform: 'translate(0, 0) rotate(0deg) scale(1)' },
    ];
  }

  return [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0, 0)' }];
}

/** 強制還原可點擊狀態（僅清理分身按鈕與 stack，不觸碰 Rive 子樹） */
export function releaseCloneShuffleMotion(container: HTMLElement): void {
  for (const cloneEl of container.querySelectorAll<HTMLElement>('[data-clone-id]')) {
    cancelElementAnimations(cloneEl);
    clearInlineMotionStyles(cloneEl);

    const stack = cloneEl.querySelector<HTMLElement>('.stage2-clone-stack');
    if (stack) {
      cancelElementAnimations(stack);
      clearInlineMotionStyles(stack);
    }

    void cloneEl.offsetHeight;
  }
}

function captureCloneRects(container: HTMLElement): Map<string, DOMRect> {
  return new Map(
    Array.from(container.querySelectorAll<HTMLElement>('[data-clone-id]')).map(
      (el) => [el.dataset.cloneId!, el.getBoundingClientRect()] as const,
    ),
  );
}

/** 輕量 FLIP：直接滑位到新位置（避免多段動畫卡頓） */
export async function animateCloneOrderShuffle(
  container: HTMLElement,
  applyOrder: () => void,
  options: CloneShuffleMotionOptions = {},
): Promise<void> {
  const { durationMs, staggerMs, settleMs, style = 'glide' } = {
    ...DEFAULT_MOTION,
    ...options,
  };

  try {
    const cloneElements = Array.from(
      container.querySelectorAll<HTMLElement>('[data-clone-id]'),
    );
    if (cloneElements.length <= 1) {
      applyOrder();
      return;
    }

    if (prefersReducedMotion()) {
      applyOrder();
      return;
    }

    releaseCloneShuffleMotion(container);

    const firstRects = captureCloneRects(container);
    applyOrder();
    await waitFrames(1);

    const after = Array.from(
      container.querySelectorAll<HTMLElement>('[data-clone-id]'),
    );
    const flights: Animation[] = [];

    after.forEach((cloneEl, index) => {
      const id = cloneEl.dataset.cloneId;
      if (!id) return;
      const first = firstRects.get(id);
      if (!first) return;
      const last = cloneEl.getBoundingClientRect();
      const dx = first.left - last.left;
      const dy = first.top - last.top;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;

      const target = cloneMotionTarget(cloneEl);
      cloneEl.style.zIndex = String(10 + index);
      target.style.transformOrigin = 'bottom center';
      target.style.willChange = 'transform';

      const flight = target.animate(
        shuffleFlightKeyframes(style, dx, dy),
        {
          duration: durationMs,
          delay: Math.min(index * staggerMs, 70),
          easing: FLIGHT_EASING,
          fill: 'forwards',
        },
      );
      flights.push(flight);
    });

    if (flights.length > 0) {
      await Promise.all(
        flights.map((a) =>
          a.finished.catch(() => {
            /* cancelled */
          }),
        ),
      );
    }

    releaseCloneShuffleMotion(container);
    await wait(settleMs);
  } finally {
    releaseCloneShuffleMotion(container);
  }
}
