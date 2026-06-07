/** Stage 1 背景音樂（MP3）與節拍對齊參數 */

export const STAGE1_BGM_TRACK = {
  url: '/games/stage1/stage1-bgm.mp3',
  /** 四分音符 BPM（依實際聽感微調） */
  bpm: 132,
  /** 第一個 downbeat 在 currentTime 的偏移（秒） */
  beatOffsetSec: 0.025,
  title: '熊的問答集',
} as const;

export function stage1BgmQuarterBeatSec(): number {
  return 60 / STAGE1_BGM_TRACK.bpm;
}

export function stage1BgmQuarterBeatMs(): number {
  return stage1BgmQuarterBeatSec() * 1000;
}

/** 對齊 beat grid 的播放時間（秒） */
export function stage1BgmGridTimeSec(currentTimeSec: number): number {
  return Math.max(0, currentTimeSec - STAGE1_BGM_TRACK.beatOffsetSec);
}
