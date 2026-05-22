import type { QuizEditorPersonality } from '@/types/database.types';
import type { QuizScoreBreakdown } from '@/lib/quiz/score-formula';

import type { HoldMessageTier } from '@/lib/quiz/editor-personality-preference';
import { GENTLE_PLAY_CORRECT, GENTLE_PLAY_WRONG } from '@/lib/quiz/editor-personality-gentle-play';
import { GENTLE_HOLD_POOLS } from '@/lib/quiz/editor-personality-gentle-hold';
import { TOXIC_PLAY_CORRECT, TOXIC_PLAY_WRONG } from '@/lib/quiz/editor-personality-toxic-play';
import { TOXIC_HOLD_POOLS } from '@/lib/quiz/editor-personality-toxic-hold';

export type QuizEditorRemarkStyle = '毒舌嘲諷' | '溫柔治癒';

export type EditorRemark = {
  style: QuizEditorRemarkStyle;
  text: string;
};

export type { HoldMessageTier } from '@/lib/quiz/editor-personality-preference';

function pickOne<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

function hashSeed(seed: string): number {
  return Array.from(seed).reduce((acc, ch) => (acc * 33 + ch.charCodeAt(0)) >>> 0, 5381);
}

function scoreTier(score100: number): 'awful' | 'low' | 'mid' | 'good' | 'god' {
  if (score100 <= 25) return 'awful';
  if (score100 <= 45) return 'low';
  if (score100 <= 65) return 'mid';
  if (score100 <= 85) return 'good';
  return 'god';
}

function difficultyTier(avgDifficulty: number): 'easy' | 'mid' | 'hard' | 'insane' {
  if (avgDifficulty < 1.6) return 'easy';
  if (avgDifficulty < 2.6) return 'mid';
  if (avgDifficulty < 3.6) return 'hard';
  return 'insane';
}

function speedTier(avgSecPerQuestion: number): 'fast' | 'ok' | 'slow' | 'crawl' {
  if (avgSecPerQuestion <= 7) return 'fast';
  if (avgSecPerQuestion <= 18) return 'ok';
  if (avgSecPerQuestion <= 38) return 'slow';
  return 'crawl';
}

export function pickPlayTaunt(args: {
  personality: QuizEditorPersonality;
  isCorrect: boolean;
  seedKey: string;
  cursor: number;
  total: number;
}): string {
  const { personality, isCorrect, seedKey, cursor, total } = args;
  const hash = hashSeed(seedKey);
  const fillTiny = (t: string) =>
    t
      .replaceAll('{n}', String(cursor + 1))
      .replaceAll('{total}', String(total || '—'));

  const lines =
    personality === 'gentle'
      ? isCorrect
        ? GENTLE_PLAY_CORRECT
        : GENTLE_PLAY_WRONG
      : isCorrect
        ? TOXIC_PLAY_CORRECT
        : TOXIC_PLAY_WRONG;

  return fillTiny(lines[hash % lines.length]!);
}

export function pickHoldMessage(args: {
  personality: QuizEditorPersonality;
  tier: HoldMessageTier;
  seedKey: string;
}): string {
  const pools =
    args.personality === 'gentle' ? GENTLE_HOLD_POOLS : TOXIC_HOLD_POOLS;
  const pool = pools[args.tier];
  const hash = hashSeed(args.seedKey);
  return pool[hash % pool.length]!;
}

export function generateEditorRemark(
  personality: QuizEditorPersonality,
  args: {
    score100: number;
    correct: number;
    total: number;
    avgDifficulty: number;
    avgDifficultyLabel: string;
    breakdown: QuizScoreBreakdown;
  },
): EditorRemark {
  const { score100, correct, total, avgDifficulty, avgDifficultyLabel, breakdown } =
    args;

  const sTier = scoreTier(score100);
  const dTier = difficultyTier(avgDifficulty);
  const timeTier = speedTier(breakdown.avgSecondsPerQuestion);
  const accPts = Math.round(breakdown.accuracyPoints);
  const speedPts = Math.round(breakdown.speedPoints);
  const avgSec = breakdown.avgSecondsPerQuestion.toFixed(1);
  const styleLabel: QuizEditorRemarkStyle =
    personality === 'gentle' ? '溫柔治癒' : '毒舌嘲諷';

  type Cand = { t: string };

  const fill = (template: string) =>
    template
      .replaceAll('{score100}', String(score100))
      .replaceAll('{correct}', String(correct))
      .replaceAll('{total}', String(total))
      .replaceAll('{avgDifficultyLabel}', String(avgDifficultyLabel))
      .replaceAll('{avgSec}', avgSec)
      .replaceAll('{accPts}', String(accPts))
      .replaceAll('{speedPts}', String(speedPts));

  const toxicByScore: Record<ReturnType<typeof scoreTier>, Cand[]> = {
    awful: [
      { t: '總分 {score100}/100：你嘅英文同你嘅自信，至少有一個係假的。' },
      { t: '答對 {correct}/{total}——唔係你太差，係題目太有禮貌。' },
      { t: '你而家最強技能：用最快速度排除正確答案。({avgSec} 秒／題)' },
      { t: '{score100}/100：你嘅錯題密度高到可以當地圖用。' },
      { t: '答對 {correct}/{total}：你唔係唔努力，你係努力緊錯方向。' },
      { t: '你呢個分數好有「我有參與」嘅精神——但就只有精神。' },
    ],
    low: [
      { t: '{score100}/100：你有進步空間，問題係空間大到可以起兩個機場。' },
      { t: '答對 {correct}/{total}：再錯幾題就可以申請「錯題專家」證書。' },
      { t: '速度分 {speedPts}/35 唔差，但答對分 {accPts}/65 正喺度喊救命。' },
      { t: '{score100}/100：你開始識啲英文，但你啲英文唔係好識你。' },
      { t: '答對 {correct}/{total}：你啱啱好接近「可以唔尷尬」——但仲未到。' },
      { t: '你而家嘅狀態係：有概念，但冇把握；有把握嗰陣又啱唔到。' },
    ],
    mid: [
      { t: '{score100}/100：你唔係唔識，你係識一半就開始亂嚟。' },
      { t: '答對 {correct}/{total}：可以喎——但你嘅錯題依然好有存在感。' },
      { t: '平均 {avgSec} 秒／題：諗得幾耐都好，唔好諗到最後揀錯就得。' },
      { t: '{score100}/100：你已經唔係新手，但你仲成日扮新手錯。' },
      { t: '答對 {correct}/{total}：你係有料嘅——只係啲料唔係次次攞得出嚟。' },
      { t: '你而家最需要嘅唔係題目，係「唔好諗多咗」呢個技能。' },
    ],
    good: [
      { t: '{score100}/100：算你有料——不過唔好太得戚，題庫仲未出王牌。' },
      { t: '答對 {correct}/{total}：你已經強到令我搵槽點要加班。' },
      { t: '答對分 {accPts}/65 在線，速度分 {speedPts}/35 亦唔失禮——繼續，唔好停。' },
      { t: '{score100}/100：你係真係識——但你唔好用嚟得戚，得戚會倒退。' },
      { t: '答對 {correct}/{total}：你已經可以同英文和平共處，恭喜。' },
      { t: '你咁樣答落去，我啲毒舌位都要慳住用。' },
    ],
    god: [
      { t: '{score100}/100：你咁勁，我毒舌都要講返句——懷疑你係題庫親戚。' },
      { t: '{avgDifficultyLabel} 打成咁：唔好再卷啦，隔離啲人要活。' },
      { t: '平均 {avgSec} 秒／題：又快又準，搞到我冇得笑你，唔抵。' },
      { t: '{score100}/100：你係咪想逼我改行做讚美系小編？' },
      { t: '答對 {correct}/{total}：你唔係考試，你係示範。' },
      { t: '你再咁準，我就只可以改用「恭喜你」嚟毒舌你。' },
    ],
  };

  const gentleByScore: Record<ReturnType<typeof scoreTier>, Cand[]> = {
    awful: [
      { t: '總分 {score100}/100：今天只是起點，願意開始就已經很勇敢。' },
      { t: '答對 {correct}/{total}：每一題都是練習，慢慢來會看見變化。' },
      { t: '平均 {avgSec} 秒／題：不用趕，先弄懂一題就是一題的勝利。' },
      { t: '分數不代表你的價值，你願意練習就很珍貴。' },
      { t: '答對 {correct}/{total}：我們從解析出發，一步一步補上。' },
      { t: '這局不容易，但你沒有放棄，這很值得肯定。' },
    ],
    low: [
      { t: '{score100}/100：還在打底階段，每天一點點就會穩起來。' },
      { t: '答對 {correct}/{total}：錯題是路標，指向你需要加強的地方。' },
      { t: '速度分 {speedPts}/35、答對分 {accPts}/65：先求穩，再求快。' },
      { t: '{score100}/100：你已經在累積，請給自己多一點耐心。' },
      { t: '答對 {correct}/{total}：再練幾次，你會更熟悉題型。' },
      { t: '學習有起伏很正常，你正在往對的方向走。' },
    ],
    mid: [
      { t: '{score100}/100：中段實力，繼續保持閱讀題目的習慣。' },
      { t: '答對 {correct}/{total}：有亮點也有空間，我們溫柔地補強。' },
      { t: '平均 {avgSec} 秒／題：節奏不錯，再注意一下易錯點。' },
      { t: '{score100}/100：你已經不是完全陌生，再穩一點會更好。' },
      { t: '答對 {correct}/{total}：你的基礎在長大，繼續加油。' },
      { t: '這分數代表你在進步路上，值得鼓勵。' },
    ],
    good: [
      { t: '{score100}/100：表現很好，保持節奏就能更上一層樓。' },
      { t: '答對 {correct}/{total}：你展現了紮實的理解，很棒。' },
      { t: '答對分 {accPts}/65、速度分 {speedPts}/35：穩健又有效率。' },
      { t: '{score100}/100：你已經能駕馭不少題型，為自己驕傲一下。' },
      { t: '答對 {correct}/{total}：繼續這樣練，你會越來越自在。' },
      { t: '這局答得很舒服，你的努力有回報。' },
    ],
    god: [
      { t: '{score100}/100：非常出色，你的專注與實力都令人佩服。' },
      { t: '{avgDifficultyLabel} 難度下仍這麼穩，真的很厲害。' },
      { t: '平均 {avgSec} 秒／題：又快又準，請好好享受這份成果。' },
      { t: '{score100}/100：你已是示範級表現，繼續保持就好。' },
      { t: '答對 {correct}/{total}：這局幾乎完美，你值得大大的肯定。' },
      { t: '太棒了，你的英文正在發光。' },
    ],
  };

  const byScore = personality === 'gentle' ? gentleByScore : toxicByScore;
  const pool: Cand[] = [...byScore[sTier]];

  const fastButWild =
    (timeTier === 'fast' || timeTier === 'ok') &&
    (sTier === 'awful' || sTier === 'low' || sTier === 'mid');
  if (fastButWild) {
    pool.push(
      personality === 'gentle'
        ? {
            t: '平均 {avgSec} 秒／題：速度不錯，下次多停一秒確認題意會更穩。',
          }
        : {
            t: '手指好忙（平均 {avgSec} 秒／題），但命中率仲未返工——先學識「慢啲但啱」。',
          },
      personality === 'gentle'
        ? {
            t: '速度分 {speedPts}/35 有餘力；答對分 {accPts}/65 提醒我們：快之前先求準。',
          }
        : {
            t: '速度分 {speedPts}/35 係有嘅；答對分 {accPts}/65 亦提醒你：快唔等於啱。',
          },
    );
  }

  const slowButSharp =
    (timeTier === 'slow' || timeTier === 'crawl') &&
    (sTier === 'good' || sTier === 'god');
  if (slowButSharp) {
    pool.push(
      personality === 'gentle'
        ? {
            t: '平均 {avgSec} 秒／題：你願意多想一步，這份穩很值得珍惜。',
          }
        : {
            t: '平均 {avgSec} 秒／題：慢係慢，但你起碼唔係亂揀——算係「慢工出細分」。',
          },
      personality === 'gentle'
        ? {
            t: '穩扎穩打帶來 {score100}/100，你的耐心正在開花。',
          }
        : {
            t: '你係穩嘅，但你慢到題目都想問你「仲做唔做？」({score100}/100)',
          },
    );
  }

  if (dTier === 'insane' || dTier === 'hard') {
    pool.push(
      personality === 'gentle'
        ? {
            t: '敢挑戰 {avgDifficultyLabel} 很勇敢；總分 {score100}/100，我們一起把重點記牢。',
          }
        : {
            t: '敢打 {avgDifficultyLabel} 算你膽生毛；總分 {score100}/100——下次唔好靠膽，靠實力。',
          },
    );
  }

  if (dTier === 'easy' && (sTier === 'low' || sTier === 'awful')) {
    pool.push(
      personality === 'gentle'
        ? {
            t: '這個難度下 {score100}/100 沒關係，我們從基礎慢慢堆起來。',
          }
        : {
            t: '呢難度都考成 {score100}/100——你唔係冇得救，你係仲未開始救自己。',
          },
    );
  }

  const picked = pickOne(pool);
  return { style: styleLabel, text: fill(picked.t) };
}
