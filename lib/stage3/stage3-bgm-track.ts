/** Stage 3 背景音樂（MP3）與節拍對齊參數 */

export const STAGE3_BGM_TRACK = {
  url: '/games/stage3/stage3-bgm.mp3',
  /** 四分音符 BPM（依實際聽感微調） */
  bpm: 112.5,
  /** 第一個 downbeat 在 currentTime 的偏移（秒） */
  beatOffsetSec: 0.185,
  title: 'Stage 3 BGM',
} as const;

export function stage3BgmQuarterBeatSec(): number {
  return 60 / STAGE3_BGM_TRACK.bpm;
}

export function stage3BgmQuarterBeatMs(): number {
  return stage3BgmQuarterBeatSec() * 1000;
}

/** 對齊 beat grid 的播放時間（秒） */
export function stage3BgmGridTimeSec(currentTimeSec: number): number {
  return Math.max(0, currentTimeSec - STAGE3_BGM_TRACK.beatOffsetSec);
}
