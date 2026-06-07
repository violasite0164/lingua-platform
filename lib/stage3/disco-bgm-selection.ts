import {
  DEFAULT_STAGE3_DISCO_BGM_PRESET_ID,
  type Stage3DiscoBgmPresetId,
} from '@/lib/stage3/disco-bgm-presets';

/** 固定 BGM，不再選曲 */
export function getStage3DiscoBgmPresetId(): Stage3DiscoBgmPresetId {
  return DEFAULT_STAGE3_DISCO_BGM_PRESET_ID;
}

export function getStage3DiscoBgmPresetIdOrDefault(): Stage3DiscoBgmPresetId {
  return DEFAULT_STAGE3_DISCO_BGM_PRESET_ID;
}

export function setStage3DiscoBgmPresetId(_id: Stage3DiscoBgmPresetId): void {
  /* no-op：僅一首 BGM */
}

export function clearStage3DiscoBgmSelection(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('lingua-stage3-disco-bgm-id-v3');
  localStorage.removeItem('lingua-stage3-disco-bgm-id-v2');
  localStorage.removeItem('lingua-stage3-disco-bgm-id');
}

export function hasStage3DiscoBgmSelection(): boolean {
  return true;
}
