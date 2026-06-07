import type { QuizEditorPersonality } from '@/types/database.types';
import type { EditorRemark } from '@/lib/quiz/editor-personality';
import type { Stage3FinalScoreResult } from '@/lib/stage3/stage3-final-score';

function pickOne<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

export function generateStage3EditorRemark(
  personality: QuizEditorPersonality,
  result: Stage3FinalScoreResult,
): EditorRemark {
  const { score100, stats, breakdown } = result;
  const styleLabel = personality === 'gentle' ? '溫柔治癒' : '毒舌嘲諷';

  const toxic: Record<string, string[]> = {
    god: [
      '下一個舞王就是你——{score100} 分，全場給你讓路。',
      'DISCO 之神降臨：Combo {combo}、PERFECT {perfect}，字母都識跳舞。',
      '{score100}/100？題庫想請你當 DJ。',
    ],
    good: [
      '節奏感唔錯，{score100} 分——再 sharpen 少少就舞王級。',
      'Combo {combo} 有交代，PERFECT {perfect} 亦醒，繼續加壓。',
      '{score100}/100：你嘅英文同舞步開始 sync。',
    ],
    mid: [
      'Combo {combo} 同 PERFECT {perfect} 參差，{score100} 分——仲有上升空間。',
      '{score100}/100：有高潮有低潮，似真係跳過舞。',
      '字母 {letters} 幫到手，但 Combo 要再穩。',
    ],
    low: [
      'Combo {combo} 斷得太密，{score100} 分——節拍未跟穩。',
      '{score100}/100：PERFECT 得 {perfect} 個，舞池仲未熱。',
      '你嘅手指快過你嘅 Combo（{combo}），問題唔小。',
    ],
    awful: [
      '{score100}/100：燈球都唔想跟你轉。',
      'Combo {combo}、PERFECT {perfect}——數字話晒一切。',
      '呢分唔係跳舞，係跌進舞池。',
    ],
  };

  const gentle: Record<string, string[]> = {
    god: [
      '下一個舞王就是你！{score100} 分，節奏與專注都太出色了。',
      'Combo {combo}、PERFECT {perfect} 都很亮眼，你值得這份滿分感。',
      '{score100}/100——請好好享受這一局的節奏與成就感。',
    ],
    good: [
      '{score100} 分表現很好，Combo {combo} 與 PERFECT {perfect} 都在線。',
      '字母 {letters} 扎實，再保持節拍就能更閃。',
      '這局跳得很穩，為自己鼓掌一下。',
    ],
    mid: [
      '{score100} 分：有亮點也有空間，Combo {combo} 可以再連久一點。',
      'PERFECT {perfect} 次數不錯，繼續累積手感。',
      '節奏漸漸找到了，下一局會更好。',
    ],
    low: [
      '{score100} 分：別灰心，Combo {combo} 與 PERFECT {perfect} 都可以再練。',
      '字母 {letters} 有進步，慢慢把節拍握穩。',
      '這局不容易，願意打完就很棒。',
    ],
    awful: [
      '{score100} 分只是起點，每一次按鍵都是練習。',
      'Combo {combo} 會隨著熟悉度上升，相信自己。',
      '今天累了也沒關係，休息一下再來。',
    ],
  };

  const tier =
    score100 >= 95 ? 'god' : score100 >= 75 ? 'good' : score100 >= 55 ? 'mid' : score100 >= 35 ? 'low' : 'awful';

  const pool = personality === 'gentle' ? gentle[tier]! : toxic[tier]!;
  const template = pickOne(pool);

  const text = template
    .replaceAll('{score100}', String(score100))
    .replaceAll('{combo}', String(stats.comboHits))
    .replaceAll('{perfect}', String(stats.perfectCount))
    .replaceAll('{letters}', String(stats.correctLetters))
    .replaceAll('{comboPts}', String(Math.round(breakdown.comboPoints)))
    .replaceAll('{perfectPts}', String(Math.round(breakdown.perfectPoints)))
    .replaceAll('{letterPts}', String(Math.round(breakdown.letterPoints)));

  return { style: styleLabel, text };
}
