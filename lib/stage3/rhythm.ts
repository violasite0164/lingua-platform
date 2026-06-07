import { STAGE3_BEAT_MS, STAGE3_BPM } from '@/lib/stage3/constants';

export { STAGE3_BEAT_MS, STAGE3_BPM };

/** 一小節四拍（四四拍）毫秒 */
export function stage3BarMs(): number {
  return STAGE3_BEAT_MS * 4;
}

export function stage3BeatsForMs(ms: number): number {
  return Math.max(1, Math.round(ms / STAGE3_BEAT_MS));
}
