'use client';

/**
 * 首頁專用「快速英語能力測試」（10 題；優先依難度配額抽題）
 * 行銷落地頁（layout=landing）使用柔和專業音效（lib/quiz/home-quiz-audio）。
 * cinematic 佈局沿用 8-bit RPG 音效（lib/quiz/rpg-audio）。
 */

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Press_Start_2P } from 'next/font/google';
import { useTheme } from 'next-themes';
import { CheckCircle2, Loader2, Sparkles, XCircle } from 'lucide-react';

import { RegisterFormCard } from '@/components/auth/register-form-card';
import { useHomeBackdropPlayback } from '@/components/home-backdrop-playback';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { fetchHomeQuizQuestions } from '@/lib/quiz/home-quiz-actions';
import { QUIZ_ADVANCE_AFTER_ANSWER_MS, QUIZ_TYPEWRITER_MS_PER_CHAR } from '@/lib/quiz/constants';
import { stripChoiceLetterPrefix, stripQuestionNumberPrefix } from '@/lib/quiz/question-utils';
import {
  ensureHomeQuizAudio,
  resumeHomeQuizAudio,
  playHomeQuizCorrect,
  playHomeQuizQuestionReady,
  playHomeQuizResult,
  playHomeQuizSelect,
  playHomeQuizStart,
  playHomeQuizTypeTick,
  playHomeQuizWrong,
} from '@/lib/quiz/home-quiz-audio';
import {
  ensureQuizAudio,
  playQuizAnswerCorrect,
  playQuizAnswerWrong,
  playQuizResultHome,
  playRpgLineDone,
  playRpgTypeBlip,
} from '@/lib/quiz/rpg-audio';
import type { QuizQuestionPayload } from '@/lib/quiz/types';
import type { QuizDifficultyLevel } from '@/types/database.types';
import type {
  HomeQuizCopy,
  HomeQuizHeadingColors,
  HomeQuizResultBackground,
} from '@/lib/homepage-public';
import { cn } from '@/lib/utils';

const pressStart2p = Press_Start_2P({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-press-start-2p',
});

const DEFAULT_HOME_QUIZ_INTRO = '英語程度快測\n約 10 題｜完成後提供程度參考與學習建議';
const DEFAULT_HOME_QUIZ_INTRO_LANDING =
  '英語程度快測\n約 10 題｜依答題表現提供程度參考，方便家長了解子女學習起點';
const DEFAULT_HOME_QUIZ_CTA = '開始快測';
const DEFAULT_HOME_QUIZ_CTA_LANDING = '開始快測';

const DIFF_BADGE: Record<QuizDifficultyLevel, string> = {
  elementary: '初',
  junior: '中',
  college: '大',
  professor: '博',
};

const DIFF_COL: Record<QuizDifficultyLevel, string> = {
  elementary:
    'border-emerald-600/50 bg-emerald-500/15 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200',
  junior:
    'border-sky-600/50 bg-sky-500/15 text-sky-900 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-100',
  college:
    'border-violet-600/50 bg-violet-500/15 text-violet-900 dark:border-violet-500/40 dark:bg-violet-500/10 dark:text-violet-100',
  professor:
    'border-rose-600/50 bg-rose-500/15 text-rose-950 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-100',
};

/** 0～10 題答對數 → 程度參考評語（每分數多句，依 hash 固定挑一句） */
const HOME_QUIZ_RATING: Record<number, string[]> = {
  0: [
    '本次快測顯示多個範疇仍需加強，建議由基礎詞彙與簡短句型開始，配合初級課程循序建立信心。',
    '答對題數為 0／10，屬起步階段；可先安排每日短時間練習，並重溫題目解析中的重點。',
    '程度參考：基礎尚未穩固。建議家長與子女一同檢視錯題，再選擇合適年級的入門課程。',
    '整體表現顯示需系統性補底，平台初級章節與 AI 練習有助鞏固基本概念。',
  ],
  1: [
    '答對 1／10 題，屬起步階段；建議集中加強最常出錯的文法與詞彙範疇。',
    '程度參考偏低，可先由淺入深重溫題目解析，再安排固定練習時間。',
    '基礎仍需鞏固；建議選擇初級課程，並配合短題目反覆練習。',
    '本次表現顯示理解尚不穩定，宜放慢節奏，逐步建立答題信心。',
  ],
  2: [
    '答對 2／10 題，部分概念已有接觸，惟整體仍須加強；建議針對錯題範疇逐一複習。',
    '程度參考：基礎階段。可配合平台入門課程，由詞彙與基本句型開始跟進。',
    '表現顯示掌握仍不全面，建議每日短時間練習，並重溫本次錯題解析。',
    '尚有明顯弱項，宜先穩固基礎，再逐步提升閱讀與文法題的準確度。',
  ],
  3: [
    '答對 3／10 題，基礎有待加強；建議按錯題類型分項練習，並選擇合適年級課程。',
    '程度參考：入門至基礎之間。可透過系統化章節與 AI 練習，補足薄弱範疇。',
    '整體準確度仍偏低，宜先鞏固已接觸的知識點，再拓展至較深內容。',
    '表現顯示需持續跟進；建議家長留意子女最常錯誤的題型，作為下階段重點。',
  ],
  4: [
    '答對 4／10 題，基礎概念部分掌握；建議加強錯題重溫與固定練習節奏。',
    '程度參考：基礎階段。尚有提升空間，可配合中低年級課程循序加強。',
    '表現未達穩定水平，宜針對文法與詞彙弱項，安排每週規律複習。',
    '已具備部分基礎，惟準確度仍需提高；建議完成解析後再做同類型練習。',
  ],
  5: [
    '答對 5／10 題，處於基礎至進階過渡；建議平衡重溫錯題與新章節學習。',
    '程度參考：中等偏下。接近一半準確度，可透過系統化課程鞏固薄弱環節。',
    '表現顯示概念理解不均，宜先補足錯題範疇，再逐步提升難度。',
    '具備一定基礎，仍須加強答題穩定性；建議配合 AI 練習針對弱項。',
  ],
  6: [
    '答對 6／10 題，整體達基礎穩定水平；可繼續加強錯題範疇，並挑戰相應年級課程。',
    '程度參考：中等。表現尚可，建議維持規律練習以鞏固已掌握內容。',
    '準確度逾六成，基礎大致穩固；宜針對剩餘錯題類型作重點跟進。',
    '已具備一定應試基礎，可配合平台課程，在弱項上再作深化。',
  ],
  7: [
    '答對 7／10 題，表現良好；建議在鞏固強項的同時，針對錯題作精準複習。',
    '程度參考：中等偏上。理解大致穩定，可選擇相應年級課程持續進修。',
    '整體表現理想，仍有少數弱項；完成錯題重溫後可嘗試較進階練習。',
    '準確度達七成，具備良好基礎；建議保持練習頻率，提升答題一致性。',
  ],
  8: [
    '答對 8／10 題，表現優秀；可進一步挑戰較進階章節，並保持錯題檢討習慣。',
    '程度參考：良好。大部分範疇掌握穩定，宜在弱項上作最後鞏固。',
    '整體準確度高，接近進階水平；建議配合平台進階課程與 AI 練習延伸學習。',
    '表現突出，僅個別題型需留意；可持續深化閱讀與文法應用。',
  ],
  9: [
    '答對 9／10 題，表現非常優秀；建議在維持現有水平的同時，精煉剩餘弱項。',
    '程度參考：優良。接近滿分，可選擇進階課程挑戰更高難度內容。',
    '準確度極高，理解穩固；宜針對唯一錯題範疇作重點複習。',
    '整體表現接近頂尖，具備良好應試與理解能力；可持續拓展較深內容。',
  ],
  10: [
    '答對 10／10 題，表現卓越；建議挑戰進階課程，並透過 AI 練習保持語感與速度。',
    '程度參考：優秀。本次快測全對，顯示相關範疇掌握穩固，可進一步深化學習。',
    '滿分表現，理解全面；建議選擇相應進階章節，持續拓展閱讀與應用能力。',
    '全題答對，基礎與應用均達高水平；可配合平台課程作系統化延伸。',
  ],
};

const LEVEL_LABELS: Record<string, string> = {
  beginner: '初級',
  intermediate: '中級',
  advanced: '進階',
};

export type QuizHomeRecommendedCourse = {
  id: string;
  title: string;
  level: string;
  thumbnail_url: string | null;
  is_free: boolean;
  price: number;
};

export type QuizHomeProps = {
  /** cinematic = 全屏背景首頁；landing = 行銷頁內嵌測驗區 */
  layout?: 'cinematic' | 'landing';
  loggedIn: boolean;
  recommendedCourses: QuizHomeRecommendedCourse[];
  /** 首頁背景遮罩（0–1）；為 0 時卡片改用較透的毛玻璃，避免與「不遮罩」牴觸 */
  homeBackdropOverlayOpacity?: number | null;
  /** 首頁標題／標語自訂字色（後台）；null 則沿用 text-foreground */
  homeQuizHeadingColors?: HomeQuizHeadingColors | null;
  /** 首頁 intro 主標語與開始按鈕（後台）；null 欄位沿用內建預設 */
  homeQuizCopy?: HomeQuizCopy | null;
  /** 首頁 HomeQuiz 結果畫面背景圖（後台；null = 不套用） */
  homeQuizResultBackground?: HomeQuizResultBackground | null;
};

type Phase = 'intro' | 'loading' | 'play' | 'result';

export function QuizHome({
  layout = 'cinematic',
  loggedIn,
  recommendedCourses,
  homeBackdropOverlayOpacity,
  homeQuizHeadingColors,
  homeQuizCopy,
  homeQuizResultBackground,
}: QuizHomeProps) {
  const isLanding = layout === 'landing';
  const useProAudio = isLanding;
  const { resolvedTheme } = useTheme();
  const [themeMounted, setThemeMounted] = useState(false);
  const [phase, setPhase] = useState<Phase>('intro');
  const [questions, setQuestions] = useState<QuizQuestionPayload[]>([]);
  const [cursor, setCursor] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [animatedCorrectCount, setAnimatedCorrectCount] = useState(0);
  const [pickedIndex, setPickedIndex] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  /** RPG：題幹已打出來的字元（與 /quiz 一致） */
  const [typedQuestion, setTypedQuestion] = useState('');
  /** 與最後一字同步解鎖，避免「已顯示完」但 state 落後一幀導致誤判或閉包讀舊題 */
  const [optionsAnswerable, setOptionsAnswerable] = useState(false);
  const typeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  /** 本輪答對數（本題尚未入 state 前用 ref + 本題是否對來算結算） */
  const correctCountRef = useRef(0);
  const playPickContextRef = useRef<{
    pickedIndex: number | null;
    current: QuizQuestionPayload | null;
    optionsAnswerable: boolean;
    cursor: number;
    totalQ: number;
  }>({
    pickedIndex: null,
    current: null,
    optionsAnswerable: false,
    cursor: 0,
    totalQ: 0,
  });
  const { setBackdropMediaHidden } = useHomeBackdropPlayback();

  useEffect(() => {
    setThemeMounted(true);
  }, []);

  /** 落地頁測驗在白底卡片上；自訂字色僅用於全幅背景上的 cinematic 版面 */
  const customHeadingColor = useMemo(() => {
    if (isLanding) return undefined;
    if (
      !homeQuizHeadingColors ||
      (!homeQuizHeadingColors.light && !homeQuizHeadingColors.dark)
    ) {
      return undefined;
    }
    if (!themeMounted) return undefined;
    const dark = resolvedTheme === 'dark';
    const hex = dark
      ? (homeQuizHeadingColors.dark ?? homeQuizHeadingColors.light)
      : (homeQuizHeadingColors.light ?? homeQuizHeadingColors.dark);
    return hex ?? undefined;
  }, [homeQuizHeadingColors, resolvedTheme, themeMounted, isLanding]);

  const headingStyle = customHeadingColor ? { color: customHeadingColor } : undefined;

  const introDisplay = useMemo(() => {
    const t = homeQuizCopy?.introText?.trim();
    if (t) return t;
    return isLanding ? DEFAULT_HOME_QUIZ_INTRO_LANDING : DEFAULT_HOME_QUIZ_INTRO;
  }, [homeQuizCopy?.introText, isLanding]);

  const ctaDisplay = useMemo(() => {
    const t = homeQuizCopy?.ctaText?.trim();
    if (t) return t;
    return isLanding ? DEFAULT_HOME_QUIZ_CTA_LANDING : DEFAULT_HOME_QUIZ_CTA;
  }, [homeQuizCopy?.ctaText, isLanding]);

  const current = questions[cursor];
  const totalQ = questions.length;
  correctCountRef.current = correctCount;

  const isCorrect =
    pickedIndex !== null && current && pickedIndex === Number(current.correct_index);

  const aiTauntLine = useMemo(() => {
    if (pickedIndex === null || !current) return null;
    const key = `${current.id}-${cursor}-${isCorrect ? 'ok' : 'no'}`;
    const hash = Array.from(key).reduce((acc, ch) => (acc * 33 + ch.charCodeAt(0)) >>> 0, 5381);
    const fillTiny = (t: string) =>
      t.replaceAll('{n}', String(cursor + 1)).replaceAll('{total}', String(totalQ || '—'));

    const okLines = [
      '答對。請留意題幹關鍵字，下一題保持專注。',
      '正確。{n}／{total} 題，可繼續按相同思路作答。',
      '此題掌握良好，建議延續現有節奏完成餘下題目。',
      '答對。相關概念理解清楚，請繼續。',
      '正確。宜保持仔細閱讀題目與選項。',
      '此題無誤，表現穩定；下一題請先確認題意再選答。',
      '答對。可參考本題解題方式應用於後續題目。',
      '正確。請繼續留意文法與用詞細節。',
      '此題答對，理解到位。',
      '正確。尚有 {total} 題，建議逐題檢視題幹再作答。',
      '答對。請延續專注力完成測驗。',
      '此題正確，請參考解析鞏固相關知識點。',
    ];

    const noLines = [
      '此題答錯。請參考下方解析，留意正確答案的用法。',
      '答錯。建議重溫題幹與選項差異，再進入下一題。',
      '此題未答對。可先看解析，理解考點後再繼續（{n}／{total}）。',
      '答錯。請對照正確答案與解析，找出疏忽之處。',
      '此題需加強。解析已列出重點，建議先閱讀再作答下一題。',
      '答錯。常見原因包括未看清題意或混淆近義用詞。',
      '此題未掌握。請參考解析中的說明，釐清相關概念。',
      '答錯。不必氣餒，錯題正是本次快測的學習重點。',
      '此題答錯。建議標記錯誤類型，完成測驗後集中複習。',
      '答錯。請留意正確選項與您所選的差異。',
      '此題未答對。解析有助了解考點，請先閱讀。',
      '答錯。尚有題目未完成，請調整節奏繼續作答。',
    ];

    return isCorrect ? fillTiny(okLines[hash % okLines.length]!) : fillTiny(noLines[hash % noLines.length]!);
  }, [current, cursor, isCorrect, pickedIndex, totalQ]);

  playPickContextRef.current = {
    pickedIndex,
    current: current ?? null,
    optionsAnswerable,
    cursor,
    totalQ,
  };

  /** 題幹打字機：換題時重跑（節奏與 /quiz 相同） */
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

    const markReady = () => {
      if (useProAudio) {
        playHomeQuizQuestionReady();
      } else {
        playRpgLineDone();
      }
    };

    if (!full.length) {
      setOptionsAnswerable(true);
      markReady();
      return;
    }

    let i = 0;
    typeTimerRef.current = setInterval(() => {
      i += 1;
      const next = full.slice(0, i);
      setTypedQuestion(next);
      const ch = full[i - 1];
      if (ch && /\S/.test(ch)) {
        if (useProAudio) {
          if (i % 3 === 0) playHomeQuizTypeTick();
        } else {
          playRpgTypeBlip();
        }
      }

      if (i >= full.length) {
        if (typeTimerRef.current) {
          clearInterval(typeTimerRef.current);
          typeTimerRef.current = null;
        }
        setOptionsAnswerable(true);
        markReady();
      }
    }, QUIZ_TYPEWRITER_MS_PER_CHAR);

    return () => {
      if (typeTimerRef.current) {
        clearInterval(typeTimerRef.current);
        typeTimerRef.current = null;
      }
    };
  }, [phase, cursor, current?.id, useProAudio]);

  useEffect(() => {
    setBackdropMediaHidden(phase !== 'intro');
  }, [phase, setBackdropMediaHidden]);

  const startGame = useCallback(async () => {
    if (useProAudio) {
      const ctx = await resumeHomeQuizAudio();
      if (ctx?.state === 'running') playHomeQuizStart();
    } else {
      ensureQuizAudio();
    }
    setLoadError(null);
    setPhase('loading');
    const res = await fetchHomeQuizQuestions();
    if (!res.ok) {
      setLoadError(res.message);
      setPhase('intro');
      return;
    }
    setQuestions(res.questions);
    setCursor(0);
    setCorrectCount(0);
    setPickedIndex(null);
    setPhase('play');
  }, [useProAudio]);

  const handlePick = useCallback(async (idx: number) => {
    if (useProAudio) {
      const ctx = await resumeHomeQuizAudio();
      if (ctx?.state === 'running') playHomeQuizSelect();
    } else {
      ensureQuizAudio();
    }
    const ctx = playPickContextRef.current;
    if (ctx.pickedIndex !== null || !ctx.current || !ctx.optionsAnswerable) return;
    if (!Number.isInteger(idx) || idx < 0 || idx > 3) return;

    const snapCursor = ctx.cursor;
    const snapTotal = ctx.totalQ;
    const ok = idx === Number(ctx.current.correct_index);
    if (useProAudio) {
      if (ok) playHomeQuizCorrect();
      else playHomeQuizWrong();
    } else if (ok) {
      playQuizAnswerCorrect();
    } else {
      playQuizAnswerWrong();
    }
    setPickedIndex(idx);
    if (ok) {
      setCorrectCount((c) => c + 1);
    }

    window.setTimeout(() => {
      if (snapCursor >= snapTotal - 1) {
        const finalCorrect = correctCountRef.current + (ok ? 1 : 0);
        if (useProAudio) {
          playHomeQuizResult(finalCorrect, snapTotal);
        } else {
          playQuizResultHome(finalCorrect, snapTotal);
        }
        setPhase('result');
      } else {
        setCursor(snapCursor + 1);
        setPickedIndex(null);
      }
    }, QUIZ_ADVANCE_AFTER_ANSWER_MS);
  }, [useProAudio]);

  const ratingText = useMemo(() => {
    const pool = HOME_QUIZ_RATING[correctCount] ?? HOME_QUIZ_RATING[0];
    const seed = `${correctCount}-${questions[0]?.id ?? 'x'}-${questions[9]?.id ?? 'y'}`;
    const hash = Array.from(seed).reduce((acc, ch) => (acc * 33 + ch.charCodeAt(0)) >>> 0, 5381);
    return pool[hash % pool.length]!;
  }, [correctCount, questions]);
  const resultBgUrl = homeQuizResultBackground?.imageUrl?.trim() || null;

  useEffect(() => {
    if (phase !== 'result') {
      setAnimatedCorrectCount(0);
      return;
    }
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if (reduced) {
      setAnimatedCorrectCount(correctCount);
      return;
    }

    const to = correctCount;
    const from = 0;
    const start = performance.now();
    const dur = 650;

    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const ease = 1 - Math.pow(1 - t, 3);
      setAnimatedCorrectCount(Math.round(from + (to - from) * ease));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, correctCount]);

  const barelyAnyScrim =
    typeof homeBackdropOverlayOpacity === 'number' && homeBackdropOverlayOpacity < 0.05;

  return (
    <section
      className={cn(
        'relative flex w-full flex-col',
        !isLanding && 'min-h-[calc(100dvh-9rem)] min-h-[calc(100svh-9rem)]',
        !isLanding && pressStart2p.variable,
      )}
    >
      <Card
        className={cn(
          'relative flex flex-1 flex-col overflow-hidden shadow-md',
          isLanding
            ? 'border border-border/80 bg-card shadow-lg'
            : barelyAnyScrim
              ? 'border border-border/60 bg-background/70 backdrop-blur-sm supports-[backdrop-filter]:bg-background/65'
              : 'border border-border/80 bg-card/93 backdrop-blur-md supports-[backdrop-filter]:bg-card/90',
        )}
      >
        <div
          className={cn(
            'relative flex flex-1 flex-col px-4 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-12',
            phase === 'result'
              ? 'quiz-font-result-mixed'
              : isLanding
                ? 'quiz-font-site-default'
                : cn('quiz-font-pixel', pressStart2p.className),
          )}
        >
          {loadError && phase === 'intro' && (
            <p className="mb-4 text-center text-sm text-destructive">{loadError}</p>
          )}

          {phase === 'intro' && (
            <div className="flex flex-1 flex-col items-center justify-center gap-10 text-center sm:gap-12">
              <p
                style={isLanding ? undefined : headingStyle}
                className={cn(
                  'max-w-2xl whitespace-pre-wrap text-balance text-base leading-relaxed sm:text-lg md:text-xl',
                  isLanding
                    ? 'font-semibold text-foreground dark:text-foreground'
                    : cn(
                        'quiz-font-site-default',
                        !customHeadingColor && '!text-white',
                      ),
                )}
              >
                {introDisplay}
              </p>
              <Button
                size="lg"
                variant={isLanding ? 'default' : 'ghost'}
                onClick={() => void startGame()}
                className={cn(
                  isLanding
                    ? 'h-14 min-w-[260px] rounded-full bg-marketing-cta px-10 text-base font-semibold text-marketing-cta-foreground shadow-md hover:bg-marketing-cta/90'
                    : cn(
                        'relative h-14 min-w-[260px] rounded-full border-2 !border-white bg-white/10 px-10 text-base font-semibold !text-white',
                        'shadow-lg shadow-black/25 ring-2 ring-white/35 ring-offset-2 ring-offset-background',
                        'transition-all duration-200 ease-out',
                        'hover:scale-[1.04] hover:!border-white hover:!bg-white/20 hover:!text-white hover:shadow-xl hover:shadow-black/35',
                        'active:scale-[0.97] active:shadow-md',
                        'focus-visible:ring-white/60 focus-visible:!border-white',
                      ),
                )}
              >
                {ctaDisplay}
              </Button>
            </div>
          )}

          {phase === 'loading' && (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16">
              <Loader2 className="size-10 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">載入題目中…</p>
            </div>
          )}

          {phase === 'play' && current && (
            <>
              <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground sm:text-sm">
                  <span className="tabular-nums">
                    第 {cursor + 1} / {totalQ} 題
                  </span>
                </div>

                <div className="w-full rounded-xl border border-dashed border-muted-foreground/30 bg-muted/25 p-4 text-left">
                  <p className="min-h-[5rem] text-sm leading-relaxed text-foreground md:text-base dark:text-[#00ff7f] dark:[text-shadow:0_0_10px_rgba(0,255,127,0.7),0_0_26px_rgba(0,255,127,0.35)]">
                    {typedQuestion}
                    {!optionsAnswerable && (
                      <span className="ml-0.5 inline-block animate-pulse text-primary">▌</span>
                    )}
                  </p>
                </div>

                <div className="relative isolate">
                  <div
                    className="grid gap-3"
                    inert={pickedIndex !== null}
                    onClick={(e) => {
                      const el = (e.target as HTMLElement | null)?.closest?.(
                        '[data-option-index]',
                      ) as HTMLElement | null;
                      const raw = el?.dataset?.optionIndex;
                      const idx = raw === undefined ? NaN : Number.parseInt(raw, 10);
                      if (!Number.isInteger(idx) || idx < 0 || idx > 3) return;
                      handlePick(idx);
                    }}
                  >
                    {current.options.map((opt, i) => {
                      const answeredThis = pickedIndex !== null;
                      const isSel = pickedIndex === i;
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

                {pickedIndex !== null && (
                  <div
                    className={cn(
                      'quiz-font-site-default rounded-lg border p-4',
                      pickedIndex === Number(current.correct_index)
                        ? 'border-emerald-500/40 bg-emerald-500/10'
                        : 'border-destructive/40 bg-destructive/10',
                    )}
                  >
                    <div className="mb-2 flex items-center gap-2 font-medium">
                      {pickedIndex === Number(current.correct_index) ? (
                        <>
                          <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />
                          答對
                        </>
                      ) : (
                        <>
                          <XCircle className="size-5 text-destructive" />
                          答錯
                        </>
                      )}
                    </div>
                    {aiTauntLine && (
                      <p
                        className={cn(
                          'mb-2 text-sm font-medium',
                          pickedIndex === Number(current.correct_index)
                            ? 'text-emerald-800 dark:text-emerald-200'
                            : 'text-destructive',
                        )}
                      >
                        學習提示：{aiTauntLine}
                      </p>
                    )}
                    {pickedIndex !== Number(current.correct_index) && (
                      <p className="mb-2 text-sm font-medium text-foreground">
                        正確答案：{String.fromCharCode(65 + Number(current.correct_index))}.{' '}
                        {stripChoiceLetterPrefix(
                          current.options[Number(current.correct_index)] ?? '',
                        )}
                      </p>
                    )}
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {current.explanation}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          {phase === 'result' && (
            <div className="relative mx-auto flex w-full max-w-2xl flex-col gap-8 text-center">
              {resultBgUrl && (
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-xl"
                >
                  <div
                    className="absolute inset-0 bg-cover bg-center opacity-35"
                    style={{ backgroundImage: `url(${resultBgUrl})` }}
                  />
                  <div className="absolute inset-0 bg-background/55" />
                </div>
              )}
              <p className="text-sm font-medium text-muted-foreground">快測完成</p>

              <div className="rounded-xl border bg-muted/40 px-6 py-8">
                <p className="text-sm text-muted-foreground">答對題數</p>
                <p
                  className={cn(
                    'mt-2 text-4xl font-semibold tabular-nums tracking-tight text-foreground md:text-5xl',
                  )}
                >
                  {animatedCorrectCount}
                  <span className="text-2xl font-normal text-muted-foreground"> / 10</span>
                </p>
              </div>

              <p className="mx-auto max-w-lg text-sm leading-relaxed text-muted-foreground">
                {ratingText}
              </p>

              <div className="space-y-2 border-y border-border py-6">
                {!loggedIn ? (
                  <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
                    註冊帳號可保存本次快測紀錄，並依程度參考選擇線上課程與 AI 練習，方便持續跟進學習進度。
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    可瀏覽推薦課程按弱項加強，或再次進行快測以檢視進步。
                  </p>
                )}
              </div>

              {!loggedIn && (
                <div className="flex flex-col items-center gap-4 font-sans">
                  <RegisterFormCard
                    variant="embedded"
                    loginLinkPlacement="external"
                    fieldIdPrefix="home-quiz-register"
                    cardTitle="建立新帳號"
                    cardDescription="免費加入，記錄成績並探索課程"
                    className="mx-auto w-full"
                  />
                  <p className="text-center text-sm text-muted-foreground">
                    已經有帳號？
                    <Link
                      href="/login"
                      className="ml-1 font-semibold text-primary underline-offset-4 transition-colors hover:underline"
                    >
                      立即登入
                    </Link>
                  </p>
                </div>
              )}

              {loggedIn && (
                <div className="mt-4 border-t border-border pt-10 text-left">
                  <p className="mb-5 flex items-center gap-2 text-base font-semibold text-foreground">
                    <Sparkles className="size-5 text-primary" />
                    最新推薦課程
                  </p>

                  {recommendedCourses.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      暫無公開課程，先去逛逛課程目錄。
                    </p>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-3">
                      {recommendedCourses.map((c) => (
                        <Link key={c.id} href={`/courses/${c.id}`} className="group block">
                          <Card className="h-full overflow-hidden transition-shadow hover:shadow-md">
                            <div className="relative h-28 bg-muted">
                              {c.thumbnail_url ? (
                                <img
                                  src={c.thumbnail_url}
                                  alt=""
                                  className="absolute inset-0 size-full object-cover transition-opacity group-hover:opacity-95"
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                                  無縮圖
                                </div>
                              )}
                            </div>
                            <CardContent className="p-3">
                              <p className="line-clamp-2 text-sm font-medium leading-snug">
                                {c.title}
                              </p>
                              <p className="mt-2 text-xs text-muted-foreground">
                                {LEVEL_LABELS[c.level] ?? c.level}
                                {c.is_free ? ' · 免費' : ` · $${c.price}`}
                              </p>
                            </CardContent>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  )}

                  <div className="mt-8 flex justify-center">
                    <Button variant="secondary" size="default" asChild>
                      <Link href="/courses">更多課程</Link>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    </section>
  );
}
