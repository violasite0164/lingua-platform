'use client';

import { useEffect, useMemo, useState } from 'react';
import NextImage from 'next/image';

import { RiveStage } from '@/components/games/rive-stage';
import { prefersReducedMotion } from '@/lib/games/flags';
import { STAGE2_ASSETS, STAGE2_NINJA_RIVE } from '@/lib/stage2/constants';
import { cn } from '@/lib/utils';
import { Alignment, Fit } from '@rive-app/react-canvas';

type Props = {
  className?: string;
  /** 回合開場施術：每回合 jutsu-intro 遞增一次以觸發 Rive `cast` */
  castTick?: number;
  /** `cast` one-shot 播完後回呼 */
  onCastComplete?: () => void;
  /** 玩家手裏劍命中時觸發 Rive `hit` */
  fireHit?: boolean;
  /** 玩家選錯分身時觸發 Rive `miss` */
  fireMiss?: boolean;
  /** `miss` one-shot 播完後回呼（僅 fireMiss 那次） */
  onMissComplete?: () => void;
  priority?: boolean;
};

export function Stage2NinjaRive({
  className,
  castTick = 0,
  onCastComplete,
  fireHit = false,
  fireMiss = false,
  onMissComplete,
  priority = false,
}: Props) {
  const tryRive = !prefersReducedMotion();
  const [useFallback, setUseFallback] = useState(!tryRive);
  const [castNonce, setCastNonce] = useState(0);
  const [hitNonce, setHitNonce] = useState(0);
  const [missNonce, setMissNonce] = useState(0);

  useEffect(() => {
    if (castTick > 0) setCastNonce((n) => n + 1);
  }, [castTick]);

  useEffect(() => {
    if (castNonce === 0 || !onCastComplete) return;
    const timer = window.setTimeout(onCastComplete, STAGE2_NINJA_RIVE.castAnimMs);
    return () => window.clearTimeout(timer);
  }, [castNonce, onCastComplete]);

  useEffect(() => {
    if (fireHit) setHitNonce((n) => n + 1);
  }, [fireHit]);

  useEffect(() => {
    if (fireMiss) setMissNonce((n) => n + 1);
  }, [fireMiss]);

  useEffect(() => {
    if (missNonce === 0 || !onMissComplete) return;
    const timer = window.setTimeout(onMissComplete, STAGE2_NINJA_RIVE.missAnimMs);
    return () => window.clearTimeout(timer);
  }, [missNonce, onMissComplete]);

  const fireTriggers = useMemo(() => {
    const triggers: string[] = [];
    if (castNonce > 0) triggers.push(STAGE2_NINJA_RIVE.inputs.cast);
    if (hitNonce > 0) triggers.push(STAGE2_NINJA_RIVE.inputs.hit);
    if (missNonce > 0) triggers.push(STAGE2_NINJA_RIVE.inputs.miss);
    return triggers;
  }, [castNonce, hitNonce, missNonce]);

  const fireTriggerGeneration = castNonce + hitNonce + missNonce;

  if (useFallback) {
    return (
      <NextImage
        src={STAGE2_ASSETS.purpleNinja}
        alt=""
        width={182}
        height={228}
        sizes="(max-width: 640px) 19vw, 182px"
        className={className}
        priority={priority}
        draggable={false}
      />
    );
  }

  const riveNode = (
    <div className={cn('stage2-ninja-rive', className)} aria-hidden>
      <RiveStage
        src={STAGE2_NINJA_RIVE.src}
        stateMachine={STAGE2_NINJA_RIVE.stateMachine}
        fireTriggers={fireTriggers}
        fireTriggerGeneration={fireTriggerGeneration}
        fit={Fit.FitHeight}
        alignment={Alignment.BottomCenter}
        className="stage2-ninja-rive__canvas"
        onFailed={() => setUseFallback(true)}
      />
    </div>
  );

  if (className?.includes('stage2-clone-ninja')) {
    return <span className="stage2-ninja-rive-mount">{riveNode}</span>;
  }

  return riveNode;
}
