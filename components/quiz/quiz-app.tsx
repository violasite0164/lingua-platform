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
  saveQuizEditorPersonality,
} from '@/lib/quiz/actions';
import {
  generateEditorRemark,
  pickHoldMessage,
  pickPlayTaunt,
  type EditorRemark,
} from '@/lib/quiz/editor-personality';
import {
  resolveQuizEditorPersonality,
  writeQuizEditorPersonalityToStorage,
} from '@/lib/quiz/editor-personality-preference';
import { EditorPersonalityPicker } from '@/components/quiz/editor-personality-picker';
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
import type {
  QuizDifficultyLevel,
  QuizEditorPersonality,
} from '@/types/database.types';

type Phase = 'pick_personality' | 'home' | 'loading' | 'play' | 'result';

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

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function difficultyTier(avgDifficulty: number): 'easy' | 'mid' | 'hard' | 'insane' {
  if (avgDifficulty < 1.6) return 'easy';
  if (avgDifficulty < 2.6) return 'mid';
  if (avgDifficulty < 3.6) return 'hard';
  return 'insane';
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

type QuizAppProps = {
  /** 英語小遊戲頁遊戲區內嵌：精簡標題區、填滿容器 */
  embedded?: boolean;
};

export function QuizApp({ embedded = false }: QuizAppProps) {
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
  const [editorPersonality, setEditorPersonality] =
    useState<QuizEditorPersonality | null>(null);
  const [personalityDraft, setPersonalityDraft] =
    useState<QuizEditorPersonality | null>(null);
  const [personalityReady, setPersonalityReady] = useState(false);
  const [savingPersonality, setSavingPersonality] = useState(false);
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
      const resolved = resolveQuizEditorPersonality(boot.quizEditorPersonality);
      setEditorPersonality(resolved);
      setPersonalityDraft(resolved);
      setPersonalityReady(true);
      if (!resolved) setPhase('pick_personality');
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
    if (!answeredThis || !editorPersonality) return null;
    return pickPlayTaunt({
      personality: editorPersonality,
      isCorrect: !!isCorrect,
      seedKey: `${current?.id ?? cursor}-${isCorrect ? 'ok' : 'no'}`,
      cursor,
      total: total || questions.length,
    });
  }, [
    answeredThis,
    editorPersonality,
    current?.id,
    cursor,
    isCorrect,
    total,
    questions.length,
  ]);

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

  const confirmPersonality = useCallback(async () => {
    if (!personalityDraft) return;
    setSavingPersonality(true);
    writeQuizEditorPersonalityToStorage(personalityDraft);
    const res = await saveQuizEditorPersonality(personalityDraft);
    setSavingPersonality(false);
    if (res.error) {
      alert(res.error);
      return;
    }
    setEditorPersonality(personalityDraft);
    setPhase('home');
  }, [personalityDraft]);

  const startGame = useCallback(async () => {
    if (!editorPersonality) {
      setPhase('pick_personality');
      return;
    }
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
  }, [difficulty, editorPersonality]);

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
    if (editorPersonality) {
      setEditorRemark(
        generateEditorRemark(editorPersonality, {
          score100: breakdown.score100,
          correct: correctTotal,
          total,
          avgDifficulty,
          avgDifficultyLabel,
          breakdown,
        }),
      );
    }
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
    if (!holdingFeedback || holdMs < 2000 || !editorPersonality) return null;
    const tier =
      holdMs >= 10000 ? 'bye' : holdMs >= 7000 ? 'broken' : holdMs >= 5000 ? 'cheat' : 'release';

    return pickHoldMessage({
      personality: editorPersonality,
      tier,
      seedKey: `${current?.id ?? cursor}-${tier}-${holdNonce}`,
    });
  }, [holdingFeedback, holdMs, editorPersonality, current?.id, cursor, holdNonce]);

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
    window.getSelection()?.removeAllRanges();
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

  /** 已作答後禁止瀏覽器拖選文字（長按解析時避免藍色 highlight） */
  useEffect(() => {
    if (phase !== 'play' || picked === null) return;

    const blockSelect = (e: Event) => {
      e.preventDefault();
      window.getSelection()?.removeAllRanges();
    };

    document.addEventListener('selectstart', blockSelect, { capture: true });
    return () => {
      document.removeEventListener('selectstart', blockSelect, { capture: true });
    };
  }, [phase, picked]);

  useEffect(() => {
    if (!holdingFeedback) return;

    const blockSelect = (e: Event) => {
      e.preventDefault();
      window.getSelection()?.removeAllRanges();
    };

    document.addEventListener('selectstart', blockSelect, { capture: true });
    const clearSel = () => window.getSelection()?.removeAllRanges();
    const selTimer = window.setInterval(clearSel, 80);

    return () => {
      document.removeEventListener('selectstart', blockSelect, { capture: true });
      window.clearInterval(selTimer);
    };
  }, [holdingFeedback]);

  useEffect(() => {
    // hold 住 >= 11 秒：強制消失並進下一題（10 秒先顯示 BYE！）
    if (!holdingFeedback || phase !== 'play' || picked === null) return;
    if (holdMs < 11000) return;

    // 先讓「BYE！」至少有機會 render 一幀（然後立刻強制跳題）
    setHoldTyped(
      editorPersonality === 'gentle' ? '好了，我們先往下一題。' : 'BYE！',
    );
    requestAnimationFrame(() => {
      stopHold({ advanceIfPossible: true });
    });
  }, [holdingFeedback, holdMs, phase, picked, stopHold, editorPersonality]);

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
    <div
      className={cn(
        embedded
          ? 'mx-auto h-full min-h-0 w-full max-w-none px-2 py-3 sm:px-3'
          : 'mx-auto max-w-2xl px-4 py-10 md:py-14',
      )}
    >
      {!embedded && (
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
      )}

      {phase === 'pick_personality' && personalityReady && (
        <Card className="quiz-font-site-default border-border/80 shadow-md">
          <CardHeader>
            <CardTitle>選擇 AI 小編風格</CardTitle>
            <CardDescription>
              首次進入請先選擇評語風格。之後可在個人資料頁隨時更改。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <EditorPersonalityPicker
              value={personalityDraft}
              onChange={setPersonalityDraft}
              disabled={savingPersonality}
            />
            <Button
              className="w-full"
              size="lg"
              disabled={!personalityDraft || savingPersonality}
              onClick={() => void confirmPersonality()}
            >
              {savingPersonality ? '儲存中…' : '確認並開始'}
            </Button>
          </CardContent>
        </Card>
      )}

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
            {editorPersonality && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm">
                <span className="text-muted-foreground">
                  AI小編風格：
                  <span className="ml-1 font-medium text-foreground">
                    {editorPersonality === 'gentle' ? '溫柔治癒' : '毒舌小編'}
                  </span>
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => {
                    setPersonalityDraft(editorPersonality);
                    setPhase('pick_personality');
                  }}
                >
                  更換風格
                </Button>
              </div>
            )}
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
            <Card
              className={cn(
                'overflow-hidden border-border/80 shadow-lg',
                answeredThis && 'quiz-play-answered',
              )}
            >
              <CardHeader className="space-y-4 pb-2 select-none">
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
              <CardContent
                className="relative select-none space-y-6"
                data-quiz-play-area
              >
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
                            'touch-manipulation select-none [-webkit-tap-highlight-color:transparent]',
                            'h-auto min-h-12 w-full justify-start gap-0 whitespace-normal px-4 py-3 text-left font-normal',
                            'active:opacity-100',
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
                    data-quiz-hold-feedback
                    className={cn(
                      'quiz-font-site-default rounded-lg border p-4 select-none touch-none',
                      '[-webkit-tap-highlight-color:transparent] [-webkit-touch-callout:none]',
                      'outline-none touch-manipulation',
                      'active:opacity-100',
                      isCorrect
                        ? 'border-emerald-500/40 bg-emerald-500/10 active:bg-emerald-500/10'
                        : 'border-destructive/40 bg-destructive/10 active:bg-destructive/10',
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
                    <p className="select-none text-muted-foreground text-sm leading-relaxed">
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
