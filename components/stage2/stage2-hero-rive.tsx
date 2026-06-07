'use client';

import { useEffect, useMemo, useState } from 'react';
import NextImage from 'next/image';

import { RiveStage } from '@/components/games/rive-stage';
import { prefersReducedMotion } from '@/lib/games/flags';
import {
  STAGE2_ASSETS,
  STAGE2_BLUE_GIRL_RIVE,
  STAGE2_RED_BOY_RIVE,
} from '@/lib/stage2/constants';
import { cn } from '@/lib/utils';
import { Alignment, Fit } from '@rive-app/react-canvas';

type RedBoyProps = {
  className?: string;
  /** 手裏劍飛出時遞增，觸發 Rive `throw` */
  throwTick?: number;
  priority?: boolean;
};

type BlueGirlProps = {
  className?: string;
  priority?: boolean;
};

export function Stage2RedBoyRive({ className, throwTick = 0, priority = false }: RedBoyProps) {
  const tryRive = !prefersReducedMotion();
  const [useFallback, setUseFallback] = useState(!tryRive);
  const [throwNonce, setThrowNonce] = useState(0);

  useEffect(() => {
    if (throwTick > 0) setThrowNonce((n) => n + 1);
  }, [throwTick]);

  const fireTriggers = useMemo(() => {
    const triggers: string[] = [];
    if (throwNonce > 0) triggers.push(STAGE2_RED_BOY_RIVE.inputs.throw);
    return triggers;
  }, [throwNonce]);

  if (useFallback) {
    return (
      <NextImage
        src={STAGE2_ASSETS.redNinja}
        alt=""
        width={200}
        height={256}
        sizes="(max-width: 640px) 44vw, 200px"
        className={cn('stage2-hero', className)}
        priority={priority}
        draggable={false}
      />
    );
  }

  return (
    <div className="stage2-hero-rive" aria-hidden>
      <RiveStage
        src={STAGE2_RED_BOY_RIVE.src}
        stateMachine={STAGE2_RED_BOY_RIVE.stateMachine}
        fireTriggers={fireTriggers}
        fireTriggerGeneration={throwNonce}
        fit={Fit.FitHeight}
        alignment={Alignment.BottomCenter}
        className="stage2-hero-rive__canvas"
        onFailed={() => setUseFallback(true)}
      />
    </div>
  );
}

export function Stage2BlueGirlRive({ className, priority = false }: BlueGirlProps) {
  const tryRive = !prefersReducedMotion();
  const [useFallback, setUseFallback] = useState(!tryRive);

  if (useFallback) {
    return (
      <NextImage
        src={STAGE2_ASSETS.blueKimono}
        alt=""
        width={200}
        height={256}
        sizes="(max-width: 640px) 44vw, 200px"
        className={cn('stage2-hero', className)}
        priority={priority}
        draggable={false}
      />
    );
  }

  return (
    <div className="stage2-hero-rive" aria-hidden>
      <RiveStage
        src={STAGE2_BLUE_GIRL_RIVE.src}
        stateMachine={STAGE2_BLUE_GIRL_RIVE.stateMachine}
        fit={Fit.FitHeight}
        alignment={Alignment.BottomCenter}
        className="stage2-hero-rive__canvas"
        onFailed={() => setUseFallback(true)}
      />
    </div>
  );
}
