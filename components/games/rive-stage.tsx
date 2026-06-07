'use client';

import { useEffect, useState } from 'react';
import { Alignment, Fit, Layout, useRive } from '@rive-app/react-canvas';

import { prefersReducedMotion } from '@/lib/games/flags';
import { cn } from '@/lib/utils';

export type RiveStageProps = {
  src: string;
  stateMachine: string;
  /** State machine number inputs */
  numberInputs?: Record<string, number | undefined>;
  /** Trigger names to fire when the dependency array updates */
  fireTriggers?: string[];
  /** 遞增時重發 {@link fireTriggers}（同名 trigger 每回合仍需觸發時使用） */
  fireTriggerGeneration?: number;
  fit?: Fit;
  alignment?: Alignment;
  className?: string;
  onReady?: () => void;
  onFailed?: () => void;
};

export function RiveStage({
  src,
  stateMachine,
  numberInputs = {},
  fireTriggers = [],
  fireTriggerGeneration = 0,
  fit = Fit.Contain,
  alignment = Alignment.BottomCenter,
  className,
  onReady,
  onFailed,
}: RiveStageProps) {
  const [failed, setFailed] = useState(false);
  const reducedMotion = prefersReducedMotion();

  const { rive, RiveComponent } = useRive(
    {
      src,
      stateMachines: stateMachine,
      autoplay: !reducedMotion,
      layout: new Layout({
        fit,
        alignment,
      }),
      onLoad: () => {
        setFailed(false);
        onReady?.();
      },
      onLoadError: () => {
        setFailed(true);
        onFailed?.();
      },
    },
    { shouldResizeCanvasToContainer: true },
  );

  const numberInputsKey = JSON.stringify(numberInputs);
  const triggersKey = fireTriggers.join(',');

  useEffect(() => {
    if (!rive || failed) return;
    for (const [name, value] of Object.entries(numberInputs)) {
      if (value === undefined) continue;
      const input = rive.stateMachineInputs(stateMachine)?.find((i) => i.name === name);
      if (input && 'value' in input) {
        input.value = value;
      }
    }
  }, [rive, failed, stateMachine, numberInputs, numberInputsKey]);

  useEffect(() => {
    if (!rive || failed || !fireTriggers.length) return;
    for (const name of fireTriggers) {
      const input = rive.stateMachineInputs(stateMachine)?.find((i) => i.name === name);
      if (input && 'fire' in input && typeof input.fire === 'function') {
        input.fire();
      }
    }
  }, [rive, failed, stateMachine, triggersKey, fireTriggers, fireTriggerGeneration]);

  if (failed) return null;

  return (
    <div className={cn('relative h-full w-full min-h-[120px]', className)}>
      <RiveComponent className="h-full w-full" aria-hidden />
    </div>
  );
}
