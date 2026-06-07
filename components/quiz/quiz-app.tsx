'use client';

/**
 * 英語能力測試 — 須登入；登入後記錄最高分與 XP。
 * 首頁訪客測驗請見 `QuizHome`（`/`，非本頁）。
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  fetchRandomQuizQuestions,
  getQuizBootstrap,
} from '@/lib/quiz/actions';
import {
  recordQuizSessionWithTimeout,
  type RecordQuizSessionParams,
} from '@/lib/quiz/record-quiz-client';
import type { RecordQuizOutcome } from '@/lib/quiz/types';
import {
  generateEditorRemark,
  pickHoldMessage,
  pickPlayTaunt,
  type EditorRemark,
} from '@/lib/quiz/editor-personality';
import { resolveQuizEditorPersonality } from '@/lib/quiz/editor-personality-preference';
import {
  QuizStageAnnounce,
  type StageAnnounceKind,
} from '@/components/quiz/quiz-stage-announce';
import { QuizStageVideoOverlay } from '@/components/quiz/quiz-stage-video-overlay';
import { Stage2CloneJutsuGame } from '@/components/stage2/stage2-clone-jutsu-game';
import {
  Stage3DiscoSpellGame,
  type Stage3GameResult,
  type Stage3ResumeState,
} from '@/components/stage3/stage3-disco-spell-game';
import { PREWARM_PLACEHOLDER_QUESTION, ThemedQuizPlay } from '@/components/quiz/themed-quiz-play';
import { ThemedQuizResult } from '@/components/quiz/themed-quiz-result';
import {
  STAGE2_ASSETS,
  STAGE2_MAX_HEARTS,
  STAGE2_TOTAL_ROUNDS,
} from '@/lib/stage2/constants';
import { type Stage2SessionWord } from '@/lib/stage2/session-word';
import {
  STAGE3_ASSETS,
  STAGE3_ESTIMATED_PLAY_SECONDS,
  STAGE3_FEVER_STAT_MULTIPLIER,
  STAGE3_TOTAL_ROUNDS,
} from '@/lib/stage3/constants';
import { generateStage3EditorRemark } from '@/lib/stage3/stage3-editor-remark';
import {
  beginGamePlaySession,
  issueGameAdvanceGrant,
} from '@/lib/game/play-session-actions';
import { isStaminaInsufficientMessage } from '@/lib/game/stamina-insufficient';
import {
  canAffordStaminaCharge,
  staminaCostForCharge,
  staminaShopHintForCharge,
  type StaminaChargeKind,
} from '@/lib/game/stamina';
import { GameStaminaProvider, useOptionalGameStamina } from '@/lib/game/stamina-context';
import {
  clearPendingContinue,
  GAMES_CONTINUE_AFTER_STAMINA_EVENT,
  hasPendingContinue,
  loadPendingContinue,
  savePendingContinue,
} from '@/lib/game/pending-continue-storage';
import { generateStage2EditorRemark } from '@/lib/stage2/stage2-messages';
import {
  emptyQuizCinemaConfig,
  getQuizVideosForDifficulty,
  type QuizCinemaConfig,
} from '@/lib/quiz-game-config';
import {
  getNextQuizDifficultyLevel,
  isQuizRoundFullMark,
  isQuizRoundPassed,
  QUIZ_STAGE_PASS_MIN_SCORE100,
  QUIZ_ADVANCE_AFTER_ANSWER_MS,
  getQuizStageLabel,
  QUIZ_QUESTIONS_PER_ROUND,
} from '@/lib/quiz/constants';
import { stripQuestionNumberPrefix } from '@/lib/quiz/question-utils';
import { preloadQuizMascotAssets } from '@/lib/games/registry';
import { resolveQuizCharacterMood } from '@/lib/games/quiz-play-engine';
import {
  computeLiveQuizScore100,
  computeQuizScore100,
  resolveQuizCorrectCountForFinish,
  type QuizScoreBreakdown,
} from '@/lib/quiz/score-formula';
import {
  ensureQuizAudio,
  maintainQuizPlayAudio,
  recoverQuizAudio,
  resumeQuizAudio,
  playQuizAnswerCorrect,
  playQuizAnswerWrong,
  playQuizResultFull,
  playRpgLineDone,
  startQuizDefeatMusic,
  startQuizStage2BattleMusic,
  startQuizTensionMusic,
  startQuizVictoryMusic,
  startStage3DiscoBgm,
  stopQuizDefeatMusic,
  stopQuizStage2BattleMusic,
  stopQuizTensionMusic,
  stopQuizVictoryMusic,
  stopStage3DiscoBgm,
} from '@/lib/quiz/rpg-audio';
import type { QuizQuestionPayload } from '@/lib/quiz/types';
import type {
  QuizDifficultyLevel,
  QuizEditorPersonality,
} from '@/types/database.types';

type Phase =
  | 'loading'
  | 'intro-video'
  | 'stage-announce'
  | 'play'
  | 'complete-video'
  | 'result';

type Stage3Resume = Stage3ResumeState;

const DIFFICULTY_META: {
  id: QuizDifficultyLevel;
  label: string;
  short: string;
}[] = [
  { id: 'elementary', label: '初級 Elementary', short: '初級' },
  { id: 'junior', label: '中級 Junior', short: '中級' },
  { id: 'college', label: '大學 College', short: '大學' },
  { id: 'professor', label: '教授 Professor', short: '教授' },
];

const DIFFICULTY_WEIGHT: Record<QuizDifficultyLevel, number> = {
  elementary: 1,
  junior: 2,
  college: 3,
  professor: 4,
};

const DEFAULT_EDITOR_PERSONALITY: QuizEditorPersonality = 'gentle';

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function preloadImage(src: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = src;
  });
}

function difficultyTier(avgDifficulty: number): 'easy' | 'mid' | 'hard' | 'insane' {
  if (avgDifficulty < 1.6) return 'easy';
  if (avgDifficulty < 2.6) return 'mid';
  if (avgDifficulty < 3.6) return 'hard';
  return 'insane';
}


type QuizAppProps = {
  embedded?: boolean;
  /** 管理員直達關卡（例如 junior = Stage 2 分身術） */
  initialDifficulty?: QuizDifficultyLevel;
  /** 遞增時重新載入 initialDifficulty */
  stageJumpKey?: number;
};

function QuizAppCore({
  embedded = false,
  initialDifficulty,
  stageJumpKey = 0,
}: QuizAppProps) {
  const [phase, setPhase] = useState<Phase>('loading');
  const [difficulty, setDifficulty] = useState<QuizDifficultyLevel>('elementary');
  const [questions, setQuestions] = useState<QuizQuestionPayload[]>([]);
  const [cursor, setCursor] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correctTotal, setCorrectTotal] = useState(0);
  const [starsCorrect, setStarsCorrect] = useState<boolean[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [recordError, setRecordError] = useState<string | null>(null);
  const [resultStaminaNotice, setResultStaminaNotice] = useState<string | null>(null);
  const [staminaActionPending, setStaminaActionPending] = useState(false);
  const [recordOutcome, setRecordOutcome] = useState<RecordQuizOutcome | null>(null);
  const [syncingScore, setSyncingScore] = useState(false);
  const [editorPersonality, setEditorPersonality] = useState<QuizEditorPersonality>(
    DEFAULT_EDITOR_PERSONALITY,
  );
  const [editorRemark, setEditorRemark] = useState<EditorRemark | null>(null);
  const [resultBreakdown, setResultBreakdown] = useState<QuizScoreBreakdown | null>(null);
  const [animatedCorrectTotal, setAnimatedCorrectTotal] = useState(0);
  const [animatedScore100, setAnimatedScore100] = useState(0);
  const [optionsAnswerable, setOptionsAnswerable] = useState(false);
  const [bootReady, setBootReady] = useState(false);
  const [cinema, setCinema] = useState<QuizCinemaConfig>(emptyQuizCinemaConfig);
  const [stageAnnounceKind, setStageAnnounceKind] = useState<StageAnnounceKind>('start');
  /** 每次 loadRound / 開場提示時遞增，強制 QuizStageAnnounce 重掛（同 difficulty+kind 時仍能重播 onDone） */
  const [stageAnnounceSeq, setStageAnnounceSeq] = useState(0);
  const [stage2HeartsLeft, setStage2HeartsLeft] = useState(STAGE2_MAX_HEARTS);
  const [stage2UsedContinue, setStage2UsedContinue] = useState(false);
  const [stage2RunKey, setStage2RunKey] = useState(0);
  const [stage2ReviewWords, setStage2ReviewWords] = useState<Stage2SessionWord[]>([]);
  const [stage2ReviewOutcomes, setStage2ReviewOutcomes] = useState<boolean[]>([]);
  const [stage3RunKey, setStage3RunKey] = useState(0);
  const [stage3ReviewWords, setStage3ReviewWords] = useState<string[]>([]);
  const [stage3ReviewOutcomes, setStage3ReviewOutcomes] = useState<boolean[]>([]);
  const [stage3PassedFlag, setStage3PassedFlag] = useState(false);
  const [stage3Resume, setStage3Resume] = useState<Stage3Resume | null>(null);
  const [stage3UsedContinue, setStage3UsedContinue] = useState(false);

  const staminaCtx = useOptionalGameStamina();

  const [holdingFeedback, setHoldingFeedback] = useState(false);
  const [holdMs, setHoldMs] = useState(0);
  const [holdTyped, setHoldTyped] = useState('');
  const [holdNonce, setHoldNonce] = useState(0);
  const [liveScoreTick, setLiveScoreTick] = useState(0);
  const holdStartMsRef = useRef<number>(0);
  const holdTickRef = useRef<number | null>(null);
  const holdTypeRef = useRef<number | null>(null);
  const autoAdvanceRef = useRef<number | null>(null);
  const autoStartedRef = useRef(false);
  const pendingContinueRestoredRef = useRef(false);
  const handledStageJumpKeyRef = useRef(0);
  const loadRoundRef = useRef<
    (
      level: QuizDifficultyLevel,
      opts?: { skipIntroVideo?: boolean; staminaCharge?: StaminaChargeKind },
    ) => Promise<void>
  >(async () => {});
  const questionsReadyRef = useRef(false);
  const fetchQuestionsRef = useRef<Promise<boolean> | null>(null);
  const resultSoundPlayedRef = useRef(false);
  const playSessionIdRef = useRef<string | null>(null);
  const [playSessionId, setPlaySessionId] = useState<string | null>(null);

  const questionStartMsRef = useRef<number>(0);
  const questionAnswerSecondsRef = useRef<number[]>([]);
  const goNextOrFinishRef = useRef<() => Promise<void>>(async () => {});
  const pickQuizRef = useRef<{
    current: QuizQuestionPayload | null;
    picked: number | null;
    optionsAnswerable: boolean;
  }>({ current: null, picked: null, optionsAnswerable: false });

  const cinemaRef = useRef(cinema);
  cinemaRef.current = cinema;
  const difficultyRef = useRef(difficulty);
  difficultyRef.current = difficulty;
  const stageAnnounceKindRef = useRef(stageAnnounceKind);
  stageAnnounceKindRef.current = stageAnnounceKind;

  const fetchQuestionsForRound = useCallback(
    async (level: QuizDifficultyLevel): Promise<boolean> => {
      if (level === 'junior') {
        setQuestions([]);
        setCursor(0);
        setPicked(null);
        setCorrectTotal(0);
        setStarsCorrect(new Array(STAGE2_TOTAL_ROUNDS).fill(false));
        setOptionsAnswerable(false);
        questionsReadyRef.current = true;
        return true;
      }
      if (level === 'college') {
        setQuestions([]);
        setCursor(0);
        setPicked(null);
        setCorrectTotal(0);
        setStarsCorrect(new Array(STAGE3_TOTAL_ROUNDS).fill(false));
        setOptionsAnswerable(false);
        setStage3PassedFlag(false);
        questionsReadyRef.current = true;
        return true;
      }
      const sessionId = playSessionIdRef.current;
      if (!sessionId) {
        alert('遊戲局次憑證遺失，請返回重試。');
        return false;
      }
      const res = await fetchRandomQuizQuestions(sessionId, level);
      if (!res.ok) {
        alert(res.message);
        return false;
      }
      setQuestions(res.questions);
      setCursor(0);
      setPicked(null);
      setCorrectTotal(0);
      setStarsCorrect(new Array(res.questions.length).fill(false));
      setOptionsAnswerable(false);
      questionsReadyRef.current = true;
      return true;
    },
    [],
  );

  const waitForQuestionsReady = useCallback(async (): Promise<boolean> => {
    if (questionsReadyRef.current) return true;
    const pending = fetchQuestionsRef.current;
    if (!pending) return false;
    return pending;
  }, []);

  const persistRoundScore = useCallback(async (params: RecordQuizSessionParams) => {
    if (!userId) return;
    setSyncingScore(true);
    setRecordError(null);
    try {
      const outcome = await recordQuizSessionWithTimeout(params);
      if (!outcome.ok) {
        setRecordError(outcome.message);
        setRecordOutcome(null);
        return;
      }
      setRecordOutcome(outcome);
      setRecordError(null);
    } finally {
      setSyncingScore(false);
    }
  }, [userId]);

  const notifyStaminaRequired = useCallback(
    (chargeKind: StaminaChargeKind, serverMessage?: string) => {
      const cost = staminaCostForCharge(chargeKind);
      const hint =
        serverMessage ??
        staminaShopHintForCharge(chargeKind) ??
        (cost > 0 ? `體力不足（需要 ${cost} 點）` : '體力不足');
      setRecordError(hint);
      if (staminaCtx?.openStaminaShop) {
        void staminaCtx.refreshStamina();
        staminaCtx.openStaminaShop({
          hintMessage: hint,
          requiredAmount: cost > 0 ? cost : undefined,
        });
        return true;
      }
      window.alert(hint);
      return false;
    },
    [staminaCtx],
  );

  const ensureStaminaForCharge = useCallback(
    async (
      chargeKind: StaminaChargeKind,
      serverMessage?: string,
    ): Promise<boolean> => {
      const cost = staminaCostForCharge(chargeKind);
      if (cost <= 0) return true;

      if (!staminaCtx) {
        notifyStaminaRequired(chargeKind, serverMessage);
        return false;
      }

      let state = staminaCtx.stamina;
      if (staminaCtx.loading || state == null) {
        state = (await staminaCtx.refreshStamina()) ?? null;
      }

      if (canAffordStaminaCharge(state, chargeKind)) {
        return true;
      }

      notifyStaminaRequired(chargeKind, serverMessage);
      return false;
    },
    [staminaCtx, notifyStaminaRequired],
  );

  const startPlaySession = useCallback(
    async (
      level: QuizDifficultyLevel,
      chargeKind: StaminaChargeKind,
      advanceFrom?: QuizDifficultyLevel,
    ): Promise<boolean> => {
      if (!(await ensureStaminaForCharge(chargeKind))) {
        return false;
      }

      try {
        let res = await beginGamePlaySession(level, chargeKind);
        if (
          !res.ok &&
          chargeKind === 'none' &&
          advanceFrom &&
          /通關晉級憑證/.test(res.message)
        ) {
          await issueGameAdvanceGrant(level, advanceFrom);
          res = await beginGamePlaySession(level, chargeKind);
        }
        if (!res.ok) {
          if (isStaminaInsufficientMessage(res.message)) {
            await ensureStaminaForCharge(chargeKind, res.message);
            return false;
          }
          window.alert(res.message);
          return false;
        }
        playSessionIdRef.current = res.sessionId;
        setPlaySessionId(res.sessionId);
        void staminaCtx?.refreshStamina();
        return true;
      } catch {
        window.alert('無法開始遊戲，請稍後再試');
        return false;
      }
    },
    [staminaCtx, ensureStaminaForCharge],
  );

  const loadRound = useCallback(
    async (
      level: QuizDifficultyLevel,
      opts?: {
        skipIntroVideo?: boolean;
        staminaCharge?: StaminaChargeKind;
        advanceFrom?: QuizDifficultyLevel;
      },
    ) => {
      const charge = opts?.staminaCharge ?? 'start';
      if (charge !== 'continue') {
        clearPendingContinue();
      }
      const began = await startPlaySession(
        level,
        charge,
        charge === 'none' ? opts?.advanceFrom : undefined,
      );
      if (!began) return;

      setResultStaminaNotice(null);
      setStage2UsedContinue(false);
      setStage3Resume(null);
      if (charge !== 'continue') {
        setStage3UsedContinue(false);
      }
      if (level === 'college' && charge !== 'continue') {
        setStage3RunKey((k) => k + 1);
      }
      void preloadQuizMascotAssets();
      if (level === 'junior') {
        void Promise.all(Object.values(STAGE2_ASSETS).map((src) => preloadImage(src)));
        setStage2HeartsLeft(STAGE2_MAX_HEARTS);
        setStage2ReviewWords([]);
        setStage2ReviewOutcomes([]);
        setStage3ReviewWords([]);
        setStage3ReviewOutcomes([]);
      }
      if (level === 'college') {
        setStage2ReviewWords([]);
        setStage2ReviewOutcomes([]);
        setStage3ReviewWords([]);
        setStage3ReviewOutcomes([]);
      }
      ensureQuizAudio();
      setDifficulty(level);
      setSessionSeconds(0);
      setRecordOutcome(null);
      setSyncingScore(false);
      setRecordError(null);
      setEditorRemark(null);
      setResultBreakdown(null);
      setAnimatedCorrectTotal(0);
      setAnimatedScore100(0);
      setLiveScoreTick(0);
      questionAnswerSecondsRef.current = [];
      questionsReadyRef.current = false;
      setStageAnnounceKind('start');

      const startVideo = getQuizVideosForDifficulty(
        cinemaRef.current,
        level,
      ).startVideoUrl?.trim();

      const fetchPromise = fetchQuestionsForRound(level);
      fetchQuestionsRef.current = fetchPromise;

      if (startVideo && !opts?.skipIntroVideo) {
        setPhase('intro-video');
        return;
      }

      setStageAnnounceSeq((s) => s + 1);
      setPhase('stage-announce');
      await fetchPromise;
    },
    [fetchQuestionsForRound, startPlaySession],
  );

  loadRoundRef.current = loadRound;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const boot = await getQuizBootstrap();
        if (cancelled) return;
        setUserId(boot.userId);
        setIsAdmin(boot.isAdmin);
        const resolved =
          resolveQuizEditorPersonality(boot.quizEditorPersonality) ??
          DEFAULT_EDITOR_PERSONALITY;
        setEditorPersonality(resolved);
        setCinema(boot.cinema);
      } catch (error) {
        console.error('[QuizApp] bootstrap failed', error);
        if (cancelled) return;
        setRecordError('遊戲初始化失敗，請重整頁面再試。');
      } finally {
        if (!cancelled) {
          setBootReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!bootReady) return;
    void preloadQuizMascotAssets();
  }, [bootReady]);

  useEffect(() => {
    if (!bootReady || pendingContinueRestoredRef.current) return;
    const pending = loadPendingContinue();
    if (!pending) return;
    pendingContinueRestoredRef.current = true;
    autoStartedRef.current = true;
    if (pending.kind === 'stage2-restart') {
      setDifficulty('junior');
      setStageAnnounceKind('fail');
      setPhase('result');
      return;
    }
    setDifficulty('college');
    setStageAnnounceKind('fail');
    setPhase('result');
  }, [bootReady]);

  useEffect(() => {
    if (!bootReady || autoStartedRef.current) return;
    autoStartedRef.current = true;
    // 遊戲中心 / URL 直達關卡時由 stageJumpKey effect 載入，避免雙重 loadRound 重置 STAGE 提示
    if (initialDifficulty && stageJumpKey > 0) return;
    if (hasPendingContinue()) return;
    const level = initialDifficulty ?? 'elementary';
    void loadRoundRef.current(level, {
      skipIntroVideo: Boolean(initialDifficulty),
      staminaCharge: 'start',
    });
  }, [bootReady, initialDifficulty, stageJumpKey]);

  useEffect(() => {
    if (!bootReady || stageJumpKey < 1 || !initialDifficulty) return;
    if (hasPendingContinue()) return;
    if (staminaCtx?.loading) return;
    if (handledStageJumpKeyRef.current === stageJumpKey) return;
    handledStageJumpKeyRef.current = stageJumpKey;
    void loadRoundRef.current(initialDifficulty, {
      skipIntroVideo: true,
      staminaCharge: 'start',
    });
  }, [bootReady, stageJumpKey, initialDifficulty, staminaCtx?.loading]);

  const beginPlayPhase = useCallback(async () => {
    if (difficulty === 'junior' || difficulty === 'college') {
      setPhase('play');
      return;
    }
    const ready = await waitForQuestionsReady();
    if (!ready) return;
    setPhase('play');
  }, [difficulty, waitForQuestionsReady]);

  const finishStage2CloneGame = useCallback(
    async (
      passed: boolean,
      heartsLeft: number,
      correctCount: number,
      sessionWords: Stage2SessionWord[],
      roundOutcomes: boolean[],
    ) => {
      const correct = Math.min(STAGE2_TOTAL_ROUNDS, Math.max(0, correctCount));
      const totalAnswerSeconds = STAGE2_TOTAL_ROUNDS * 10;
      const score100 = passed
        ? Math.max(
            QUIZ_STAGE_PASS_MIN_SCORE100,
            Math.min(100, 82 + heartsLeft * 6),
          )
        : Math.max(0, Math.round((heartsLeft / STAGE2_MAX_HEARTS) * 70));
      const base = computeQuizScore100(correct, STAGE2_TOTAL_ROUNDS, totalAnswerSeconds);
      const breakdown: QuizScoreBreakdown = { ...base, score100 };
      setCorrectTotal(correct);
      setStarsCorrect(
        Array.from({ length: STAGE2_TOTAL_ROUNDS }, (_, i) => i < correct),
      );
      setResultBreakdown(breakdown);
      setStageAnnounceKind(passed ? 'clear' : 'fail');
      setStage2HeartsLeft(heartsLeft);
      setStage2ReviewWords(sessionWords);
      setStage2ReviewOutcomes(roundOutcomes);
      setEditorRemark(
        generateStage2EditorRemark(editorPersonality, {
          passed,
          heartsLeft,
          score100,
        }),
      );
      const completeVideo = getQuizVideosForDifficulty(
        cinemaRef.current,
        'junior',
      ).completeVideoUrl?.trim();
      if (passed && completeVideo) {
        setPhase('complete-video');
      } else {
        setStageAnnounceSeq((s) => s + 1);
        setPhase('stage-announce');
      }
      const sessionId = playSessionIdRef.current;
      if (!sessionId) {
        setRecordError('缺少遊戲局次憑證，無法儲存成績。');
        return;
      }
      if (userId) {
        await persistRoundScore({
          playSessionId: sessionId,
          difficulty: 'junior',
          correctCount: correct,
          totalQuestions: STAGE2_TOTAL_ROUNDS,
          totalAnswerSeconds,
          score100Override: score100,
          stageCleared: passed,
        });
      }
    },
    [editorPersonality, userId, persistRoundScore],
  );

  const finishStage3DiscoGame = useCallback(
    async (result: Stage3GameResult) => {
      const passed = result.passed;
      const score100 = result.score100;
      setStage3PassedFlag(passed);
      const correctRounds = result.roundScores.filter((s) => s > 0).length;
      const totalAnswerSeconds = STAGE3_ESTIMATED_PLAY_SECONDS;
      const { breakdown: stage3Breakdown, stats } = result;
      const breakdown: QuizScoreBreakdown = {
        score100,
        accuracyPoints: stage3Breakdown.comboPoints,
        speedPoints: stage3Breakdown.perfectPoints + stage3Breakdown.letterPoints,
        speedFactor: score100 / 100,
        avgSecondsPerQuestion: totalAnswerSeconds / STAGE3_TOTAL_ROUNDS,
        stage3: {
          comboPoints: stage3Breakdown.comboPoints,
          perfectPoints: stage3Breakdown.perfectPoints,
          letterPoints: stage3Breakdown.letterPoints,
          comboHits: stats.comboHits,
          perfectCount: stats.perfectCount,
          correctLetters: stats.correctLetters,
          maxCombo: stats.maxCombo,
          feverMultiplier: STAGE3_FEVER_STAT_MULTIPLIER,
        },
      };
      setCorrectTotal(correctRounds);
      setStarsCorrect(result.roundScores.map((s) => s > 0));
      setResultBreakdown(breakdown);
      const stage3Words = result.session.rounds.map((round) => round.word);
      setStage3ReviewWords(stage3Words);
      setStage3ReviewOutcomes(result.roundScores.map((score) => score > 0));
      const sessionId = playSessionIdRef.current;
      setStageAnnounceKind(passed ? 'clear' : 'fail');
      setEditorRemark(generateStage3EditorRemark(editorPersonality, result));
      /** 頒獎後先 STAGE CLEAR/FAIL 再進結算；不播 college 過關影片以免卡住黑畫面 */
      setStageAnnounceSeq((s) => s + 1);
      setPhase('stage-announce');
      if (!sessionId) {
        setRecordError('缺少遊戲局次憑證，無法儲存成績。');
        return;
      }
      if (userId) {
        await persistRoundScore({
          playSessionId: sessionId,
          difficulty: 'college',
          correctCount: correctRounds,
          totalQuestions: STAGE3_TOTAL_ROUNDS,
          totalAnswerSeconds,
          score100Override: score100,
          stageCleared: passed,
        });
      }
    },
    [editorPersonality, userId, persistRoundScore],
  );

  const beginStageAnnounce = useCallback(() => {
    setStageAnnounceKind('start');
    setStageAnnounceSeq((s) => s + 1);
    setPhase('stage-announce');
  }, []);

  const beginResultStageAnnounce = useCallback(() => {
    setStageAnnounceSeq((s) => s + 1);
    setPhase('stage-announce');
  }, []);

  const showResultPhase = useCallback(() => {
    setPhase('result');
  }, []);

  const handleStageAnnounceDone = useCallback(() => {
    if (stageAnnounceKindRef.current === 'start') {
      const level = difficultyRef.current;
      if (level === 'junior' || level === 'college') {
        setPhase('play');
        return;
      }
      void beginPlayPhase();
    } else {
      showResultPhase();
    }
  }, [beginPlayPhase, showResultPhase]);

  useEffect(() => {
    if (phase !== 'play') return;
    const id = window.setInterval(() => {
      setSessionSeconds((t) => t + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'play') {
      stopQuizTensionMusic(true);
      stopQuizStage2BattleMusic(true);
      stopStage3DiscoBgm();
      return;
    }
    const useStage2BattleBgm = difficulty === 'junior';
    const useStage3Disco = difficulty === 'college';
    let cancelled = false;
    const unlockAndStart = () => {
      void resumeQuizAudio().then((ctx) => {
        if (cancelled || !ctx) return;
        // 勿因 ctx 仍為 suspended 就略過；start*Music 會掛 statechange 並在解鎖後播放
        if (useStage2BattleBgm) {
          stopQuizTensionMusic(true);
          stopStage3DiscoBgm(true);
          void startQuizStage2BattleMusic();
        } else if (useStage3Disco) {
          stopQuizTensionMusic(true);
          stopQuizStage2BattleMusic(true);
          void startStage3DiscoBgm();
        } else {
          stopQuizStage2BattleMusic(true);
          stopStage3DiscoBgm(true);
          void startQuizTensionMusic();
        }
      });
    };
    const onPlayGesture = () => {
      unlockAndStart();
      void recoverQuizAudio();
    };
    unlockAndStart();
    const audioHealthId = window.setInterval(() => {
      if (!cancelled) maintainQuizPlayAudio();
    }, 2500);
    window.addEventListener('pointerdown', onPlayGesture, { capture: true });
    return () => {
      cancelled = true;
      window.clearInterval(audioHealthId);
      window.removeEventListener('pointerdown', onPlayGesture, { capture: true });
      stopQuizTensionMusic(true);
      stopQuizStage2BattleMusic(true);
      stopStage3DiscoBgm();
    };
  }, [phase, difficulty]);

  useEffect(() => {
    if (phase !== 'result') {
      stopQuizVictoryMusic(true);
      stopQuizDefeatMusic(true);
      resultSoundPlayedRef.current = false;
      return;
    }
    if (!resultBreakdown || resultSoundPlayedRef.current) return;
    resultSoundPlayedRef.current = true;
    void recoverQuizAudio();
    ensureQuizAudio();
    if (isQuizRoundFullMark(resultBreakdown.score100)) {
      playQuizResultFull(100);
    }
    if (isQuizRoundPassed(resultBreakdown.score100)) {
      stopQuizDefeatMusic(true);
      void startQuizVictoryMusic();
    } else {
      stopQuizVictoryMusic(true);
      void startQuizDefeatMusic();
    }
    return () => {
      stopQuizVictoryMusic(true);
      stopQuizDefeatMusic(true);
    };
  }, [phase, resultBreakdown]);

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
    const start = performance.now();
    const dur = 650;

    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const ease = 1 - Math.pow(1 - t, 3);
      setAnimatedCorrectTotal(Math.round(toCorrect * ease));
      setAnimatedScore100(Math.round(toScore * ease));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, correctTotal, resultBreakdown?.score100]);

  const current = questions[cursor];
  const total = questions.length;

  const liveScore100 = useMemo(() => {
    void liveScoreTick;
    return computeLiveQuizScore100(
      correctTotal,
      total,
      questionAnswerSecondsRef.current,
    );
  }, [correctTotal, total, liveScoreTick]);
  const answeredThis = picked !== null;
  const isCorrect =
    picked !== null && current && picked === Number(current.correct_index);

  const aiTauntLine = useMemo(() => {
    if (!answeredThis) return null;
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

  const handleQuestionTypingComplete = useCallback(() => {
    playRpgLineDone();
    questionStartMsRef.current = Date.now();
    setOptionsAnswerable(true);
  }, []);

  useEffect(() => {
    if (phase !== 'play' || !current) {
      setOptionsAnswerable(false);
      return;
    }
    setOptionsAnswerable(false);
  }, [phase, cursor, current]);

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

  const characterMood = useMemo(
    () =>
      resolveQuizCharacterMood({
        phase: phase === 'play' ? 'play' : 'loading',
        answeredThis,
        isCorrect: answeredThis ? !!isCorrect : null,
        optionsAnswerable,
      }),
    [phase, answeredThis, isCorrect, optionsAnswerable],
  );

  const onPickOption = useCallback((index: number) => {
    void recoverQuizAudio();
    const ctx = pickQuizRef.current;
    if (!ctx.current || ctx.picked !== null || !ctx.optionsAnswerable) return;
    if (!Number.isInteger(index) || index < 0 || index > 3) return;
    const rawSec = (Date.now() - questionStartMsRef.current) / 1000;
    const sec = clamp(rawSec, 0.25, 180);
    questionAnswerSecondsRef.current[cursor] = sec;
    setLiveScoreTick((n) => n + 1);
    const correct = index === Number(ctx.current.correct_index);
    setPicked(index);
    if (correct) playQuizAnswerCorrect();
    else playQuizAnswerWrong();
    if (correct) {
      setCorrectTotal((c) => c + 1);
      setStarsCorrect((prev) => {
        const next = prev.length ? [...prev] : [];
        next[cursor] = true;
        return next;
      });
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
    const finalCorrectCount = resolveQuizCorrectCountForFinish({
      starsCorrect,
      correctTotal,
      cursor,
      picked,
      correctIndex: Number(current.correct_index),
    });
    const breakdown = computeQuizScore100(finalCorrectCount, total, totalAnswerSeconds);
    setCorrectTotal(finalCorrectCount);
    ensureQuizAudio();
    setResultBreakdown(breakdown);
    const passed = isQuizRoundPassed(breakdown.score100);
    setStageAnnounceKind(passed ? 'clear' : 'fail');
    const completeVideo = getQuizVideosForDifficulty(
      cinemaRef.current,
      difficulty,
    ).completeVideoUrl?.trim();
    if (passed && completeVideo) {
      setPhase('complete-video');
    } else {
      setStageAnnounceSeq((s) => s + 1);
      setPhase('stage-announce');
    }
    setEditorRemark(
      generateEditorRemark(editorPersonality, {
        score100: breakdown.score100,
        correct: finalCorrectCount,
        total,
        avgDifficulty,
        avgDifficultyLabel,
        breakdown,
      }),
    );
    const sessionId = playSessionIdRef.current;
    if (!sessionId) {
      setRecordError('缺少遊戲局次憑證，無法儲存成績。');
      return;
    }
    if (userId) {
      await persistRoundScore({
        playSessionId: sessionId,
        difficulty,
        correctCount: finalCorrectCount,
        totalQuestions: total,
        totalAnswerSeconds,
        stageCleared: passed,
      });
    }
  };

  goNextOrFinishRef.current = goNextOrFinish;

  useEffect(() => {
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

    return pickHoldMessage({
      personality: editorPersonality,
      tier,
      seedKey: `${current?.id ?? cursor}-${tier}-${holdNonce}`,
    });
  }, [holdingFeedback, holdMs, editorPersonality, current?.id, cursor, holdNonce]);

  useEffect(() => {
    if (holdTypeRef.current) {
      clearInterval(holdTypeRef.current);
      holdTypeRef.current = null;
    }
    if (!holdMessageTarget) {
      setHoldTyped('');
      return;
    }
    let i = 0;
    holdTypeRef.current = window.setInterval(() => {
      i += 1;
      setHoldTyped(holdMessageTarget.slice(0, i));
      if (i >= holdMessageTarget.length && holdTypeRef.current) {
        clearInterval(holdTypeRef.current);
        holdTypeRef.current = null;
      }
    }, 24);
    return () => {
      if (holdTypeRef.current) {
        clearInterval(holdTypeRef.current);
        holdTypeRef.current = null;
      }
    };
  }, [holdMessageTarget]);

  const stopHold = useCallback(
    (opts?: { advanceIfPossible?: boolean }) => {
      if (holdTickRef.current) {
        clearInterval(holdTickRef.current);
        holdTickRef.current = null;
      }
      setHoldingFeedback(false);
      setHoldMs(0);
      if (opts?.advanceIfPossible && phase === 'play' && picked !== null) {
        void goNextOrFinishRef.current();
      }
    },
    [phase, picked],
  );

  const startHold = useCallback(() => {
    if (phase !== 'play' || picked === null) return;
    setHoldingFeedback(true);
    holdStartMsRef.current = Date.now();
    setHoldNonce((n) => n + 1);
    holdTickRef.current = window.setInterval(() => {
      setHoldMs(Date.now() - holdStartMsRef.current);
    }, 100);
  }, [phase, picked]);

  useEffect(() => {
    if (!holdingFeedback || phase !== 'play' || picked === null) return;
    if (holdMs < 10000) return;
    setHoldTyped(
      editorPersonality === 'gentle' ? '好了，我們先往下一題。' : 'BYE！',
    );
    requestAnimationFrame(() => {
      stopHold({ advanceIfPossible: true });
    });
  }, [holdingFeedback, holdMs, phase, picked, stopHold, editorPersonality]);

  const resultScore100 = resultBreakdown?.score100 ?? 0;
  const isStage2CloneMode = difficulty === 'junior';
  const isStage3DiscoMode = difficulty === 'college';
  const stagePassed = isStage3DiscoMode
    ? stage3PassedFlag
    : isQuizRoundPassed(resultScore100);
  const stageFullMark = isStage3DiscoMode
    ? resultScore100 >= 100 && !stage3UsedContinue
    : isStage2CloneMode
      ? isQuizRoundFullMark(resultScore100) && !stage2UsedContinue
      : isQuizRoundFullMark(resultScore100);
  const nextDifficultyLevel = stagePassed ? getNextQuizDifficultyLevel(difficulty) : null;

  const handleResultPrimary = useCallback(() => {
    if (syncingScore) return;
    if (difficulty === 'junior' && stagePassed) {
      void loadRound('college', { staminaCharge: 'none', advanceFrom: 'junior' });
      return;
    }
    if (nextDifficultyLevel && difficulty !== 'junior' && difficulty !== 'college') {
      void loadRound(nextDifficultyLevel, {
        staminaCharge: 'none',
        advanceFrom: difficulty,
      });
      return;
    }
    if (difficulty === 'college' && stagePassed && nextDifficultyLevel) {
      void loadRound(nextDifficultyLevel, {
        staminaCharge: 'none',
        advanceFrom: 'college',
      });
      return;
    }
    void loadRound(difficulty, {
      skipIntroVideo: true,
      staminaCharge: stagePassed ? 'start' : 'retry',
    });
  }, [nextDifficultyLevel, difficulty, loadRound, stagePassed, syncingScore]);

  const executeStage2Continue = useCallback(async () => {
    setStaminaActionPending(true);
    setResultStaminaNotice(null);
    try {
      clearPendingContinue();
      await loadRound('junior', { skipIntroVideo: true, staminaCharge: 'continue' });
      setStage2UsedContinue(true);
      setStage2RunKey((k) => k + 1);
    } finally {
      setStaminaActionPending(false);
    }
  }, [loadRound]);

  const executeStage3Continue = useCallback(async () => {
    setStaminaActionPending(true);
    setResultStaminaNotice(null);
    try {
      const began = await startPlaySession('college', 'continue');
      if (!began) return;
      clearPendingContinue();
      setStage3Resume(null);
      setStage3UsedContinue(true);
      setStage3RunKey((k) => k + 1);
      setStage3PassedFlag(false);
      setRecordOutcome(null);
      setRecordError(null);
      setEditorRemark(null);
      setResultBreakdown(null);
      setResultStaminaNotice(null);
      setStageAnnounceKind('start');
      setStageAnnounceSeq((s) => s + 1);
      setPhase('stage-announce');
      await fetchQuestionsForRound('college');
    } finally {
      setStaminaActionPending(false);
    }
  }, [startPlaySession, fetchQuestionsForRound]);

  const tryResumePendingContinue = useCallback(async () => {
    if (staminaActionPending) return;
    const pending = loadPendingContinue();
    if (!pending) return;
    if (!(await ensureStaminaForCharge('continue'))) return;

    if (pending.kind === 'stage2-restart') {
      setDifficulty('junior');
      setPhase('result');
      await executeStage2Continue();
      return;
    }

    setDifficulty('college');
    setPhase('result');
    await executeStage3Continue();
  }, [
    staminaActionPending,
    ensureStaminaForCharge,
    executeStage2Continue,
    executeStage3Continue,
  ]);

  useEffect(() => {
    const handler = () => {
      void tryResumePendingContinue();
    };
    window.addEventListener(GAMES_CONTINUE_AFTER_STAMINA_EVENT, handler);
    return () => window.removeEventListener(GAMES_CONTINUE_AFTER_STAMINA_EVENT, handler);
  }, [tryResumePendingContinue]);

  const handleStage2Continue = useCallback(async () => {
    savePendingContinue({ kind: 'stage2-restart' });
    await executeStage2Continue();
  }, [executeStage2Continue]);

  const handleStage3Continue = useCallback(async () => {
    savePendingContinue({ kind: 'stage3-restart' });
    await executeStage3Continue();
  }, [executeStage3Continue]);

  const handleStage2Retry = useCallback(async () => {
    setStaminaActionPending(true);
    setResultStaminaNotice(null);
    try {
      await loadRound('elementary', { skipIntroVideo: true, staminaCharge: 'retry' });
    } finally {
      setStaminaActionPending(false);
    }
  }, [loadRound]);

  const handleStage3Retry = useCallback(async () => {
    setStaminaActionPending(true);
    setResultStaminaNotice(null);
    try {
      await loadRound('elementary', { skipIntroVideo: true, staminaCharge: 'retry' });
    } finally {
      setStaminaActionPending(false);
    }
  }, [loadRound]);

  const levelVideos = getQuizVideosForDifficulty(cinema, difficulty);
  const startVideoUrl = levelVideos.startVideoUrl?.trim() || null;
  const completeVideoUrl = levelVideos.completeVideoUrl?.trim() || null;

  const playScenePrewarm =
    phase === 'intro-video' ||
    (phase === 'stage-announce' && stageAnnounceKind === 'start');

  const mountPlayScene =
    bootReady &&
    (playScenePrewarm ||
      (phase === 'play' && (isStage2CloneMode || isStage3DiscoMode || !!current)));

  useEffect(() => {
    if (phase !== 'intro-video') return;
    if (!startVideoUrl) beginStageAnnounce();
  }, [phase, startVideoUrl, beginStageAnnounce]);

  /** 過關影片缺失或無法結束時，仍進 STAGE 提示 → 結算 */
  useEffect(() => {
    if (phase !== 'complete-video') return;
    if (!completeVideoUrl) {
      beginResultStageAnnounce();
      return;
    }
    const failSafe = window.setTimeout(() => {
      beginResultStageAnnounce();
    }, 90_000);
    return () => window.clearTimeout(failSafe);
  }, [phase, completeVideoUrl, beginResultStageAnnounce]);

  return (
    <div
      className={cn(
        embedded
          ? 'relative flex min-h-0 w-full min-w-0 max-w-none flex-1 flex-col overflow-hidden px-0 py-0'
          : 'mx-auto max-w-2xl px-4 py-10 md:py-14',
      )}
    >
      {!embedded && (
        <div className="quiz-font-site-default mb-8 text-center">
          <div className="mb-3 flex flex-wrap items-center justify-center gap-2">
            <Badge variant="secondary">英語大冒險</Badge>
            {isAdmin ? (
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 border-violet-500/50 bg-violet-500/10 text-xs font-semibold text-violet-700 dark:text-violet-200"
                  onClick={() => void loadRound('junior', { skipIntroVideo: true })}
                >
                  Stage 2
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 border-fuchsia-500/50 bg-fuchsia-500/10 text-xs font-semibold text-fuchsia-700 dark:text-fuchsia-200"
                  onClick={() => void loadRound('college', { skipIntroVideo: true })}
                >
                  Stage 3
                </Button>
              </div>
            ) : null}
          </div>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            英語能力測試
          </h1>
          <p className="mt-2 text-muted-foreground text-sm md:text-base">
            從初級開始；總分 {QUIZ_STAGE_PASS_MIN_SCORE100} 分或以上過關並可挑戰下一關難度。
          </p>
        </div>
      )}

      {!bootReady && !embedded ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16">
            <div className="size-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-muted-foreground">載入中…</p>
          </CardContent>
        </Card>
      ) : null}
      {!bootReady && embedded ? (
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-3 rounded-xl border border-white/15 bg-black/20 px-5 py-4">
            <div className="size-8 animate-spin rounded-full border-2 border-white/50 border-t-transparent" />
            <p className="text-sm text-white/80">載入中…</p>
          </div>
        </div>
      ) : null}

      {bootReady && phase === 'intro-video' && startVideoUrl && (
        <QuizStageVideoOverlay
          videoUrl={startVideoUrl}
          embedded={embedded}
          onEnded={beginStageAnnounce}
        />
      )}

      {bootReady && phase === 'stage-announce' && (
        <div className={cn(embedded && 'flex min-h-0 flex-1 flex-col')}>
          <QuizStageAnnounce
            key={`${difficulty}-${stageAnnounceKind}-${stageAnnounceSeq}`}
            difficulty={difficulty}
            kind={stageAnnounceKind}
            fullMark={stageAnnounceKind === 'clear' && stageFullMark}
            embedded={embedded}
            onDone={handleStageAnnounceDone}
          />
        </div>
      )}

      {bootReady && phase === 'complete-video' && completeVideoUrl && (
        <QuizStageVideoOverlay
          videoUrl={completeVideoUrl}
          embedded={embedded}
          onEnded={beginResultStageAnnounce}
        />
      )}

      {mountPlayScene && isStage3DiscoMode && phase === 'play' && (
        <div className={cn(embedded && 'relative flex min-h-0 flex-1 flex-col')}>
          <Stage3DiscoSpellGame
            key={stage3RunKey}
            embedded={embedded}
            resume={stage3Resume ?? undefined}
            onStageClear={(result) => void finishStage3DiscoGame(result)}
            onGameOver={(result) => {
              void finishStage3DiscoGame(result);
            }}
          />
        </div>
      )}

      {mountPlayScene && isStage2CloneMode && phase === 'play' && (
        <Stage2CloneJutsuGame
          key={stage2RunKey}
          embedded={embedded}
          playSessionId={playSessionId}
          onStageClear={({ heartsLeft, correctCount, sessionWords, roundOutcomes }) =>
            void finishStage2CloneGame(
              true,
              heartsLeft,
              correctCount,
              sessionWords,
              roundOutcomes,
            )
          }
          onGameOver={({ correctCount, sessionWords, roundOutcomes }) => {
            void finishStage2CloneGame(
              false,
              0,
              correctCount,
              sessionWords,
              roundOutcomes,
            );
          }}
        />
      )}

      {mountPlayScene &&
        !((isStage2CloneMode || isStage3DiscoMode) && phase === 'play') &&
        (
        <div className={cn(embedded && 'relative flex min-h-0 flex-1')}>
        <ThemedQuizPlay
          prewarm={playScenePrewarm}
          embedded={embedded}
          current={current ?? PREWARM_PLACEHOLDER_QUESTION}
          cursor={cursor}
          total={total || QUIZ_QUESTIONS_PER_ROUND}
          questionText={
            current ? stripQuestionNumberPrefix(current.question_text) : ''
          }
          optionsAnswerable={optionsAnswerable}
          onQuestionTypingComplete={handleQuestionTypingComplete}
          picked={picked}
          answeredThis={answeredThis}
          isCorrect={!!isCorrect}
          starsCorrect={starsCorrect}
          score100={liveScore100}
          difficulty={difficulty}
          characterMood={characterMood}
          aiTauntLine={aiTauntLine}
          holdMessageTarget={holdMessageTarget}
          holdTyped={holdTyped}
          onPickOption={onPickOption}
          onHoldPointerDown={(e) => {
            if (e.pointerType === 'touch') e.preventDefault();
            (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
            startHold();
          }}
          onHoldPointerUp={() => stopHold({ advanceIfPossible: true })}
          onHoldPointerCancel={() => stopHold({ advanceIfPossible: true })}
          onHoldTouchStart={(e) => {
            e.preventDefault();
            startHold();
          }}
          onHoldTouchEnd={(e) => {
            e.preventDefault();
            stopHold({ advanceIfPossible: true });
          }}
          onHoldTouchCancel={(e) => {
            e.preventDefault();
            stopHold({ advanceIfPossible: true });
          }}
        />
        </div>
      )}

      {bootReady && phase === 'result' && (
        <ThemedQuizResult
          embedded={embedded}
          stagePassed={stagePassed}
          fullMark={stageFullMark}
          stageLabel={getQuizStageLabel(difficulty)}
          total={
            isStage2CloneMode
              ? STAGE2_TOTAL_ROUNDS
              : isStage3DiscoMode
                ? STAGE3_TOTAL_ROUNDS
                : total
          }
          starsCorrect={starsCorrect}
          animatedCorrectTotal={animatedCorrectTotal}
          animatedScore100={animatedScore100}
          resultBreakdown={resultBreakdown}
          avgDifficultyLabel={avgDifficultyLabel}
          editorRemark={editorRemark}
          isAdmin={isAdmin}
          userId={userId}
          syncingScore={syncingScore}
          recordOutcome={recordOutcome}
          recordError={recordError}
          playAgainLabel={
            isStage2CloneMode
              ? stagePassed
                ? nextDifficultyLevel
                  ? '下一關'
                  : '再玩 STAGE 2'
                : '再玩一次'
              : isStage3DiscoMode
                ? stagePassed
                  ? nextDifficultyLevel
                    ? '下一關'
                    : '再玩 STAGE 3'
                  : '重玩一次'
                : nextDifficultyLevel
                  ? '下一關'
                  : '再玩一局'
          }
          playAgainMode={
            stagePassed && nextDifficultyLevel ? 'next' : 'replay'
          }
          variant={
            isStage2CloneMode ? 'stage2-clone' : isStage3DiscoMode ? 'stage3-disco' : 'quiz'
          }
          stage2HeartsLeft={stage2HeartsLeft}
          stage2ReviewWords={stage2ReviewWords}
          stage2ReviewOutcomes={stage2ReviewOutcomes}
          stage3ReviewWords={stage3ReviewWords}
          stage3ReviewOutcomes={stage3ReviewOutcomes}
          staminaNotice={resultStaminaNotice}
          staminaActionPending={staminaActionPending}
          stageFailOptions={
            isStage2CloneMode && !stagePassed
              ? {
                  onContinue: () => void handleStage2Continue(),
                  onRetry: handleStage2Retry,
                }
              : isStage3DiscoMode && !stagePassed
                ? {
                    onContinue: () => void handleStage3Continue(),
                    onRetry: handleStage3Retry,
                  }
                : undefined
          }
          onPlayAgain={handleResultPrimary}
        />
      )}
    </div>
  );
}

export function QuizApp(props: QuizAppProps) {
  const staminaCtx = useOptionalGameStamina();
  if (staminaCtx) return <QuizAppCore {...props} />;
  return (
    <GameStaminaProvider>
      <QuizAppCore {...props} />
    </GameStaminaProvider>
  );
}
