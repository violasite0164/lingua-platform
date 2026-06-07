import { STAGE3_BGM_TRACK } from '@/lib/stage3/stage3-bgm-track';

/** Stage 3 迪斯可拼字 — 8 回合 */
export const STAGE3_TOTAL_ROUNDS = 8;

/** 各回合字長（與 {@link buildStage3Session} 的 ROUND_LAYOUT 一致） */
export const STAGE3_ROUND_WORD_LENGTHS = [4, 4, 5, 5, 8, 8, 9, 9] as const;

/** 與 Stage 3 BGM 同步的四四拍 */
export const STAGE3_BPM = STAGE3_BGM_TRACK.bpm;
export const STAGE3_BEAT_MS = 60000 / STAGE3_BPM;

/** 每回合最高得分 = 該字字母數；8 回合共 52 字 */
export const STAGE3_MAX_TOTAL = 52;

/** @deprecated 過關改以 {@link STAGE3_PASS_MIN_SCORE100} 為準 */
export const STAGE3_PASS_MIN_TOTAL = 33;

/** 過關所需總分（滿分 100） */
export const STAGE3_PASS_MIN_SCORE100 = 85;

/** 總分權重：Combo / PERFECT / 正確字母 */
export const STAGE3_SCORE_WEIGHT_COMBO = 50;
export const STAGE3_SCORE_WEIGHT_PERFECT = 30;
export const STAGE3_SCORE_WEIGHT_LETTERS = 20;

/** FEVER 回合（第 5 局起）統計加成倍率 */
export const STAGE3_FEVER_STAT_MULTIPLIER = 2;

/** 老虎機滾動至定格（長鼓聲持續至此，定格時重鼓） */
export const STAGE3_AWARD_SLOT_SPIN_MS = 2600;

/** 分數定格後男女主角情感表演 */
export const STAGE3_AWARD_REACTION_MS = 2000;

/** 關電視轉場 */
export const STAGE3_AWARD_TV_OFF_MS = 720;

/** 第 8 局後頒獎典禮總時長（滾分 + 反應 + 關機） */
export const STAGE3_AWARD_CEREMONY_MS =
  STAGE3_AWARD_SLOT_SPIN_MS + STAGE3_AWARD_REACTION_MS + STAGE3_AWARD_TV_OFF_MS;

/** 開局走馬燈（4 拍） */
export const STAGE3_MARQUEE_MS = STAGE3_BEAT_MS * 4;

/** 第 5 回合（0-based 4）播放 FEVER TIME 走馬燈 */
export const STAGE3_FEVER_MARQUEE_ROUND_INDEX = 4;

/** Boss 宣布段（1 拍） */
export const STAGE3_BOSS_ANNOUNCE_MS = STAGE3_BEAT_MS;

/** 輸入拍內可打字窗口比例 */
export const STAGE3_INPUT_WINDOW_RATIO = 0.72;

/** Boss 生字提示：全字揭示後再停留（拍） */
export const STAGE3_BOSS_HINT_HOLD_BEATS = 2;

/** Boss 生字提示：停留後漸漸消失（拍） */
export const STAGE3_BOSS_HINT_FADE_BEATS = 2;

/** 單字輸入 GREAT / MISS 提示顯示時間 */
export const STAGE3_INPUT_FEEDBACK_MS = STAGE3_BEAT_MS * 0.55;

/** 完整拼對單字：PERFECT + DISCO 字效顯示時間（2 拍） */
export const STAGE3_WORD_PERFECT_MS = STAGE3_BEAT_MS * 2;

/** 連續成功幾字起顯示 HIT COMBO */
export const STAGE3_COMBO_MIN_HITS = 2;

/** Combo 視覺強度分級門檻（含） */
export const STAGE3_COMBO_TIER_THRESHOLDS = [2, 4, 6, 8, 12] as const;

/** 虛擬鍵盤鍵落下間隔（1 拍） */
export const STAGE3_KEY_DROP_STAGGER_S = STAGE3_BEAT_MS / 1000;

/** 回合得分提示（2 拍） */
export const STAGE3_ROUND_FEEDBACK_MS = STAGE3_BEAT_MS * 2;

/** @deprecated 改用 {@link STAGE3_AWARD_CEREMONY_MS} */
export const STAGE3_FINAL_SCORE_MS = STAGE3_BEAT_MS * 4;

/** 估算整局作答秒數（節奏制，供 quiz 計分用） */
export const STAGE3_ESTIMATED_PLAY_SECONDS = Math.ceil(
  (STAGE3_MAX_TOTAL * 2 + STAGE3_TOTAL_ROUNDS * 6) * (STAGE3_BEAT_MS / 1000),
);

export const STAGE3_LETTER_GROUPS = ['astr', 'eino', 'bulu', 'dump'] as const;

export type Stage3LetterGroup = (typeof STAGE3_LETTER_GROUPS)[number];

/** 單組（Boy 或 Girl）單詞字長範圍 */
export const STAGE3_SINGLE_WORD_MIN_LEN = 4;
export const STAGE3_SINGLE_WORD_MAX_LEN = 7;

/** 合併 Boy+Girl 兩組字母時的單詞字長範圍 */
export const STAGE3_COMBINED_WORD_MIN_LEN = 8;
export const STAGE3_COMBINED_WORD_MAX_LEN = 12;

export const STAGE3_ASSETS = {
  discoBg: '/games/stage3/disco-bg.png',
  danceBoss: '/games/stage3/dance-boss.png',
  danceBoy: '/games/stage3/dance-boy.png',
  danceGirl: '/games/stage3/dance-girl.png',
} as const;
