'use client';

/**
 * 英語能力測試 — 須登入；登入後記錄最高分與 XP。
 * 首頁訪客測驗請見 `QuizHome`（`/`，非本頁）。
 * /quiz layout 使用 Press Start 2P；標題與「選擇難度」區塊另以 `.quiz-font-site-default` 還原全站 Inter。
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  RotateCcw,
  Sparkles,
  Trophy,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  fetchRandomQuizQuestions,
  getQuizBootstrap,
  recordQuizSession,
} from '@/lib/quiz/actions';
import {
  QUIZ_ADVANCE_AFTER_ANSWER_MS,
  QUIZ_QUESTIONS_PER_ROUND,
  QUIZ_TYPEWRITER_MS_PER_CHAR,
  XP_PER_CORRECT,
} from '@/lib/quiz/constants';
import { stripChoiceLetterPrefix, stripQuestionNumberPrefix } from '@/lib/quiz/question-utils';
import { computeQuizScore100, type QuizScoreBreakdown } from '@/lib/quiz/score-formula';
import {
  ensureQuizAudio,
  playQuizAnswerCorrect,
  playQuizAnswerWrong,
  playQuizResultFull,
  playRpgLineDone,
  playRpgTypeBlip,
} from '@/lib/quiz/rpg-audio';
import type { QuizQuestionPayload } from '@/lib/quiz/types';
import type { QuizDifficultyLevel } from '@/types/database.types';

type Phase = 'home' | 'loading' | 'play' | 'result';
type RemarkStyle =
  | '毒舌嘲諷'
  | '自嘲式'
  | '誇張鼓勵'
  | '陰陽怪氣'
  | '網路梗風'
  | '老師式酸言酸語'
  | '黑化吐槽'
  | '溫馨帶刺';

const DIFFICULTY_META: {
  id: QuizDifficultyLevel;
  label: string;
  short: string;
  emoji: string;
}[] = [
  { id: 'elementary', label: '初級 Elementary', short: '初級', emoji: '🌱' },
  { id: 'junior', label: '中級 Junior', short: '中級', emoji: '📘' },
  { id: 'college', label: '大學 College', short: '大學', emoji: '🎓' },
  { id: 'professor', label: '教授 Professor', short: '教授', emoji: '🔬' },
];

const DIFFICULTY_WEIGHT: Record<QuizDifficultyLevel, number> = {
  elementary: 1,
  junior: 2,
  college: 3,
  professor: 4,
};

type EditorRemark = {
  style: RemarkStyle;
  text: string;
};

function pickOne<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function difficultyTier(avgDifficulty: number): 'easy' | 'mid' | 'hard' | 'insane' {
  if (avgDifficulty < 1.6) return 'easy';
  if (avgDifficulty < 2.6) return 'mid';
  if (avgDifficulty < 3.6) return 'hard';
  return 'insane';
}

function scoreTier(score100: number): 'awful' | 'low' | 'mid' | 'good' | 'god' {
  if (score100 <= 25) return 'awful';
  if (score100 <= 45) return 'low';
  if (score100 <= 65) return 'mid';
  if (score100 <= 85) return 'good';
  return 'god';
}

function speedTier(avgSecPerQuestion: number): 'fast' | 'ok' | 'slow' | 'crawl' {
  if (avgSecPerQuestion <= 7) return 'fast';
  if (avgSecPerQuestion <= 18) return 'ok';
  if (avgSecPerQuestion <= 38) return 'slow';
  return 'crawl';
}

function generateEditorRemark(args: {
  score100: number;
  correct: number;
  total: number;
  avgDifficulty: number;
  avgDifficultyLabel: string;
  breakdown: QuizScoreBreakdown;
}): EditorRemark {
  const { score100, correct, total, avgDifficulty, avgDifficultyLabel, breakdown } = args;

  const sTier = scoreTier(score100);
  const dTier = difficultyTier(avgDifficulty);
  const timeTier = speedTier(breakdown.avgSecondsPerQuestion);
  const accPts = Math.round(breakdown.accuracyPoints);
  const speedPts = Math.round(breakdown.speedPoints);
  const avgSec = breakdown.avgSecondsPerQuestion.toFixed(1);

  type Cand = { style: RemarkStyle; t: string };

  const fill = (template: string) =>
    template
      .replaceAll('{score100}', String(score100))
      .replaceAll('{correct}', String(correct))
      .replaceAll('{total}', String(total))
      .replaceAll('{avgDifficultyLabel}', String(avgDifficultyLabel))
      .replaceAll('{avgSec}', avgSec)
      .replaceAll('{accPts}', String(accPts))
      .replaceAll('{speedPts}', String(speedPts));

  /** 毒舌模式：所有結算評語統一「毒舌嘲諷」。 */
  const toxicByScore: Record<ReturnType<typeof scoreTier>, Cand[]> = {
    awful: [
      { style: '毒舌嘲諷', t: '總分 {score100}/100：你嘅英文同你嘅自信，至少有一個係假的。' },
      { style: '毒舌嘲諷', t: '答對 {correct}/{total}——唔係你太差，係題目太有禮貌。' },
      { style: '毒舌嘲諷', t: '你而家最強技能：用最快速度排除正確答案。({avgSec} 秒／題)' },
      { style: '毒舌嘲諷', t: '{score100}/100：你嘅錯題密度高到可以當地圖用。' },
      { style: '毒舌嘲諷', t: '答對 {correct}/{total}：你唔係唔努力，你係努力緊錯方向。' },
      { style: '毒舌嘲諷', t: '你呢個分數好有「我有參與」嘅精神——但就只有精神。' },
    ],
    low: [
      { style: '毒舌嘲諷', t: '{score100}/100：你有進步空間，問題係空間大到可以起兩個機場。' },
      { style: '毒舌嘲諷', t: '答對 {correct}/{total}：再錯幾題就可以申請「錯題專家」證書。' },
      { style: '毒舌嘲諷', t: '速度分 {speedPts}/35 唔差，但答對分 {accPts}/65 正喺度喊救命。' },
      { style: '毒舌嘲諷', t: '{score100}/100：你開始識啲英文，但你啲英文唔係好識你。' },
      { style: '毒舌嘲諷', t: '答對 {correct}/{total}：你啱啱好接近「可以唔尷尬」——但仲未到。' },
      { style: '毒舌嘲諷', t: '你而家嘅狀態係：有概念，但冇把握；有把握嗰陣又啱唔到。' },
    ],
    mid: [
      { style: '毒舌嘲諷', t: '{score100}/100：你唔係唔識，你係識一半就開始亂嚟。' },
      { style: '毒舌嘲諷', t: '答對 {correct}/{total}：可以喎——但你嘅錯題依然好有存在感。' },
      { style: '毒舌嘲諷', t: '平均 {avgSec} 秒／題：諗得幾耐都好，唔好諗到最後揀錯就得。' },
      { style: '毒舌嘲諷', t: '{score100}/100：你已經唔係新手，但你仲成日扮新手錯。' },
      { style: '毒舌嘲諷', t: '答對 {correct}/{total}：你係有料嘅——只係啲料唔係次次攞得出嚟。' },
      { style: '毒舌嘲諷', t: '你而家最需要嘅唔係題目，係「唔好諗多咗」呢個技能。' },
    ],
    good: [
      { style: '毒舌嘲諷', t: '{score100}/100：算你有料——不過唔好太得戚，題庫仲未出王牌。' },
      { style: '毒舌嘲諷', t: '答對 {correct}/{total}：你已經強到令我搵槽點要加班。' },
      { style: '毒舌嘲諷', t: '答對分 {accPts}/65 在線，速度分 {speedPts}/35 亦唔失禮——繼續，唔好停。' },
      { style: '毒舌嘲諷', t: '{score100}/100：你係真係識——但你唔好用嚟得戚，得戚會倒退。' },
      { style: '毒舌嘲諷', t: '答對 {correct}/{total}：你已經可以同英文和平共處，恭喜。' },
      { style: '毒舌嘲諷', t: '你咁樣答落去，我啲毒舌位都要慳住用。' },
    ],
    god: [
      { style: '毒舌嘲諷', t: '{score100}/100：你咁勁，我毒舌都要講返句——懷疑你係題庫親戚。' },
      { style: '毒舌嘲諷', t: '{avgDifficultyLabel} 打成咁：唔好再卷啦，隔離啲人要活。' },
      { style: '毒舌嘲諷', t: '平均 {avgSec} 秒／題：又快又準，搞到我冇得笑你，唔抵。' },
      { style: '毒舌嘲諷', t: '{score100}/100：你係咪想逼我改行做讚美系小編？' },
      { style: '毒舌嘲諷', t: '答對 {correct}/{total}：你唔係考試，你係示範。' },
      { style: '毒舌嘲諷', t: '你再咁準，我就只可以改用「恭喜你」嚟毒舌你。' },
    ],
  };

  const pool: Cand[] = [...toxicByScore[sTier]];

  /** 調味：速度／準度／難度跟「主分數語氣」一致，不會硬扯相反形容。 */
  const fastButWild =
    (timeTier === 'fast' || timeTier === 'ok') &&
    (sTier === 'awful' || sTier === 'low' || sTier === 'mid');
  if (fastButWild) {
    pool.push(
      {
        style: '毒舌嘲諷',
        t: '手指好忙（平均 {avgSec} 秒／題），但命中率仲未返工——先學識「慢啲但啱」。',
      },
      {
        style: '毒舌嘲諷',
        t: '速度分 {speedPts}/35 係有嘅；答對分 {accPts}/65 亦提醒你：快唔等於啱。',
      },
    );
  }

  const slowButSharp =
    (timeTier === 'slow' || timeTier === 'crawl') &&
    (sTier === 'good' || sTier === 'god');
  if (slowButSharp) {
    pool.push(
      {
        style: '毒舌嘲諷',
        t: '平均 {avgSec} 秒／題：慢係慢，但你起碼唔係亂揀——算係「慢工出細分」。',
      },
      {
        style: '毒舌嘲諷',
        t: '你係穩嘅，但你慢到題目都想問你「仲做唔做？」({score100}/100)',
      },
    );
  }

  if (dTier === 'insane' || dTier === 'hard') {
    pool.push({
      style: '毒舌嘲諷',
      t: '敢打 {avgDifficultyLabel} 算你膽生毛；總分 {score100}/100——下次唔好靠膽，靠實力。',
    });
  }

  if (dTier === 'easy' && (sTier === 'low' || sTier === 'awful')) {
    pool.push({
      style: '毒舌嘲諷',
      t: '呢難度都考成 {score100}/100——你唔係冇得救，你係仲未開始救自己。',
    });
  }

  const picked = pickOne(pool);
  return { style: '毒舌嘲諷', text: fill(picked.t) };
}

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatSecondsShort(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '—';
  return `${sec.toFixed(1)} 秒／題`;
}

export default function EnglishQuizPage() {
  const [phase, setPhase] = useState<Phase>('home');
  const [difficulty, setDifficulty] = useState<QuizDifficultyLevel>('elementary');
  const [questions, setQuestions] = useState<QuizQuestionPayload[]>([]);
  const [cursor, setCursor] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correctTotal, setCorrectTotal] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  /** 僅管理員可見評語「風格」標籤（除錯／營運） */
  const [isAdmin, setIsAdmin] = useState(false);
  const [bestScores, setBestScores] = useState<
    Partial<Record<QuizDifficultyLevel, number>>
  >({});
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [recordError, setRecordError] = useState<string | null>(null);
  const [recordOutcome, setRecordOutcome] = useState<
    Awaited<ReturnType<typeof recordQuizSession>> | null
  >(null);
  const [syncingScore, setSyncingScore] = useState(false);
  const [editorRemark, setEditorRemark] = useState<EditorRemark | null>(null);
  const [resultBreakdown, setResultBreakdown] = useState<QuizScoreBreakdown | null>(null);
  const [animatedCorrectTotal, setAnimatedCorrectTotal] = useState(0);
  const [animatedScore100, setAnimatedScore100] = useState(0);

  /** RPG：題幹已打出來的字元 */
  const [typedQuestion, setTypedQuestion] = useState('');
  /** 與打字完成同步解鎖選項，避免 state 落後一幀 */
  const [optionsAnswerable, setOptionsAnswerable] = useState(false);
  const [questionCounts, setQuestionCounts] = useState<
    Partial<Record<QuizDifficultyLevel, number>>
  >({});
  const [showQuestionBankCounts, setShowQuestionBankCounts] = useState(false);

  // 按住「答對/答錯」提示框：暫停自動下一題；放手立刻下一題
  const [holdingFeedback, setHoldingFeedback] = useState(false);
  const [holdMs, setHoldMs] = useState(0);
  const [holdTyped, setHoldTyped] = useState('');
  const [holdNonce, setHoldNonce] = useState(0);
  const holdStartMsRef = useRef<number>(0);
  const holdTickRef = useRef<number | null>(null);
  const holdTypeRef = useRef<number | null>(null);
  const autoAdvanceRef = useRef<number | null>(null);

  const questionStartMsRef = useRef<number>(0);
  const questionAnswerSecondsRef = useRef<number[]>([]);
  const typeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const goNextOrFinishRef = useRef<() => Promise<void>>(async () => {});
  const pickQuizRef = useRef<{
    current: QuizQuestionPayload | null;
    picked: number | null;
    optionsAnswerable: boolean;
  }>({ current: null, picked: null, optionsAnswerable: false });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const boot = await getQuizBootstrap();
      if (cancelled) return;
      setUserId(boot.userId);
      setIsAdmin(boot.isAdmin);
      setBestScores(boot.bestScores);
      setQuestionCounts(boot.questionCounts);
      setShowQuestionBankCounts(boot.showQuestionBankCounts);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (phase !== 'play') return;
    const id = window.setInterval(() => {
      setSessionSeconds((t) => t + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'result') return;
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if (reduced) {
      setAnimatedCorrectTotal(correctTotal);
      setAnimatedScore100(resultBreakdown?.score100 ?? 0);
      return;
    }

    const toCorrect = correctTotal;
    const toScore = resultBreakdown?.score100 ?? 0;
    const fromCorrect = 0;
    const fromScore = 0;
    const start = performance.now();
    const dur = 650;

    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const ease = 1 - Math.pow(1 - t, 3);
      setAnimatedCorrectTotal(Math.round(fromCorrect + (toCorrect - fromCorrect) * ease));
      setAnimatedScore100(Math.round(fromScore + (toScore - fromScore) * ease));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, correctTotal, resultBreakdown?.score100]);

  const current = questions[cursor];
  const total = questions.length;
  const answeredThis = picked !== null;
  const isCorrect =
    picked !== null && current && picked === Number(current.correct_index);

  const aiTauntLine = useMemo(() => {
    if (!answeredThis) return null;
    const key = `${current?.id ?? cursor}-${isCorrect ? 'ok' : 'no'}`;
    const hash = Array.from(key).reduce(
      (acc, ch) => (acc * 33 + ch.charCodeAt(0)) >>> 0,
      5381,
    );
    const fillTiny = (t: string) =>
      t
        .replaceAll('{n}', String(cursor + 1))
        .replaceAll('{total}', String(total || questions.length || '—'));

    if (isCorrect) {
      const lines = [
        '答對？你係靠實力，定係靠地球自轉？',
        '可以喎。暫時批准你繼續做人類。',
        '呢題你贏咗，但你個英文仲未贏。',
        '好，算你有料。得一題啫，唔好膨脹。',
        '唔好咁快開心，下一題先係真正嘅羞辱。',
        '你啱啱嗰一下，幾有「讀過書」嘅味道。',
        '答得啱唔代表你無敵，只代表題目未出手啫。',
        '呢題你醒目到我想關機休息一下。',
        'OK，呢次我收聲三秒，俾你享受勝利。',
        '你再咁準，我就要改行做啦。',
        '恭喜，英文今日肯同你合作。',
        '你係咪偷睇答案？…算啦，當你真係叻。',
        '呢題你做得好，但唔好上頭。',
        '啱啦，保持住，唔好下一秒就翻車。',
        '有料。下一題唔會再咁溫柔。',
        '你啱啱嗰個選擇，好正常——我反而有啲唔慣。',
        '答對係應該嘅，問題係你可以維持幾耐。',
        '呢題你嬴咗我嘅偏見，暫時。',
        '算你贏。快啲去下一題畀我再搵位笑你。',
        '呢下有水準，唔好浪費。',
        '啱。你終於做返一次「合理嘅人」。',
        '答對咗都唔好太感動，正常操作嚟啫。',
        '呢題你答得啱，我都要深呼吸一下先接受到。',
        '你係咪突然醒覺？唔好嚇親我。',
        '今次你贏，但我記住你之前啲錯。',
        '答對咗先講：你個選擇終於唔再似抽籤。',
        'OK，{n}/{total} 題。你仲有時間翻車，唔使急。',
        '呢個答法好「教科書」——你係咪真係讀過？',
        '啱到咁，我差啲以為你開咗外掛。',
        '你啱啱嗰下好似識英文——就一秒。',
        '呢題你答對，我俾你一個「唔錯」嘅眼神。',
        'Keep it up——唔係鼓勵你，係怕你下一題更尷尬。',
        '咁啱都俾你撞到？算啦，當你有實力。',
        '答得啱係應該嘅。你之前嗰啲先係驚喜。',
        '你再答對幾題，我就冇糧出（冇位毒舌）。',
        '呢下準到，我都要改用溫柔語氣……算了，唔會。',
        '你做得好，但唔好期待我讚你第二次。',
        '呢題你贏咗。恭喜你暫時唔使面壁。',
        '你啱啱嗰下好有「識」嘅味道，唔好浪費。',
      ];
      return fillTiny(lines[hash % lines.length]!);
    }

    const lines = [
      '答錯都唔緊要——緊要係你仲好自信咁揀。',
      '你啱啱揀嗰個選項，題目都忍唔住笑咗。',
      '呢題係送分題，你竟然拒收。',
      '唔使急，慢慢錯，我有時間。',
      '你嘅英文同你嘅選擇一樣：好有勇氣。',
      '你唔係揀錯，你係揀咗「最有戲」嗰個。',
      '呢個答案好有創意——可惜測驗唔計創意分。',
      '你嘅選擇令正確答案顯得更加孤單。',
      '你係咪同錯題有簽約？成日見到你。',
      '你咁揀，我都唔知應該笑你定安慰你。',
      '錯得咁有自信，真係一種天賦。',
      '你啱啱嗰下，係「果斷地錯」。',
      '呢題你避開咗正確答案，好似避開責任咁熟練。',
      '錯得咁快，速度分應該俾你加返少少。',
      '你唔明白唔緊要，最緊要你唔好扮明。',
      '題目出 A，你回覆：我想要 D（錯）。',
      '你再咁揀，我要幫你報名補習班。',
      '你嘅英文：未死；你嘅選項：先死。',
      '呢題你輸咗，但你仲有機會輸得更精彩。',
      '你唔好望住我，我都救唔到你呢個選擇。',
      '你啱啱嗰下係示範咩叫「距離正確一步之遙，但你向後退」。',
      '呢個錯法好有代表性：代表你真係唔識。',
      '你揀得咁離譜，我差啲以為你係出題嗰個。',
      '我唔想毒舌，但你逼我。',
      '錯咗先係學習——但你學得有啲太勤力。',
      '你啱啱嗰個選項，好似專登揀嚟激嬲正確答案。',
      '錯得咁穩陣，你係咪平時都咁穩陣錯？',
      '你嘅英文：想努力；你嘅手：唔想。',
      '你而家係用生命證明「排除法」可以排除啱嗰個。',
      '你揀錯唔緊要，最緊要你唔好再用同一個邏輯。',
      '呢題你答錯，我都唔知點樣安慰你先唔違心。',
      '你啱啱嗰下係「自信地偏離」。',
      '錯到咁，我差啲想幫你按返回上一題。',
      '你望一望正確答案先——唔係畀你學，係畀你記仇。',
      '你係咪同錯答案做緊 KPI？',
      '呢個錯法好有「個人風格」——可惜唔係加分項。',
      '你嘅選擇令我懷疑：你係咪唔鍾意答啱？',
      '錯都可以，但你唔好錯到咁理直氣壯。',
      '你啱啱嗰下，係幫正確答案做咗個「對照組」。',
      '唔係我毒舌，係你個選項太有故事。',
      '你揀嗰個答案，係咪你最鍾意嗰個？…可惜唔係啱嗰個。',
      '你咁揀，我都想問一句：你係咪想快啲結束？',
      '錯咗就算啦。下一題再錯得精彩啲。',
      '你而家 {n}/{total} 題，仲有時間救返個面。',
      '你啱啱嗰下係「用速度換錯誤」。',
      '你唔係唔識，你係諗太多諗到自己都信錯。',
      '呢題你答錯，我唔笑你——我係擔心你。',
      '你揀錯係一種選擇，而你選擇咗堅持。',
    ];
    return fillTiny(lines[hash % lines.length]!);
  }, [answeredThis, current?.id, cursor, isCorrect]);

  pickQuizRef.current = {
    current: current ?? null,
    picked,
    optionsAnswerable,
  };

  /** 題幹打字機：換題時重跑 */
  useEffect(() => {
    if (phase !== 'play' || !current) {
      setTypedQuestion('');
      setOptionsAnswerable(false);
      return;
    }

    if (typeTimerRef.current) {
      clearInterval(typeTimerRef.current);
      typeTimerRef.current = null;
    }

    const full = stripQuestionNumberPrefix(current.question_text);
    setTypedQuestion('');
    setOptionsAnswerable(false);

    const markReadyAndStartClock = () => {
      playRpgLineDone();
      questionStartMsRef.current = Date.now();
    };

    if (!full.length) {
      setOptionsAnswerable(true);
      markReadyAndStartClock();
      return;
    }

    let i = 0;
    typeTimerRef.current = setInterval(() => {
      i += 1;
      const next = full.slice(0, i);
      setTypedQuestion(next);
      const ch = full[i - 1];
      if (ch && /\S/.test(ch)) playRpgTypeBlip();

      if (i >= full.length) {
        if (typeTimerRef.current) {
          clearInterval(typeTimerRef.current);
          typeTimerRef.current = null;
        }
        setOptionsAnswerable(true);
        markReadyAndStartClock();
      }
    }, QUIZ_TYPEWRITER_MS_PER_CHAR);

    return () => {
      if (typeTimerRef.current) {
        clearInterval(typeTimerRef.current);
        typeTimerRef.current = null;
      }
    };
  }, [phase, cursor, current?.id]);

  const avgDifficulty = useMemo(() => {
    if (!questions.length) return DIFFICULTY_WEIGHT[difficulty];
    const sum = questions.reduce((acc, q) => acc + DIFFICULTY_WEIGHT[q.difficulty], 0);
    return sum / questions.length;
  }, [questions, difficulty]);

  const avgDifficultyLabel = useMemo(() => {
    const tier = difficultyTier(avgDifficulty);
    if (tier === 'easy') return '初級';
    if (tier === 'mid') return '中級';
    if (tier === 'hard') return '大學';
    return '教授';
  }, [avgDifficulty]);

  const progressValue = useMemo(() => {
    if (!total) return 0;
    return ((cursor + (answeredThis ? 1 : 0)) / total) * 100;
  }, [cursor, answeredThis, total]);

  const startGame = useCallback(async () => {
    ensureQuizAudio();
    setPhase('loading');
    setSessionSeconds(0);
    setRecordOutcome(null);
    setSyncingScore(false);
    setRecordError(null);
    setEditorRemark(null);
    setResultBreakdown(null);
    questionAnswerSecondsRef.current = [];
    const res = await fetchRandomQuizQuestions(difficulty);
    if (!res.ok) {
      setPhase('home');
      alert(res.message);
      return;
    }
    setQuestions(res.questions);
    setCursor(0);
    setPicked(null);
    setCorrectTotal(0);
    setPhase('play');
  }, [difficulty]);

  const onPickOption = useCallback((index: number) => {
    ensureQuizAudio();
    const ctx = pickQuizRef.current;
    if (!ctx.current || ctx.picked !== null || !ctx.optionsAnswerable) return;
    if (!Number.isInteger(index) || index < 0 || index > 3) return;
    const rawSec = (Date.now() - questionStartMsRef.current) / 1000;
    const sec = clamp(rawSec, 0.25, 180);
    questionAnswerSecondsRef.current[cursor] = sec;
    const correct = index === Number(ctx.current.correct_index);
    if (correct) {
      playQuizAnswerCorrect();
    } else {
      playQuizAnswerWrong();
    }
    setPicked(index);
    if (correct) {
      setCorrectTotal((c) => c + 1);
    }
  }, [cursor]);

  const goNextOrFinish = async () => {
    if (!current || picked === null) return;
    if (cursor < total - 1) {
      setCursor((i) => i + 1);
      setPicked(null);
      return;
    }
    let totalAnswerSeconds = 0;
    for (let i = 0; i < total; i++) {
      const t = questionAnswerSecondsRef.current[i];
      totalAnswerSeconds +=
        typeof t === 'number' && Number.isFinite(t) ? clamp(t, 0.25, 180) : 55;
    }
    const breakdown = computeQuizScore100(correctTotal, total, totalAnswerSeconds);
    ensureQuizAudio();
    playQuizResultFull(breakdown.score100);
    setResultBreakdown(breakdown);
    setPhase('result');
    setEditorRemark(
      generateEditorRemark({
        score100: breakdown.score100,
        correct: correctTotal,
        total,
        avgDifficulty,
        avgDifficultyLabel,
        breakdown,
      }),
    );
    if (userId) setSyncingScore(true);
    const outcome = await recordQuizSession(
      difficulty,
      correctTotal,
      total,
      totalAnswerSeconds,
    );
    setSyncingScore(false);
    if (!outcome.ok) {
      setRecordError(outcome.message);
      setRecordOutcome(null);
      return;
    }
    setRecordOutcome(outcome);
    setRecordError(null);
    if (outcome.ok && outcome.loggedIn) {
      setBestScores((prev) => ({
        ...prev,
        [difficulty]: outcome.newBest,
      }));
    }
  };

  goNextOrFinishRef.current = goNextOrFinish;

  useEffect(() => {
    // 自動跳下一題（但如果使用者按住提示框，則暫停）
    if (autoAdvanceRef.current) {
      window.clearTimeout(autoAdvanceRef.current);
      autoAdvanceRef.current = null;
    }
    if (phase !== 'play' || picked === null || holdingFeedback) return;
    autoAdvanceRef.current = window.setTimeout(() => {
      autoAdvanceRef.current = null;
      void goNextOrFinishRef.current();
    }, QUIZ_ADVANCE_AFTER_ANSWER_MS);
    return () => {
      if (autoAdvanceRef.current) {
        window.clearTimeout(autoAdvanceRef.current);
        autoAdvanceRef.current = null;
      }
    };
  }, [phase, picked, cursor, holdingFeedback]);

  const holdMessageTarget = useMemo(() => {
    if (!holdingFeedback || holdMs < 2000) return null;
    const tier =
      holdMs >= 10000 ? 'bye' : holdMs >= 7000 ? 'broken' : holdMs >= 5000 ? 'cheat' : 'release';

    const seed = `${current?.id ?? cursor}-${tier}-${holdNonce}`;
    const hash = Array.from(seed).reduce((acc, ch) => (acc * 33 + ch.charCodeAt(0)) >>> 0, 5381);

    const pools: Record<typeof tier, string[]> = {
      release: [
        'OK就放手去下一題！',
        '睇清楚未？放手我就幫你跳下一題。',
        '讀完就放手啦，唔好同條題目談戀愛。',
        '放手啦，時間唔會等你——下一題更加殘酷。',
        '得啦得啦，記住答案就放手。',
        '你係要停幾耐先肯走？放手啦。',
        '我數三聲你就放手：三、二…（其實我唔會數到一）。',
        '你而家係「復盤」緊，定係「懷疑人生」緊？放手先講。',
        '睇完就走啦，唔好喺度露營。',
        '放手啦，下一題已經等到發霉。',
        '你停得越耐，我越有理由懷疑你係想拖時間。',
        '記住：長按係暫停，唔係加長尷尬時間。',
        '放手啦，啱啱嗰個錯已經夠難睇。',
        '你再唔放手，我都要替你尷尬。',
        'OK，學完未？學完就走。',
      ],
      cheat: [
        '唔好諗住出貓呀！',
        '你係咪想背答案？我睇住你㗎。',
        '停太耐會俾人誤會你截圖做筆記。',
        '睇到咁耐，你係咪準備抄落去？',
        '你而家係「學習」定係「出貓」先？',
        '你再停，我就當你想報名補習班。',
        '你啱啱嗰下停法，好有「我識做筆記」嘅味道。',
        '你想影相留念？唔好啦，留返面俾自己。',
        '你個手勢好熟練喎——係咪練過？',
        '長按可以，但唔好長按到好似開卷。',
        '你以為我唔知你想做咩？我只係懶得講。',
        '你想偷睇答案冇問題——問題係你偷咗都未必記得。',
        '停咁耐都唔會變啱，最多只會變尷尬。',
        '你如果真係要抄，我建議你抄「正確答案」嗰個先。',
      ],
      broken: [
        '我極度懷疑你個嘢壞左。',
        '你個手指係咪黐咗喺螢幕？',
        '你係咪唔識放手？要我教你？',
        '你停咁耐，我都開始懷疑我自己係咪卡住。',
        '你係咪當呢度係暫停選單？（其實係）',
        '唔好再 hold 啦，我怕你部機真係壞。',
        '你係咪用緊一隻手做其他嘢？（我唔想知）。',
        '你停到我都以為你去沖涼返嚟。',
        '你部機冇壞，可能係你嘅決心壞咗。',
        '你再 hold，我就當你想申請「永久暫停」。',
        '你咁停法，下一題都會怕咗你。',
        '你係咪用「暫停」嚟逃避現實？',
        '我俾你暫停係做人性化，唔係俾你無限期拖延。',
        '你而家停到連題目都想講：放我走。',
      ],
      bye: [
        'BYE！',
        'BYE！我幫你跳下一題，唔使客氣。',
        'BYE！你再唔放手，我就幫你放。',
        'BYE！夠鐘，走啦。',
        'BYE！我哋唔係嚟度長住㗎。',
        'BYE！時間到，我幫你做決定。',
        'BYE！你停得夠耐，我都諗住收工。',
        'BYE！下一題見——希望你有返啲自尊。',
        'BYE！你嘅手指需要放生。',
        'BYE！你再拖，我就當你認輸。',
      ],
    };

    const pool = pools[tier];
    return pool[hash % pool.length]!;
  }, [holdingFeedback, holdMs, current?.id, cursor, holdNonce]);

  useEffect(() => {
    // typewriter：只在 overlay 顯示時打字；文字切換時重打
    if (holdTypeRef.current) {
      window.clearInterval(holdTypeRef.current);
      holdTypeRef.current = null;
    }
    const target = holdMessageTarget;
    if (!target) {
      setHoldTyped('');
      return;
    }
    setHoldTyped('');
    let i = 0;
    holdTypeRef.current = window.setInterval(() => {
      i += 1;
      setHoldTyped(target.slice(0, i));
      if (i >= target.length) {
        if (holdTypeRef.current) {
          window.clearInterval(holdTypeRef.current);
          holdTypeRef.current = null;
        }
      }
    }, 22);
    return () => {
      if (holdTypeRef.current) {
        window.clearInterval(holdTypeRef.current);
        holdTypeRef.current = null;
      }
    };
  }, [holdMessageTarget]);

  const stopHold = useCallback(
    (opts?: { advanceIfPossible?: boolean }) => {
      if (holdTickRef.current) {
        window.clearInterval(holdTickRef.current);
        holdTickRef.current = null;
      }
      if (holdTypeRef.current) {
        window.clearInterval(holdTypeRef.current);
        holdTypeRef.current = null;
      }
      setHoldingFeedback(false);
      setHoldMs(0);
      setHoldTyped('');

      if (opts?.advanceIfPossible && phase === 'play' && picked !== null) {
        if (autoAdvanceRef.current) {
          window.clearTimeout(autoAdvanceRef.current);
          autoAdvanceRef.current = null;
        }
        void goNextOrFinishRef.current();
      }
    },
    [phase, picked],
  );

  const startHold = useCallback(() => {
    if (phase !== 'play' || picked === null) return;
    if (autoAdvanceRef.current) {
      window.clearTimeout(autoAdvanceRef.current);
      autoAdvanceRef.current = null;
    }
    holdStartMsRef.current = Date.now();
    setHoldingFeedback(true);
    setHoldNonce((n) => n + 1);
    setHoldMs(0);
    if (holdTickRef.current) {
      window.clearInterval(holdTickRef.current);
      holdTickRef.current = null;
    }
    holdTickRef.current = window.setInterval(() => {
      setHoldMs(Date.now() - holdStartMsRef.current);
    }, 100);
  }, [phase, picked]);

  useEffect(() => {
    // hold 住 >= 11 秒：強制消失並進下一題（10 秒先顯示 BYE！）
    if (!holdingFeedback || phase !== 'play' || picked === null) return;
    if (holdMs < 11000) return;

    // 先讓「BYE！」至少有機會 render 一幀（然後立刻強制跳題）
    setHoldTyped('BYE！');
    requestAnimationFrame(() => {
      stopHold({ advanceIfPossible: true });
    });
  }, [holdingFeedback, holdMs, phase, picked, stopHold]);

  const resetToHome = () => {
    setPhase('home');
    setQuestions([]);
    setCursor(0);
    setPicked(null);
    setCorrectTotal(0);
    setSessionSeconds(0);
    setRecordOutcome(null);
    setRecordError(null);
    setSyncingScore(false);
    setEditorRemark(null);
    setResultBreakdown(null);
    setTypedQuestion('');
    questionAnswerSecondsRef.current = [];
  };

  const diffMeta = DIFFICULTY_META.find((d) => d.id === difficulty);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 md:py-14">
      <div className="quiz-font-site-default mb-8 text-center">
        <Badge variant="secondary" className="mb-3">
          AI英語鬥
        </Badge>
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          英語能力測試
        </h1>
        <p className="mt-2 text-muted-foreground text-sm md:text-base">
          AI即時解析；累積 XP 並刷新各難度最高分。
        </p>
      </div>

      {phase === 'home' && (
        <Card className="quiz-font-site-default border-border/80 shadow-md">
          <CardHeader>
            <CardTitle>選擇難度</CardTitle>
            <CardDescription>
              由 AI 提問 {QUIZ_QUESTIONS_PER_ROUND} 條問題、以四選一形式發問；總分滿分 100（答對率 + 作答速度）。
              登入後另依答對題數發放經驗值。
            </CardDescription>
            {showQuestionBankCounts && (
              <p className="text-muted-foreground text-xs leading-relaxed">
                目前難度「{DIFFICULTY_META.find((x) => x.id === difficulty)?.short ?? difficulty}
                」題庫：
                {questionCounts[difficulty] != null ? (
                  <span className="font-medium text-foreground">
                    {' '}
                    {questionCounts[difficulty]} 題
                  </span>
                ) : (
                  <span> 無法讀取（請確認 Supabase 已有 questions 表並執行題庫 SQL）</span>
                )}
                {questionCounts[difficulty] === 0 && (
                  <span className="block pt-1 text-amber-600 dark:text-amber-400">
                    此難度尚無題目：請在 Supabase SQL Editor 依序執行 supabase/questions_create.sql、
                    supabase/questions_seed_300.sql
                  </span>
                )}
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-2">
              {DIFFICULTY_META.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDifficulty(d.id)}
                  className={cn(
                    'rounded-xl border p-4 text-left transition-all hover:bg-accent/50',
                    'quiz-font-pixel',
                    'quiz-font-press-start',
                    difficulty === d.id
                      ? 'border-primary bg-accent/40 ring-2 ring-primary/30'
                      : 'border-border bg-card',
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-lg font-semibold">
                      {d.emoji} {d.short}
                    </span>
                    <Badge variant="xp">+{XP_PER_CORRECT[d.id]} XP／題</Badge>
                  </div>
                  <p className="mt-1 text-muted-foreground text-xs">{d.label}</p>
                  {userId && bestScores[d.id] != null && (
                    <p className="mt-2 text-muted-foreground text-xs">
                      目前最高分：{bestScores[d.id]}／100
                    </p>
                  )}
                </button>
              ))}
            </div>
            <Separator />
            <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
              <p className="text-muted-foreground text-sm">
                {userId ? (
                  <span className="inline-flex items-center gap-1">
                    <Sparkles className="size-4 text-amber-500" />
                    已登入：成績會寫入帳號
                  </span>
                ) : (
                  null
                )}
              </p>
              <Button
                size="lg"
                className={cn(
                  'w-full border-2 border-primary/80 bg-primary shadow-[4px_4px_0_hsl(var(--foreground)/0.2)] sm:w-auto',
                  'hover:translate-x-px hover:translate-y-px hover:shadow-[3px_3px_0_hsl(var(--foreground)/0.2)]',
                  'active:translate-x-1 active:translate-y-1 active:shadow-none',
                )}
                onClick={() => void startGame()}
              >
                <span className="quiz-game-start-label quiz-font-press-start">
                  GAME START
                </span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {phase === 'loading' && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16">
            <div className="size-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-muted-foreground">正在為你準備題目…</p>
          </CardContent>
        </Card>
      )}

      {phase === 'play' && current && (
        <>
          <div className="mx-auto w-full max-w-2xl pb-48">
            <Card className="overflow-hidden border-border/80 shadow-lg">
              <CardHeader className="space-y-4 pb-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{diffMeta?.short ?? difficulty}</Badge>
                    <span className="text-muted-foreground text-sm">
                      第 {cursor + 1}／{total} 題
                    </span>
                    {!optionsAnswerable && (
                      <span className="text-muted-foreground text-xs">（題幹顯示中）</span>
                    )}
                  </div>
                  <Badge variant="secondary" className="gap-1 font-mono">
                    <Clock className="size-3.5 opacity-80" />
                    {formatClock(sessionSeconds)}
                  </Badge>
                </div>
                <Progress value={progressValue} className="h-2" />
              </CardHeader>
              <CardContent className="relative space-y-6">
                <div className="w-full rounded-xl border border-dashed border-muted-foreground/30 bg-muted/25 p-4 text-left">
                  <p className="text-base leading-relaxed md:text-lg dark:text-[#00ff7f] dark:[text-shadow:0_0_10px_rgba(0,255,127,0.7),0_0_26px_rgba(0,255,127,0.35)]">
                    {typedQuestion}
                    {!optionsAnswerable && (
                      <span className="ml-0.5 inline-block animate-pulse text-primary">▌</span>
                    )}
                  </p>
                </div>

                <div className="relative isolate">
                  <div
                    className="grid gap-3"
                    inert={picked !== null}
                    onClick={(e) => {
                      const el = (e.target as HTMLElement | null)?.closest?.(
                        '[data-option-index]',
                      ) as HTMLElement | null;
                      const raw = el?.dataset?.optionIndex;
                      const idx = raw === undefined ? NaN : Number.parseInt(raw, 10);
                      if (!Number.isInteger(idx) || idx < 0 || idx > 3) return;
                      onPickOption(idx);
                    }}
                  >
                    {current.options.map((opt, i) => {
                      const isSel = picked === i;
                      const showTruth = answeredThis;
                      const isAns = i === Number(current.correct_index);
                      return (
                        <button
                          key={`${current.id}-${i}`}
                          type="button"
                          data-option-index={String(i)}
                          className={cn(
                            buttonVariants({ variant: isSel ? 'default' : 'outline' }),
                            'touch-manipulation select-none',
                            'h-auto min-h-12 w-full justify-start gap-0 whitespace-normal px-4 py-3 text-left font-normal',
                            showTruth &&
                              isAns &&
                              'border-emerald-500/80 bg-emerald-500/15 text-foreground hover:bg-emerald-500/20',
                            showTruth &&
                              isSel &&
                              !isAns &&
                              'border-destructive/80 bg-destructive/10 text-foreground hover:bg-destructive/15',
                          )}
                        >
                          <span className="mr-3 flex size-7 shrink-0 items-center justify-center rounded-full border bg-background font-mono text-sm dark:text-[#00ff7f] dark:[text-shadow:0_0_10px_rgba(0,255,127,0.7),0_0_26px_rgba(0,255,127,0.35)]">
                            {String.fromCharCode(65 + i)}
                          </span>
                          <span className="flex-1 text-left dark:text-[#00ff7f] dark:[text-shadow:0_0_10px_rgba(0,255,127,0.7),0_0_26px_rgba(0,255,127,0.35)]">
                            {stripChoiceLetterPrefix(opt) ||
                              opt
                                .replace(/^\s*[A-Da-d][\.\)\uff0e]\s*/u, '')
                                .trim() ||
                              'no article'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {!optionsAnswerable && (
                    <div
                      className="absolute inset-0 z-10 cursor-wait touch-none rounded-lg"
                      aria-hidden
                      role="presentation"
                    />
                  )}
                </div>

                {answeredThis && (
                  <div
                    className={cn(
                      'quiz-font-site-default rounded-lg border p-4 select-none touch-none',
                      isCorrect
                        ? 'border-emerald-500/40 bg-emerald-500/10'
                        : 'border-destructive/40 bg-destructive/10',
                    )}
                    onPointerDown={(e) => {
                      // iOS/Safari：避免觸控長按被捲動/點擊競態打斷
                      if (e.pointerType === 'touch') e.preventDefault();
                      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
                      startHold();
                    }}
                    onPointerUp={() => stopHold({ advanceIfPossible: true })}
                    onPointerCancel={() => stopHold({ advanceIfPossible: true })}
                    onTouchStart={(e) => {
                      // 部分 iOS 版本 pointer 事件不穩，touch 作為保險
                      e.preventDefault();
                      startHold();
                    }}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      stopHold({ advanceIfPossible: true });
                    }}
                    onTouchCancel={(e) => {
                      e.preventDefault();
                      stopHold({ advanceIfPossible: true });
                    }}
                    onContextMenu={(e) => e.preventDefault()}
                  >
                    <div className="mb-2 flex items-center gap-2 font-medium">
                      {isCorrect ? (
                        <>
                          <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />
                          答對了！
                        </>
                      ) : (
                        <>
                          <XCircle className="size-5 text-destructive" />
                          答錯了
                        </>
                      )}
                    </div>
                    <p className="mb-2 text-muted-foreground text-xs">
                      長按這裡可暫停看清答案
                    </p>
                    {aiTauntLine && (
                      <p
                        className={cn(
                          'mb-2 text-sm font-semibold',
                          isCorrect
                            ? 'text-emerald-800 dark:text-emerald-200'
                            : 'text-destructive',
                        )}
                      >
                        AI小編：{aiTauntLine}
                      </p>
                    )}
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {current.explanation}
                    </p>
                  </div>
                )}

                {holdMessageTarget && (
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 z-20 flex items-start justify-center pt-3"
                  >
                    <div className="max-w-[92%] rounded-lg border border-border/60 bg-background/70 px-4 py-3 text-center text-sm text-foreground shadow-lg backdrop-blur">
                      <span className="inline-block whitespace-pre-wrap leading-relaxed">
                        {holdTyped}
                        {holdTyped.length < holdMessageTarget.length && (
                          <span className="ml-0.5 inline-block animate-pulse text-primary">▌</span>
                        )}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {phase === 'result' && (
        <Card className="quiz-font-result-mixed border-border/80 shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex size-14 items-center justify-center rounded-full bg-primary/10">
              <Trophy className="size-8 text-amber-500" />
            </div>
            <CardTitle className="text-2xl">測驗完成</CardTitle>
            <CardDescription>{diffMeta?.label}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-xl border bg-muted/30 p-6 text-center">
              <p className="text-muted-foreground text-sm">本局答對</p>
              <p className="mt-1 font-bold text-4xl tabular-nums">
                {animatedCorrectTotal}
                <span className="text-muted-foreground text-2xl font-normal">
                  {' '}
                  ／ {total}
                </span>
              </p>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs">
                <Badge variant="outline">
                  總分 {resultBreakdown ? animatedScore100 : '—'}／100
                </Badge>
                <Badge variant="secondary">平均難度：{avgDifficultyLabel}</Badge>
                {resultBreakdown && (
                  <Badge variant="outline" className="font-normal">
                    平均作答 {formatSecondsShort(resultBreakdown.avgSecondsPerQuestion)}
                  </Badge>
                )}
              </div>
              {resultBreakdown && (
                <p className="mt-2 text-muted-foreground text-xs">
                  得分構成：答對率約 {Math.round(resultBreakdown.accuracyPoints)}／65　+　速度約{' '}
                  {Math.round(resultBreakdown.speedPoints)}／35
                </p>
              )}
              <Progress value={resultBreakdown ? animatedScore100 : 0} className="mt-4 h-2" />
            </div>

            <div className="rounded-xl border border-primary/25 bg-gradient-to-b from-primary/10 to-transparent p-5 shadow-sm">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex size-9 items-center justify-center rounded-full bg-primary/15">
                    <Sparkles className="size-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold tracking-tight">AI小編評語</p>
                  </div>
                </div>
                {isAdmin && editorRemark && (
                  <Badge
                    className="text-xs"
                    variant={
                      (resultBreakdown?.score100 ?? 0) >= 80
                        ? 'xp'
                        : (resultBreakdown?.score100 ?? 0) <= 35
                          ? 'destructive'
                          : 'secondary'
                    }
                  >
                    風格：{editorRemark.style}
                  </Badge>
                )}
              </div>
              <div
                className={cn(
                  'rounded-lg border p-4 text-sm leading-relaxed',
                  (resultBreakdown?.score100 ?? 0) >= 80
                    ? 'border-emerald-500/30 bg-emerald-500/10'
                    : (resultBreakdown?.score100 ?? 0) <= 35
                      ? 'border-destructive/30 bg-destructive/10'
                      : 'border-border/60 bg-muted/30',
                )}
              >
                {editorRemark?.text ?? '小編正在努力想梗…（可能被你的分數嚇到了）'}
              </div>
            </div>

            {userId && (
              <>
                <Separator />
                <div className="space-y-3 text-sm">
                  {syncingScore && (
                    <p className="text-muted-foreground text-xs">正在同步成績與經驗值…</p>
                  )}
                  {recordOutcome?.ok && recordOutcome.loggedIn && !syncingScore && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">本難度玩家排名</span>
                        <span className="font-medium tabular-nums">
                          第 {recordOutcome.newRank} / {recordOutcome.totalPlayers} 名
                        </span>
                      </div>
                      {recordOutcome.rankDelta != null && recordOutcome.rankDelta !== 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">名次變化</span>
                          <span
                            className={cn(
                              'font-medium tabular-nums',
                              recordOutcome.rankDelta > 0
                                ? 'text-emerald-700 dark:text-emerald-300'
                                : 'text-destructive',
                            )}
                          >
                            {recordOutcome.rankDelta > 0
                              ? `↑ 上升 ${recordOutcome.rankDelta} 位`
                              : `↓ 下跌 ${Math.abs(recordOutcome.rankDelta)} 位`}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">挑戰前此難度最佳</span>
                        <span className="font-medium tabular-nums">
                          {recordOutcome.previousBest}／100
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">更新後此難度最佳</span>
                        <span className="font-medium tabular-nums">
                          {recordOutcome.newBest}／100
                        </span>
                      </div>
                      {recordOutcome.newBest > recordOutcome.previousBest && (
                        <Badge className="w-full justify-center py-1" variant="xp">
                          新紀錄！
                        </Badge>
                      )}
                      <div className="flex justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 dark:bg-amber-500/5">
                        <span className="flex items-center gap-1 text-amber-800 dark:text-amber-200">
                          <Sparkles className="size-4" />
                          本次獲得經驗值
                        </span>
                        <span className="font-bold tabular-nums text-amber-900 dark:text-amber-100">
                          +{recordOutcome.xpEarned} XP
                        </span>
                      </div>
                      <p className="text-muted-foreground text-xs">
                        目前累計 EXP {recordOutcome.newExp}，等級 Lv.{recordOutcome.newLevel}
                      </p>
                    </>
                  )}
                  {!syncingScore &&
                    recordOutcome?.ok &&
                    !recordOutcome.loggedIn &&
                    userId && (
                      <p className="text-center text-muted-foreground text-xs">
                        登入工作階段已失效，本次無法寫入經驗值。
                      </p>
                    )}
                </div>
              </>
            )}

            {!userId && (
              <p className="text-center text-muted-foreground text-sm">
                登入帳號後，每局可依答對題數獲得經驗值並記錄各難度最高分。
              </p>
            )}

            {recordError && (
              <p className="text-center text-destructive text-sm">{recordError}</p>
            )}
          </CardContent>
          <CardFooter className="flex justify-center border-t pb-6">
            <Button variant="secondary" size="lg" onClick={resetToHome}>
              <RotateCcw className="size-4" />
              再玩一局
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
