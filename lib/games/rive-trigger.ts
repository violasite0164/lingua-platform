import type { Rive } from '@rive-app/react-canvas';

import { SUPER_FUN_RIVE } from '@/lib/games/super-fun-rive-manifest';

/** Fire a named trigger on the mascot state machine (tries `Main` then other SM names). */
export function fireRiveTrigger(rive: Rive, triggerName: string): void {
  const sm = SUPER_FUN_RIVE.stateMachine;
  const names = [sm, ...rive.stateMachineNames];
  const seen = new Set<string>();
  for (const name of names) {
    if (!name || seen.has(name)) continue;
    seen.add(name);
    const input = rive.stateMachineInputs(name)?.find((i) => i.name === triggerName);
    if (input && 'fire' in input && typeof input.fire === 'function') {
      input.fire();
      return;
    }
  }
}
