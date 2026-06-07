/** Stage 2 背景音樂（MP3）與節拍對齊參數 */

export const STAGE2_BGM_TRACK = {
  url: '/games/stage2/stage2-bgm.mp3',
  /** 四分音符 BPM（依實際聽感微調） */
  bpm: 110,
  /** 第一個 downbeat 在 currentTime 的偏移（秒） */
  beatOffsetSec: 0.06,
  title: '影分身術',
} as const;

export function stage2BgmQuarterBeatSec(): number {
  return 60 / STAGE2_BGM_TRACK.bpm;
}

export function stage2BgmQuarterBeatMs(): number {
  return stage2BgmQuarterBeatSec() * 1000;
}

/** 對齊 beat grid 的播放時間（秒） */
export function stage2BgmGridTimeSec(currentTimeSec: number): number {
  return Math.max(0, currentTimeSec - STAGE2_BGM_TRACK.beatOffsetSec);
}
