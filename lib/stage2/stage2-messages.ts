import type { EditorRemark } from '@/lib/quiz/editor-personality';
import type { QuizEditorPersonality } from '@/types/database.types';

import { STAGE2_MAX_HEARTS, STAGE2_TOTAL_ROUNDS } from '@/lib/stage2/constants';

export const STAGE2_MODE_LABEL = 'STAGE 2';

export const STAGE2_ANNOUNCE_TEXT: Record<'start' | 'clear' | 'fail', string> = {
  start: 'STAGE 2 START',
  clear: 'STAGE CLEAR',
  fail: 'STAGE FAIL',
};

function pickOne<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

function fill(
  template: string,
  vars: { score100: number; heartsLeft: number; rounds: number },
): string {
  return template
    .replaceAll('{score100}', String(vars.score100))
    .replaceAll('{heartsLeft}', String(vars.heartsLeft))
    .replaceAll('{maxHearts}', String(STAGE2_MAX_HEARTS))
    .replaceAll('{rounds}', String(vars.rounds));
}

export function generateStage2EditorRemark(
  personality: QuizEditorPersonality,
  args: {
    passed: boolean;
    heartsLeft: number;
    score100: number;
  },
): EditorRemark {
  const { passed, heartsLeft, score100 } = args;
  const styleLabel = personality === 'gentle' ? '溫柔治癒' : '毒舌嘲諷';
  const vars = { score100, heartsLeft, rounds: STAGE2_TOTAL_ROUNDS };

  if (passed) {
    const gentle =
      heartsLeft >= STAGE2_MAX_HEARTS
        ? [
            '滿血通關！十回合影分身全數擊破，拼字眼力無可挑剔。',
            '分身術大成功：{rounds} 回合全破且生命力全滿，總分 {score100}/100。',
          ]
        : [
            '分身術通關！完成 {rounds} 回合，剩下 {heartsLeft}/{maxHearts} 顆心，總分 {score100}。',
            '影分身全部辨識成功——守住 {heartsLeft} 顆生命力過關，繼續保持專注拼字。',
            'STAGE CLEAR！錯字分身難不倒你，評價 {score100}/100。',
          ];
    const toxic =
      heartsLeft >= STAGE2_MAX_HEARTS
        ? [
            '十回合全中仲要滿血——你係咪背晒成個生字庫？',
            '{rounds} 回合分身術穿煲晒，{score100}/100：今次唔係運氣，係真係識字。',
          ]
        : [
            '十回合分身術都俾你穿煲——剩 {heartsLeft} 顆心，算你過關。',
            '通關啦，總分 {score100}；錯幾次都仲有血，下一關唔會咁仁慈。',
            'STAGE 2 過關：{heartsLeft}/{maxHearts} 顆心交差，唔好即刻鬆懈。',
          ];
    const pool = personality === 'gentle' ? gentle : toxic;
    return { style: styleLabel, text: fill(pickOne(pool), vars) };
  }

  const gentle = [
    '生命力歸零，未能破關；錯字分身記清楚，再挑戰一次很有機會。',
    '這次分身術失敗了，沒關係——多練幾個長單字，下一局會更穩。',
    '心用光了，但願意打完十回合就很棒；休息一下再來破關。',
  ];
  const toxic = [
    '心歸零、關未過——你揀嘅唔係真身，係你嘅自信。',
    'STAGE FAIL：拼錯幾次就爆煲，回去練字再嚟，唔好扮冇事。',
    '未能破關，總分 {score100}/100——錯字分身今日贏咗你。',
  ];
  const pool = personality === 'gentle' ? gentle : toxic;
  return { style: styleLabel, text: fill(pickOne(pool), vars) };
}
