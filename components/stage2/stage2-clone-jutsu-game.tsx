'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { Fredoka } from 'next/font/google';
import NextImage from 'next/image';

import '@/app/quiz-play-themes.css';
import '@/app/stage2-clone-jutsu.css';

import { Stage2NinjaRive } from '@/components/stage2/stage2-ninja-rive';
import { Stage2BlueGirlRive, Stage2RedBoyRive } from '@/components/stage2/stage2-hero-rive';
import { Stage2SceneBackdrop } from '@/components/stage2/stage2-scene-backdrop';
import { preloadRiveAsset } from '@/lib/games/asset-loader';
import {
  pickCloneTauntLine,
  pickJutsuCastLine,
  pickTauntSpeakerIndices,
  pickRandomTauntBatchSize,
  rollTauntWaveIsTruthful,
} from '@/lib/stage2/chuunibyou-lines';
import { buildCloneOptionsForRound, type CloneOption } from '@/lib/stage2/clone-round';
import {
  animateCloneOrderShuffle,
  pickRandomCloneShuffleStyle,
  type CloneShuffleStyle,
  releaseCloneShuffleMotion,
  shuffledCloneIds,
} from '@/lib/stage2/clone-shuffle';
import {
  STAGE2_ASSETS,
  STAGE2_NINJA_RIVE,
  STAGE2_RED_BOY_RIVE,
  STAGE2_BLUE_GIRL_RIVE,
  STAGE2_BEAT_MS,
  STAGE2_CLONE_COUNTS,
  STAGE2_CLONE_SHUFFLE_DELAY_BEATS,
  STAGE2_BOSS_CALLOUT_BEATS,
  STAGE2_JUTSU_INTRO_BEATS,
  stage2BossCalloutLineOncePerGame,
  stage2CloneShuffleMotion,
  stage2RoundPowerFxWaitsForBossCallout,
  stage2RoundShowsPowerFx,
  stage2ShuffleCountForRound,
  stage2ShuffleIntensityForRound,
  type Stage2ShuffleIntensity,
  STAGE2_FEEDBACK_MS,
  STAGE2_MISS_FEEDBACK_MS,
  STAGE2_MISS_HOLD_EXTEND_MS,
  STAGE2_MISS_LONG_PRESS_MS,
  STAGE2_MAX_HEARTS,
  STAGE2_ROUND_TIME_SECONDS,
  stage2RoundTimeSeconds,
  STAGE2_SHURIKEN_FLY_MS,
  STAGE2_SHURIKEN_HIT_MS,
  STAGE2_TAUNT_STAGGER_MS,
  STAGE2_TAUNT_TRUTH_CHANCE,
  STAGE2_TAUNT_WAVE_MAX_MS,
  STAGE2_TAUNT_WAVE_MIN_MS,
  STAGE2_HEROINE_HINT_CHANCE,
  STAGE2_HEROINE_HINT_TIME_BONUS_SECONDS,
  STAGE2_TOTAL_ROUNDS,
  type Stage2BossCalloutUsed,
  STAGE2_BOSS_CALLOUT_USED_INITIAL,
} from '@/lib/stage2/constants';
import { fetchStage2SessionWords } from '@/lib/stage2/actions';
import {
  formatStage2CorrectExplanation,
  formatHeroineVocabHint,
  type HeroineVocabHint,
  type Stage2SessionWord,
} from '@/lib/stage2/session-word';
import {
  ensureQuizAudio,
  recoverQuizAudio,
  playStage2ClonesSpawn,
  playStage2RoundCountdownExpire,
  playStage2RoundCountdownTick,
  playStage2ShurikenHit,
  playQuizAnswerCorrect,
  playQuizAnswerWrong,
  playStageClear,
  playStageFail,
  runStage2QuarterBeatLoop,
  scheduleStage2Beats,
  startStage2LowHealthAmbience,
  stopStage2LowHealthAmbience,
} from '@/lib/quiz/rpg-audio';
import { cn } from '@/lib/utils';

const fredoka = Fredoka({
  subsets: ['latin'],
  weight: ['600', '700'],
  display: 'swap',
});

const STAGE2_CANVAS_BASE_WIDTH = 1280;
const STAGE2_CANVAS_BASE_HEIGHT = 720;

export type Stage2ResumeState = {
  roundIndex: number;
  correctCount: number;
  sessionWords: Stage2SessionWord[];
  bossCalloutUsed: Stage2BossCalloutUsed;
};

type Props = {
  embedded?: boolean;
  /** 本局伺服器局次 token（開局扣體力後取得） */
  playSessionId?: string | null;
  resume?: Stage2ResumeState;
  onStageClear: (summary: {
    heartsLeft: number;
    roundsCleared: number;
    correctCount: number;
    sessionWords: Stage2SessionWord[];
    roundOutcomes: boolean[];
  }) => void;
  onGameOver: (summary: {
    correctCount: number;
    roundIndex: number;
    sessionWords: Stage2SessionWord[];
    bossCalloutUsed: Stage2BossCalloutUsed;
    roundOutcomes: boolean[];
  }) => void;
};

type GamePhase = 'loading' | 'jutsu-intro' | 'playing' | 'resolving';

type JutsuCasterPhase = 'idle' | 'casting' | 'fading' | 'hidden';

type RoundFeedback = 'bingo' | 'miss';

type ShurikenFx = {
  id: number;
  targetId: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
};

function cloneWordLengthClass(label: string): string | undefined {
  if (label.length >= 13) return 'stage2-clone-word--very-long';
  if (label.length >= 9) return 'stage2-clone-word--long';
  return undefined;
}

function preloadImage(src: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = src;
  });
}

export function Stage2CloneJutsuGame({
  embedded = false,
  playSessionId = null,
  resume,
  onStageClear,
  onGameOver,
}: Props) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const arenaRef = useRef<HTMLDivElement>(null);
  const heroesRef = useRef<HTMLDivElement>(null);
  const cloneFieldRef = useRef<HTMLDivElement>(null);
  const [canvasScale, setCanvasScale] = useState(1);

  const [loadError, setLoadError] = useState<string | null>(null);
  const [sessionWords, setSessionWords] = useState<Stage2SessionWord[]>([]);
  const [feedbackExplanation, setFeedbackExplanation] = useState<string | null>(null);
  const [missExplanationExtended, setMissExplanationExtended] = useState(false);
  const [phase, setPhase] = useState<GamePhase>('loading');
  const [roundIndex, setRoundIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [hearts, setHearts] = useState(STAGE2_MAX_HEARTS);
  const [clones, setClones] = useState<CloneOption[]>([]);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<RoundFeedback | null>(null);
  const [shurikens, setShurikens] = useState<ShurikenFx[]>([]);
  const [hitCloneId, setHitCloneId] = useState<string | null>(null);
  const [missCloneId, setMissCloneId] = useState<string | null>(null);
  const [hideWrongClones, setHideWrongClones] = useState(false);
  const [spawnKey, setSpawnKey] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(STAGE2_ROUND_TIME_SECONDS);
  const [cloneTaunts, setCloneTaunts] = useState<Record<string, string>>({});
  const [tauntTicks, setTauntTicks] = useState<Record<string, number>>({});
  const [shuffleLocked, setShuffleLocked] = useState(false);
  const [isShuffling, setIsShuffling] = useState(false);
  const [jutsuCastLine, setJutsuCastLine] = useState('');
  const [jutsuCastTick, setJutsuCastTick] = useState(0);
  const [jutsuCasterPhase, setJutsuCasterPhase] = useState<JutsuCasterPhase>('hidden');
  const [bossShuffleLine, setBossShuffleLine] = useState('');
  const [bossShuffleTick, setBossShuffleTick] = useState(0);
  const [shuffleIntensity, setShuffleIntensity] =
    useState<Stage2ShuffleIntensity>('normal');
  const [heroineHint, setHeroineHint] = useState<HeroineVocabHint | null>(null);
  const [spawnedVisible, setSpawnedVisible] = useState(0);
  const [beatPulse, setBeatPulse] = useState(0);
  const [roundPowerFxUnlocked, setRoundPowerFxUnlocked] = useState(false);
  const [shufflePulseTick, setShufflePulseTick] = useState(0);
  const [redBoyThrowTick, setRedBoyThrowTick] = useState(0);

  const shurikenFxTimersRef = useRef<number[]>([]);
  const shurikenIdRef = useRef(0);
  const heartsRef = useRef(hearts);
  const phaseRef = useRef(phase);
  const busyRef = useRef(busy);
  const roundIndexRef = useRef(roundIndex);
  const sessionWordsRef = useRef(sessionWords);
  const correctCountRef = useRef(correctCount);
  const wasPlayingActiveRef = useRef(false);
  const countdownTickPlayedRef = useRef<number | null>(null);
  const timeUpHandledRef = useRef(false);
  const jutsuBeatCancelRef = useRef<(() => void) | null>(null);
  const playingBeatCancelRef = useRef<(() => void) | null>(null);
  const beatFlowRef = useRef<
    'boss-callout' | 'post-boss-cast' | 'spawn' | 'pre-shuffle' | 'shuffle-seq' | 'ambient'
  >('spawn');
  const jutsuCasterPhaseRef = useRef<JutsuCasterPhase>('hidden');
  const bossCalloutBeatsLeftRef = useRef(0);
  const spawnBeatDoneRef = useRef(false);
  const targetCloneCountRef = useRef(3);
  const preShuffleBeatsLeftRef = useRef(STAGE2_CLONE_SHUFFLE_DELAY_BEATS);
  const shufflesLeftRef = useRef(0);
  const shuffleBusyRef = useRef(false);
  const shuffleIntensityRef = useRef<Stage2ShuffleIntensity>('normal');
  const shuffleRunIdRef = useRef(0);
  const lastShuffleStyleRef = useRef<CloneShuffleStyle | undefined>(undefined);
  const [activeShuffleStyle, setActiveShuffleStyle] = useState<CloneShuffleStyle>('glide');
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackDeadlineAtRef = useRef(0);
  const missLongPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const missLongPressFiredRef = useRef(false);
  const missExplanationExtendUsedRef = useRef(false);
  const feedbackWasCorrectRef = useRef(false);
  const roundOutcomesRef = useRef<boolean[]>([]);
  const feedbackRef = useRef<RoundFeedback | null>(null);
  const feedbackExplanationRef = useRef<string | null>(null);
  const tauntWaveTimeoutRef = useRef<number | null>(null);
  const tauntStaggerTimeoutsRef = useRef<number[]>([]);
  const clonesRef = useRef(clones);
  const lastJutsuCastLineRef = useRef('');
  const heroineHintUsedRef = useRef(false);
  const heroineHintRoundKeyRef = useRef<string | null>(null);
  const bossShuffleLine5UsedRef = useRef(false);
  const bossShuffleLine7UsedRef = useRef(false);
  const missCloneIdRef = useRef<string | null>(null);
  clonesRef.current = clones;
  jutsuCasterPhaseRef.current = jutsuCasterPhase;

  heartsRef.current = hearts;
  phaseRef.current = phase;
  busyRef.current = busy;
  roundIndexRef.current = roundIndex;
  sessionWordsRef.current = sessionWords;
  correctCountRef.current = correctCount;

  const cloneCount = STAGE2_CLONE_COUNTS[roundIndex] ?? 3;
  const currentWordEntry = sessionWords[roundIndex];
  const currentWord = currentWordEntry?.word ?? '';

  useLayoutEffect(() => {
    if (!embedded) return;
    const viewport = viewportRef.current;
    if (!viewport) return;

    const updateScale = () => {
      const h = viewport.clientHeight;
      if (h <= 0) return;
      const next = h / STAGE2_CANVAS_BASE_HEIGHT;
      const clamped = Math.max(0.2, Math.min(next, 3));
      setCanvasScale((prev) => (Math.abs(prev - clamped) < 0.0001 ? prev : clamped));
    };

    updateScale();
    const ro = new ResizeObserver(updateScale);
    ro.observe(viewport);
    window.addEventListener('resize', updateScale);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateScale);
    };
  }, [embedded]);

  const clearHeroineHint = useCallback(() => {
    setHeroineHint(null);
  }, []);

  /** 本局最多一次；成功時回傳 true（不含倒數加秒，由回合計時 effect 一併處理） */
  const tryOfferHeroineHint = useCallback((entry: Stage2SessionWord | undefined): boolean => {
    if (!entry || entry.vocabGrade !== 'junior') return false;
    if (heroineHintUsedRef.current) return false;
    if (Math.random() >= STAGE2_HEROINE_HINT_CHANCE) return false;
    heroineHintUsedRef.current = true;
    setHeroineHint(formatHeroineVocabHint(entry));
    return true;
  }, []);

  const clearTauntWaveTimers = useCallback(() => {
    if (tauntWaveTimeoutRef.current) {
      clearTimeout(tauntWaveTimeoutRef.current);
      tauntWaveTimeoutRef.current = null;
    }
    tauntStaggerTimeoutsRef.current.forEach((t) => clearTimeout(t));
    tauntStaggerTimeoutsRef.current = [];
  }, []);

  const fireTauntWave = useCallback(() => {
    const list = clonesRef.current;
    if (list.length === 0) return;

    const correctIndex = list.findIndex((c) => c.isCorrect);
    if (correctIndex < 0) return;

    const truthful = rollTauntWaveIsTruthful(STAGE2_TAUNT_TRUTH_CHANCE);
    const batchSize = pickRandomTauntBatchSize(list.length);
    const indices = pickTauntSpeakerIndices(
      list.length,
      batchSize,
      correctIndex,
      truthful,
    );

    setCloneTaunts({});

    indices.forEach((cloneIdx, order) => {
      const clone = list[cloneIdx]!;
      const timeout = window.setTimeout(() => {
        setCloneTaunts((prev) => ({
          ...prev,
          [clone.id]: pickCloneTauntLine({
            speakerIndex: cloneIdx,
            correctIndex,
            totalClones: list.length,
            truthful,
            exclude: prev[clone.id],
          }),
        }));
        setTauntTicks((prev) => ({
          ...prev,
          [clone.id]: (prev[clone.id] ?? 0) + 1,
        }));
      }, order * STAGE2_TAUNT_STAGGER_MS);
      tauntStaggerTimeoutsRef.current.push(timeout);
    });
  }, []);

  const scheduleNextTauntWave = useCallback(() => {
    const delay =
      STAGE2_TAUNT_WAVE_MIN_MS +
      Math.random() * (STAGE2_TAUNT_WAVE_MAX_MS - STAGE2_TAUNT_WAVE_MIN_MS);
    tauntWaveTimeoutRef.current = window.setTimeout(() => {
      tauntStaggerTimeoutsRef.current.forEach((t) => clearTimeout(t));
      tauntStaggerTimeoutsRef.current = [];
      fireTauntWave();
      scheduleNextTauntWave();
    }, delay);
  }, [fireTauntWave]);

  useEffect(() => {
    const list = clonesRef.current;
    if (list.length === 0) return;

    const taunting =
      (phase === 'playing' || (phase === 'resolving' && feedback === null)) &&
      !busy &&
      !shuffleLocked;

    clearTauntWaveTimers();
    setCloneTaunts({});
    setTauntTicks(Object.fromEntries(list.map((c) => [c.id, 0])));

    if (!taunting) return;

    const firstWaveDelay = 80 + Math.random() * 280;
    const firstTimeout = window.setTimeout(() => {
      fireTauntWave();
      scheduleNextTauntWave();
    }, firstWaveDelay);

    return () => {
      clearTimeout(firstTimeout);
      clearTauntWaveTimers();
    };
  }, [
    clones.length,
    spawnKey,
    roundIndex,
    phase,
    busy,
    feedback,
    shuffleLocked,
    fireTauntWave,
    scheduleNextTauntWave,
    clearTauntWaveTimers,
  ]);

  const cancelJutsuBeatFlow = useCallback(() => {
    jutsuBeatCancelRef.current?.();
    jutsuBeatCancelRef.current = null;
  }, []);

  const cancelPlayingBeatFlow = useCallback(() => {
    playingBeatCancelRef.current?.();
    playingBeatCancelRef.current = null;
  }, []);

  const clearScheduledTimers = useCallback(() => {
    cancelJutsuBeatFlow();
    cancelPlayingBeatFlow();
    shuffleRunIdRef.current += 1;
    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = null;
    }
    if (missLongPressTimerRef.current) {
      clearTimeout(missLongPressTimerRef.current);
      missLongPressTimerRef.current = null;
    }
    shurikenFxTimersRef.current.forEach((id) => window.clearTimeout(id));
    shurikenFxTimersRef.current = [];
    setHitCloneId(null);
    setActiveShuffleStyle('glide');
    clearTauntWaveTimers();
  }, [cancelJutsuBeatFlow, cancelPlayingBeatFlow, clearTauntWaveTimers]);

  const finishShuffleSequence = useCallback(() => {
    setIsShuffling(false);
    setActiveShuffleStyle('glide');
    setBossShuffleLine('');
    setShuffleIntensity('normal');
    shuffleIntensityRef.current = 'normal';
    setShuffleLocked(false);
    beatFlowRef.current = 'ambient';
  }, []);

  const runOneCloneShuffle = useCallback((intensity: Stage2ShuffleIntensity): Promise<void> => {
    const runId = ++shuffleRunIdRef.current;
    const field = cloneFieldRef.current;
    const list = clonesRef.current;
    if (!field || list.length <= 1) {
      return Promise.resolve();
    }

    const applyShuffledOrder = () => {
      const current = clonesRef.current;
      const byId = new Map(current.map((c) => [c.id, c]));
      const nextIds = shuffledCloneIds(current.map((c) => c.id));
      const reordered = nextIds
        .map((id) => byId.get(id))
        .filter((c): c is CloneOption => c !== undefined);
      if (reordered.length === current.length) {
        setClones(reordered);
      }
    };

    releaseCloneShuffleMotion(field);
    setIsShuffling(true);
    setShufflePulseTick((t) => t + 1);
    const style = pickRandomCloneShuffleStyle(lastShuffleStyleRef.current);
    lastShuffleStyleRef.current = style;
    setActiveShuffleStyle(style);
    const motion = stage2CloneShuffleMotion(intensity);
    return animateCloneOrderShuffle(field, applyShuffledOrder, {
      ...motion,
      style,
    }).finally(() => {
      releaseCloneShuffleMotion(field);
      if (shuffleRunIdRef.current !== runId) return;
    });
  }, []);

  const primeBossCalloutForRound = useCallback((cloneCount: number) => {
    const { line, useLine5, useLine7 } = stage2BossCalloutLineOncePerGame(cloneCount, {
      line5: bossShuffleLine5UsedRef.current,
      line7: bossShuffleLine7UsedRef.current,
    });
    if (useLine5) bossShuffleLine5UsedRef.current = true;
    if (useLine7) bossShuffleLine7UsedRef.current = true;
    if (line) {
      setBossShuffleLine(line);
      setBossShuffleTick((t) => t + 1);
      bossCalloutBeatsLeftRef.current = STAGE2_BOSS_CALLOUT_BEATS;
      beatFlowRef.current = 'boss-callout';
      setJutsuCasterPhase('idle');
      return;
    }
    setBossShuffleLine('');
    bossCalloutBeatsLeftRef.current = 0;
    beatFlowRef.current = 'spawn';
    if (stage2RoundPowerFxWaitsForBossCallout(roundIndexRef.current)) {
      setRoundPowerFxUnlocked(true);
    }
  }, []);

  const beginShuffleSequence = useCallback((cloneCount: number) => {
    shufflesLeftRef.current = stage2ShuffleCountForRound(
      roundIndexRef.current,
      cloneCount,
    );
    setIsShuffling(true);
    beatFlowRef.current = 'shuffle-seq';
  }, []);

  const startPlayingBeatFlow = useCallback(
    (count: number) => {
      cancelPlayingBeatFlow();
      spawnBeatDoneRef.current = false;
      setSpawnedVisible(0);
      setBossShuffleLine('');
      targetCloneCountRef.current = count;
      preShuffleBeatsLeftRef.current = STAGE2_CLONE_SHUFFLE_DELAY_BEATS;
      primeBossCalloutForRound(count);

      playingBeatCancelRef.current = runStage2QuarterBeatLoop(() => {
        if (phaseRef.current !== 'playing') return false;

        setBeatPulse((p) => p + 1);

        if (beatFlowRef.current === 'boss-callout') {
          bossCalloutBeatsLeftRef.current -= 1;
          if (bossCalloutBeatsLeftRef.current > 0) return true;
          setBossShuffleLine('');
          if (stage2RoundPowerFxWaitsForBossCallout(roundIndexRef.current)) {
            setRoundPowerFxUnlocked(true);
          }
          beatFlowRef.current = 'post-boss-cast';
          setJutsuCastTick((t) => t + 1);
          setJutsuCasterPhase('casting');
          return true;
        }

        if (beatFlowRef.current === 'post-boss-cast') {
          if (jutsuCasterPhaseRef.current !== 'hidden') return true;
          beatFlowRef.current = 'spawn';
          return true;
        }

        if (beatFlowRef.current === 'spawn') {
          if (!spawnBeatDoneRef.current) {
            spawnBeatDoneRef.current = true;
            setBossShuffleLine('');
            setSpawnedVisible(targetCloneCountRef.current);
            void recoverQuizAudio().then(() =>
              playStage2ClonesSpawn(targetCloneCountRef.current),
            );
          }
          beatFlowRef.current = 'pre-shuffle';
          return true;
        }

        if (beatFlowRef.current === 'pre-shuffle') {
          preShuffleBeatsLeftRef.current -= 1;
          if (preShuffleBeatsLeftRef.current > 0) return true;
          beginShuffleSequence(targetCloneCountRef.current);
          return true;
        }

        if (beatFlowRef.current === 'shuffle-seq') {
          if (shuffleBusyRef.current) return true;

          if (shufflesLeftRef.current > 0) {
            const intensity = shuffleIntensityRef.current;
            shufflesLeftRef.current -= 1;
            shuffleBusyRef.current = true;
            void runOneCloneShuffle(intensity).finally(() => {
              shuffleBusyRef.current = false;
            });
            return true;
          }

          if (!shuffleBusyRef.current) {
            finishShuffleSequence();
          }
          return true;
        }

        return true;
      });
    },
    [
      beginShuffleSequence,
      cancelPlayingBeatFlow,
      finishShuffleSequence,
      primeBossCalloutForRound,
      runOneCloneShuffle,
    ],
  );

  const beginRoundWithJutsu = useCallback(
    (index: number, words: Stage2SessionWord[]) => {
      const entry = words[index];
      const word = entry?.word;
      if (!word) return;
      if (index === 0) {
        roundOutcomesRef.current = [];
      }

      const count = STAGE2_CLONE_COUNTS[index] ?? 3;
      const roundIntensity = stage2ShuffleIntensityForRound(index, count);
      shuffleIntensityRef.current = roundIntensity;
      setShuffleIntensity(roundIntensity);
      setRoundPowerFxUnlocked(
        stage2RoundShowsPowerFx(index) &&
          !stage2RoundPowerFxWaitsForBossCallout(index),
      );
      setClones(buildCloneOptionsForRound(index, word, count));
      setShuffleLocked(true);
      setIsShuffling(false);
      setBossShuffleLine('');
      setSpawnKey((k) => k + 1);
      setRoundIndex(index);
      setFeedback(null);
      setFeedbackExplanation(null);
      setMissCloneId(null);
      missCloneIdRef.current = null;
      setHideWrongClones(false);
      clearHeroineHint();
      setBusy(true);
      setPhase('jutsu-intro');
      const castLine = pickJutsuCastLine(index, lastJutsuCastLineRef.current);
      lastJutsuCastLineRef.current = castLine;
      setJutsuCastLine(castLine);
      const deferCastForBossCallout = Boolean(
        stage2BossCalloutLineOncePerGame(count, {
          line5: bossShuffleLine5UsedRef.current,
          line7: bossShuffleLine7UsedRef.current,
        }).line,
      );
      if (deferCastForBossCallout) {
        setJutsuCastTick(0);
        setJutsuCasterPhase('hidden');
      } else {
        setJutsuCastTick((t) => t + 1);
        setJutsuCasterPhase('casting');
      }
      setSpawnedVisible(0);
      cancelJutsuBeatFlow();
      cancelPlayingBeatFlow();

      jutsuBeatCancelRef.current = scheduleStage2Beats(STAGE2_JUTSU_INTRO_BEATS, (beatIndex) => {
        setBeatPulse((p) => p + 1);
        if (beatIndex >= STAGE2_JUTSU_INTRO_BEATS - 1) {
          jutsuBeatCancelRef.current = null;
          if (
            stage2RoundShowsPowerFx(index) &&
            !stage2RoundPowerFxWaitsForBossCallout(index)
          ) {
            setRoundPowerFxUnlocked(true);
          }
          setPhase('playing');
          setBusy(false);
          startPlayingBeatFlow(count);
        }
      });
    },
    [cancelJutsuBeatFlow, cancelPlayingBeatFlow, clearHeroineHint, startPlayingBeatFlow],
  );

  const handleJutsuCastComplete = useCallback(() => {
    setJutsuCasterPhase((phase) => (phase === 'casting' ? 'fading' : phase));
  }, []);

  useEffect(() => {
    if (jutsuCasterPhase !== 'fading') return;
    const timer = window.setTimeout(
      () => setJutsuCasterPhase('hidden'),
      STAGE2_NINJA_RIVE.castFadeMs,
    );
    return () => window.clearTimeout(timer);
  }, [jutsuCasterPhase]);

  const finishAllRounds = useCallback(
    (finalCorrectCount: number) => {
      clearScheduledTimers();
      playStageClear();
      onStageClear({
        heartsLeft: heartsRef.current,
        roundsCleared: STAGE2_TOTAL_ROUNDS,
        correctCount: finalCorrectCount,
        sessionWords: sessionWordsRef.current,
        roundOutcomes: roundOutcomesRef.current.slice(0, STAGE2_TOTAL_ROUNDS),
      });
    },
    [clearScheduledTimers, onStageClear],
  );

  const advanceAfterRound = useCallback(
    (wasCorrect: boolean) => {
      let nextCorrect = correctCountRef.current;
      if (wasCorrect) {
        nextCorrect += 1;
        setCorrectCount(nextCorrect);
        correctCountRef.current = nextCorrect;
      }

      const nextRound = roundIndexRef.current + 1;
      if (nextRound >= STAGE2_TOTAL_ROUNDS) {
        if (heartsRef.current > 0) {
          finishAllRounds(nextCorrect);
        }
        return;
      }

      beginRoundWithJutsu(nextRound, sessionWordsRef.current);
    },
    [beginRoundWithJutsu, finishAllRounds],
  );

  const clearFeedbackAdvanceTimer = useCallback(() => {
    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = null;
    }
  }, []);

  const runFeedbackAdvance = useCallback(() => {
    clearFeedbackAdvanceTimer();
    if (missLongPressTimerRef.current) {
      clearTimeout(missLongPressTimerRef.current);
      missLongPressTimerRef.current = null;
    }
    missLongPressFiredRef.current = false;
    missExplanationExtendUsedRef.current = false;
    setMissExplanationExtended(false);
    feedbackRef.current = null;
    feedbackExplanationRef.current = null;
    setFeedback(null);
    setFeedbackExplanation(null);
    setMissCloneId(null);
    missCloneIdRef.current = null;
    setHideWrongClones(false);
    roundOutcomesRef.current[roundIndexRef.current] = feedbackWasCorrectRef.current;
    if (heartsRef.current <= 0) {
      clearScheduledTimers();
      playStageFail();
      onGameOver({
        correctCount: correctCountRef.current,
        roundIndex: roundIndexRef.current,
        sessionWords: sessionWordsRef.current,
        bossCalloutUsed: {
          line5: bossShuffleLine5UsedRef.current,
          line7: bossShuffleLine7UsedRef.current,
        },
        roundOutcomes: roundOutcomesRef.current.slice(0, roundIndexRef.current + 1),
      });
      return;
    }
    advanceAfterRound(feedbackWasCorrectRef.current);
  }, [advanceAfterRound, clearFeedbackAdvanceTimer, clearScheduledTimers, onGameOver]);

  const clearMissLongPressTimer = useCallback(() => {
    if (missLongPressTimerRef.current) {
      clearTimeout(missLongPressTimerRef.current);
      missLongPressTimerRef.current = null;
    }
  }, []);

  const scheduleFeedbackAdvance = useCallback(
    (delayMs: number) => {
      clearFeedbackAdvanceTimer();
      const delay = Math.max(0, delayMs);
      feedbackDeadlineAtRef.current = Date.now() + delay;
      feedbackTimerRef.current = setTimeout(() => {
        runFeedbackAdvance();
      }, delay);
    },
    [clearFeedbackAdvanceTimer, runFeedbackAdvance],
  );

  const extendMissExplanationDisplay = useCallback(() => {
    if (feedbackRef.current !== 'miss' || !feedbackExplanationRef.current) return;
    if (missExplanationExtendUsedRef.current) return;
    missExplanationExtendUsedRef.current = true;
    const remaining = Math.max(0, feedbackDeadlineAtRef.current - Date.now());
    scheduleFeedbackAdvance(remaining + STAGE2_MISS_HOLD_EXTEND_MS);
    setMissExplanationExtended(true);
  }, [scheduleFeedbackAdvance]);

  const handleMissAnimationComplete = useCallback(() => {
    if (feedbackRef.current !== 'miss') return;
    setHideWrongClones(true);
  }, []);

  const showFeedbackThenAdvance = useCallback(
    (kind: RoundFeedback, wasCorrect: boolean) => {
      clearHeroineHint();
      clearMissLongPressTimer();
      missLongPressFiredRef.current = false;
      missExplanationExtendUsedRef.current = false;
      setMissExplanationExtended(false);
      feedbackWasCorrectRef.current = wasCorrect;
      feedbackRef.current = kind;
      setFeedback(kind);
      if (kind === 'miss') {
        const entry = sessionWordsRef.current[roundIndexRef.current];
        const explanation = entry ? formatStage2CorrectExplanation(entry) : null;
        feedbackExplanationRef.current = explanation;
        setFeedbackExplanation(explanation);
        setHideWrongClones(!missCloneIdRef.current);
      } else {
        feedbackExplanationRef.current = null;
        setFeedbackExplanation(null);
        setHideWrongClones(true);
      }
      setPhase('resolving');
      setBusy(true);

      const feedbackMs = kind === 'miss' ? STAGE2_MISS_FEEDBACK_MS : STAGE2_FEEDBACK_MS;
      scheduleFeedbackAdvance(feedbackMs);
    },
    [clearHeroineHint, clearMissLongPressTimer, scheduleFeedbackAdvance],
  );

  const onMissExplanationPointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (feedbackRef.current !== 'miss' || !feedbackExplanationRef.current) return;
      if (missExplanationExtendUsedRef.current) return;
      e.preventDefault();
      e.stopPropagation();
      clearMissLongPressTimer();
      missLongPressFiredRef.current = false;
      missLongPressTimerRef.current = setTimeout(() => {
        missLongPressTimerRef.current = null;
        if (missLongPressFiredRef.current) return;
        missLongPressFiredRef.current = true;
        extendMissExplanationDisplay();
      }, STAGE2_MISS_LONG_PRESS_MS);
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* ignore capture failures */
      }
    },
    [clearMissLongPressTimer, extendMissExplanationDisplay],
  );

  const onMissExplanationPointerUp = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      clearMissLongPressTimer();
    },
    [clearMissLongPressTimer],
  );

  const onMissExplanationPointerLeave = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (e.buttons !== 0) return;
      clearMissLongPressTimer();
    },
    [clearMissLongPressTimer],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      ensureQuizAudio();
      await Promise.all([
        ...Object.values(STAGE2_ASSETS).map(preloadImage),
        preloadRiveAsset(STAGE2_NINJA_RIVE.src),
        preloadRiveAsset(STAGE2_RED_BOY_RIVE.src),
        preloadRiveAsset(STAGE2_BLUE_GIRL_RIVE.src),
      ]);

      if (resume) {
        if (cancelled) return;
        setSessionWords(resume.sessionWords);
        sessionWordsRef.current = resume.sessionWords;
        setCorrectCount(resume.correctCount);
        correctCountRef.current = resume.correctCount;
        setHearts(STAGE2_MAX_HEARTS);
        heartsRef.current = STAGE2_MAX_HEARTS;
        heroineHintUsedRef.current = false;
        heroineHintRoundKeyRef.current = null;
        setHeroineHint(null);
        setRoundIndex(resume.roundIndex);
        roundIndexRef.current = resume.roundIndex;
        if (!cancelled) beginRoundWithJutsu(resume.roundIndex, resume.sessionWords);
        return;
      }

      if (!playSessionId) {
        setLoadError('遊戲局次憑證遺失，請返回遊戲選單重試。');
        return;
      }
      const res = await fetchStage2SessionWords(playSessionId);
      if (cancelled) return;
      if (!res.ok) {
        setLoadError(res.message);
        return;
      }
      setSessionWords(res.words);
      sessionWordsRef.current = res.words;
      bossShuffleLine5UsedRef.current = STAGE2_BOSS_CALLOUT_USED_INITIAL.line5;
      bossShuffleLine7UsedRef.current = STAGE2_BOSS_CALLOUT_USED_INITIAL.line7;
      heroineHintUsedRef.current = false;
      heroineHintRoundKeyRef.current = null;
      setHeroineHint(null);
      if (!cancelled) beginRoundWithJutsu(0, res.words);
    })();
    return () => {
      cancelled = true;
      clearScheduledTimers();
    };
  }, [beginRoundWithJutsu, clearScheduledTimers, playSessionId, resume]);

  const isLowHealth = hearts === 1;

  useEffect(() => {
    if (isLowHealth) {
      startStage2LowHealthAmbience();
      return () => stopStage2LowHealthAmbience();
    }
    stopStage2LowHealthAmbience();
  }, [isLowHealth]);

  const applyHeartPenalty = useCallback(() => {
    playQuizAnswerWrong();
    const nextHearts = heartsRef.current - 1;
    setHearts(nextHearts);
    heartsRef.current = nextHearts;
    return nextHearts;
  }, []);

  const roundClockActive =
    phase === 'playing' && !busy && feedback === null && !shuffleLocked;

  useEffect(() => {
    if (!roundClockActive) {
      wasPlayingActiveRef.current = false;
      return;
    }

    const roundKey = `${spawnKey}`;
    const roundJustStarted = !wasPlayingActiveRef.current;
    wasPlayingActiveRef.current = true;

    if (roundJustStarted) {
      timeUpHandledRef.current = false;
      let seconds = stage2RoundTimeSeconds(
        STAGE2_CLONE_COUNTS[roundIndexRef.current] ?? 3,
      );
      if (heroineHintRoundKeyRef.current !== roundKey) {
        heroineHintRoundKeyRef.current = roundKey;
        if (tryOfferHeroineHint(sessionWordsRef.current[roundIndexRef.current])) {
          seconds += STAGE2_HEROINE_HINT_TIME_BONUS_SECONDS;
        }
      }
      setSecondsLeft(seconds);
    }
  }, [roundClockActive, spawnKey, tryOfferHeroineHint]);

  useEffect(() => {
    if (!roundClockActive) {
      countdownTickPlayedRef.current = null;
      return;
    }
    if (secondsLeft <= 0) return;
    if (countdownTickPlayedRef.current === secondsLeft) return;
    countdownTickPlayedRef.current = secondsLeft;
    playStage2RoundCountdownTick(secondsLeft);
  }, [roundClockActive, secondsLeft]);

  useEffect(() => {
    if (!roundClockActive) return;

    const tick = window.setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);

    return () => clearInterval(tick);
  }, [roundClockActive, spawnKey]);

  useEffect(() => {
    if (phase === 'playing') return;
    cancelPlayingBeatFlow();
    if (phase !== 'jutsu-intro') {
      cancelJutsuBeatFlow();
    }
    if (phase !== 'resolving') {
      const field = cloneFieldRef.current;
      if (field) releaseCloneShuffleMotion(field);
      shuffleRunIdRef.current += 1;
      setIsShuffling(false);
    }
  }, [cancelJutsuBeatFlow, cancelPlayingBeatFlow, phase]);

  const handleTimeUp = useCallback(() => {
    if (busyRef.current || phaseRef.current !== 'playing' || timeUpHandledRef.current) {
      return;
    }
    timeUpHandledRef.current = true;
    clearHeroineHint();
    void recoverQuizAudio().then(() => {
      playStage2RoundCountdownExpire();
    });
    applyHeartPenalty();
    setMissCloneId(null);
    missCloneIdRef.current = null;
    showFeedbackThenAdvance('miss', false);
  }, [applyHeartPenalty, clearHeroineHint, showFeedbackThenAdvance]);

  useEffect(() => {
    if (phase !== 'playing' || busy || feedback !== null || secondsLeft > 0) return;
    handleTimeUp();
  }, [phase, busy, feedback, secondsLeft, handleTimeUp]);

  const launchShurikens = useCallback((targetId: string) => {
    const arena = arenaRef.current;
    const heroes = heroesRef.current;
    const redHero = heroes?.querySelector<HTMLElement>('.stage2-hero--red');
    const target = arena?.querySelector<HTMLElement>(`[data-clone-id="${targetId}"]`);
    const scale = canvasScale > 0 ? canvasScale : 1;
    if (!arena || !redHero || !target || !Number.isFinite(scale)) return;

    shurikenFxTimersRef.current.forEach((id) => window.clearTimeout(id));
    shurikenFxTimersRef.current = [];
    setHitCloneId(null);

    const arenaRect = arena.getBoundingClientRect();
    const redHeroRect = redHero.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();

    const fromX = (redHeroRect.left + redHeroRect.width / 2 - arenaRect.left) / scale;
    const fromY = (redHeroRect.top + redHeroRect.height * 0.32 - arenaRect.top) / scale;
    const toX = (targetRect.left + targetRect.width / 2 - arenaRect.left) / scale;
    const toY = (targetRect.top + targetRect.height * 0.25 - arenaRect.top) / scale;

    const id = ++shurikenIdRef.current;
    setRedBoyThrowTick((t) => t + 1);
    setShurikens([{ id, targetId, fromX, fromY, toX, toY }]);

    const scheduleFx = (fn: () => void, delayMs: number) => {
      shurikenFxTimersRef.current.push(window.setTimeout(fn, delayMs));
    };

    scheduleFx(() => {
      setHitCloneId(targetId);
      void recoverQuizAudio().then(() => playStage2ShurikenHit());
    }, STAGE2_SHURIKEN_FLY_MS);

    scheduleFx(() => setShurikens([]), STAGE2_SHURIKEN_FLY_MS + 40);

    scheduleFx(() => setHitCloneId(null), STAGE2_SHURIKEN_FLY_MS + 360);
  }, [canvasScale]);

  const handlePickClone = useCallback(
    (clone: CloneOption) => {
      if (busy || shuffleLocked || phase !== 'playing' || feedback !== null) return;
      clearHeroineHint();
      void recoverQuizAudio();
      setBusy(true);
      setPhase('resolving');
      launchShurikens(clone.id);

      window.setTimeout(() => {
        if (clone.isCorrect) {
          setMissCloneId(null);
          missCloneIdRef.current = null;
          playQuizAnswerCorrect();
          showFeedbackThenAdvance('bingo', true);
          return;
        }

        setMissCloneId(clone.id);
        missCloneIdRef.current = clone.id;
        applyHeartPenalty();
        showFeedbackThenAdvance('miss', false);
      }, STAGE2_SHURIKEN_HIT_MS);
    },
    [
      busy,
      shuffleLocked,
      phase,
      feedback,
      clearHeroineHint,
      launchShurikens,
      showFeedbackThenAdvance,
      applyHeartPenalty,
    ],
  );

  const showNinjaStage =
    phase === 'jutsu-intro' || phase === 'playing' || phase === 'resolving';
  const showClones = phase === 'playing' || phase === 'resolving';
  const showTimer = phase === 'playing' && !busy && !shuffleLocked && feedback === null;
  const showBossCallout =
    Boolean(bossShuffleLine) &&
    phase === 'playing' &&
    spawnedVisible === 0 &&
    shuffleLocked;
  const showJutsuCaster =
    jutsuCasterPhase === 'idle' ||
    jutsuCasterPhase === 'casting' ||
    jutsuCasterPhase === 'fading';
  const showJutsuCastLine =
    Boolean(jutsuCastLine) &&
    jutsuCasterPhase === 'casting' &&
    (phase === 'jutsu-intro' || phase === 'playing');
  const sceneOnBeat =
    beatPulse > 0 &&
    (phase === 'jutsu-intro' || phase === 'playing' || isShuffling);
  const shuffleFxTier =
    shuffleIntensity === 'finale'
      ? 'finale'
      : shuffleIntensity === 'extreme'
        ? 'extreme'
        : shuffleIntensity === 'boost'
          ? 'boost'
          : null;
  const finalPhaseTier =
    roundIndex >= 9 ? 3 : roundIndex >= 8 ? 2 : roundIndex >= 7 ? 1 : 0;
  /** 7 分身局（第 8 回起）：全幅旋轉光暈；第 8 回等 Boss 台詞後才開 */
  const showRoundPowerFx =
    stage2RoundShowsPowerFx(roundIndex) &&
    roundPowerFxUnlocked &&
    shuffleFxTier !== null &&
    shuffleLocked &&
    (phase === 'jutsu-intro' || phase === 'playing');

  if (loadError) {
    return (
      <div className="stage2-root stage2-root--error">
        <p>{loadError}</p>
      </div>
    );
  }

  const stage2Scene = (
    <div
      className={cn(
        fredoka.className,
        'stage2-root select-none',
        embedded && 'stage2-root--fixed',
        embedded && 'stage2-root--embedded',
        isLowHealth && 'stage2-root--low-health',
      )}
      data-stage2-clone-game
      style={{
        ['--stage2-beat-ms' as string]: `${STAGE2_BEAT_MS}ms`,
        ['--stage2-cast-fade-ms' as string]: `${STAGE2_NINJA_RIVE.castFadeMs}ms`,
      }}
    >
      <div
        className={cn(
          'stage2-rpg-frame stage2-scene-shell',
          sceneOnBeat && 'stage2-scene-shell--on-beat',
          finalPhaseTier > 0 && 'stage2-scene-shell--final-phase',
          finalPhaseTier === 1 && 'stage2-scene-shell--final-phase-1',
          finalPhaseTier === 2 && 'stage2-scene-shell--final-phase-2',
          finalPhaseTier === 3 && 'stage2-scene-shell--final-phase-3',
          showRoundPowerFx && 'stage2-scene-shell--round-power',
          showRoundPowerFx &&
            (shuffleFxTier === 'extreme' || shuffleFxTier === 'finale') &&
            'stage2-scene-shell--shuffle-extreme',
          showRoundPowerFx &&
            shuffleFxTier === 'finale' &&
            'stage2-scene-shell--shuffle-finale',
        )}
      >
        <Stage2SceneBackdrop />
        {finalPhaseTier > 0 ? (
          <div className="stage2-final-phase-overlay" aria-hidden />
        ) : null}
        {showRoundPowerFx &&
        (shuffleFxTier === 'extreme' || shuffleFxTier === 'finale') ? (
          <div className="stage2-round-power-aura stage2-round-power-aura--extreme" aria-hidden>
            <div className="stage2-round-power-aura__bloom" />
            <div className="stage2-round-power-aura__spin" />
          </div>
        ) : null}
        {showRoundPowerFx && shuffleFxTier === 'boost' ? (
          <div className="stage2-round-power-aura stage2-round-power-aura--boost" aria-hidden>
            <div className="stage2-round-power-aura__bloom" />
            <div className="stage2-round-power-aura__spin" />
          </div>
        ) : null}
        {isLowHealth ? <div className="stage2-low-health-vignette" aria-hidden /> : null}
        <div className="stage2-rpg-enemy-panel" ref={arenaRef}>
          <div
            className={cn(
              fredoka.className,
              'stage2-round-badge quiz-status-stroke-text',
            )}
          >
            ROUND {Math.min(roundIndex + 1, STAGE2_TOTAL_ROUNDS)}/{STAGE2_TOTAL_ROUNDS}
          </div>

          {showNinjaStage ? (
            <div
              className={cn(
                'stage2-ninja-stage',
                feedback !== null && 'stage2-ninja-stage--has-feedback',
              )}
            >
              {showJutsuCaster ? (
                <div
                  className={cn(
                    'stage2-jutsu-intro',
                    jutsuCasterPhase === 'idle' && 'stage2-jutsu-intro--idle',
                  )}
                >
                  <div className="stage2-jutsu-caster">
                    <div
                      className={cn(
                        'stage2-jutsu-caster-body',
                        jutsuCasterPhase === 'fading' && 'stage2-jutsu-caster-body--fading',
                      )}
                    >
                      {jutsuCasterPhase === 'fading' ? (
                        <div
                          key={`jutsu-vanish-flash-${jutsuCastTick}`}
                          className="stage2-jutsu-vanish-flash"
                          aria-hidden
                        />
                      ) : null}
                      {showJutsuCastLine ? (
                        <span
                          key={`jutsu-cast-${jutsuCastTick}`}
                          className="stage2-clone-taunt stage2-jutsu-cast-line"
                          role="status"
                          aria-live="polite"
                        >
                          {jutsuCastLine}
                        </span>
                      ) : null}
                      <Stage2NinjaRive
                        className="stage2-purple-ninja"
                        castTick={jutsuCasterPhase === 'casting' ? jutsuCastTick : 0}
                        onCastComplete={handleJutsuCastComplete}
                        priority
                      />
                    </div>
                  </div>
                </div>
              ) : null}

              {showBossCallout ? (
                <div
                  className={cn(
                    'stage2-boss-callout',
                    shuffleFxTier === 'boost' && 'stage2-boss-callout--subtle',
                    shuffleFxTier === 'extreme' && 'stage2-boss-callout--extreme',
                  )}
                  key={`boss-callout-${bossShuffleTick}`}
                >
                  <p className="stage2-boss-callout__line" role="status" aria-live="polite">
                    <span className="stage2-boss-callout__glow" aria-hidden />
                    <span className="stage2-boss-callout__float">
                      <span className={cn(fredoka.className, 'stage2-boss-callout__text')}>
                        {bossShuffleLine}
                      </span>
                    </span>
                  </p>
                </div>
              ) : null}

              {showClones ? (
                <>
                  {showTimer ? (
                    <div
                      className={cn(
                        fredoka.className,
                        'stage2-round-timer quiz-status-stroke-text',
                        secondsLeft <= 1 && 'stage2-round-timer--urgent',
                      )}
                      role="timer"
                      aria-live="polite"
                      aria-label={`剩餘 ${secondsLeft} 秒`}
                    >
                      {secondsLeft}
                    </div>
                  ) : null}
                  <div
                    key={spawnKey}
                    ref={cloneFieldRef}
                    className={cn(
                      'stage2-clone-field',
                      `stage2-clone-field--n${cloneCount}`,
                      finalPhaseTier > 0 && 'stage2-clone-field--final-phase',
                      finalPhaseTier === 1 && 'stage2-clone-field--final-phase-1',
                      finalPhaseTier === 2 && 'stage2-clone-field--final-phase-2',
                      finalPhaseTier === 3 && 'stage2-clone-field--final-phase-3',
                      isShuffling && 'stage2-clone-field--shuffling',
                      isShuffling &&
                        activeShuffleStyle === 'arc' &&
                        'stage2-clone-field--shuffle-style-arc',
                      isShuffling &&
                        activeShuffleStyle === 'phase' &&
                        'stage2-clone-field--shuffle-style-phase',
                      isShuffling &&
                        activeShuffleStyle === 'zigzag' &&
                        'stage2-clone-field--shuffle-style-zigzag',
                      isShuffling &&
                        activeShuffleStyle === 'slingshot' &&
                        'stage2-clone-field--shuffle-style-slingshot',
                      isShuffling &&
                        activeShuffleStyle === 'drift' &&
                        'stage2-clone-field--shuffle-style-drift',
                      isShuffling &&
                        activeShuffleStyle === 'snap' &&
                        'stage2-clone-field--shuffle-style-snap',
                      isShuffling &&
                        activeShuffleStyle === 'vortex' &&
                        'stage2-clone-field--shuffle-style-vortex',
                      isShuffling &&
                        shuffleFxTier === 'boost' &&
                        'stage2-clone-field--shuffling-boost',
                      isShuffling &&
                        shuffleFxTier === 'extreme' &&
                        'stage2-clone-field--shuffling-extreme',
                      isShuffling &&
                        shuffleFxTier === 'finale' &&
                        'stage2-clone-field--shuffling-finale',
                      hideWrongClones && 'stage2-clone-field--correct-revealed',
                    )}
                  >
                  {isShuffling && finalPhaseTier > 0 ? (
                    <div
                      key={`stage2-shuffle-shockwave-${roundIndex}-${shufflePulseTick}`}
                      className="stage2-shuffle-shockwave"
                      aria-hidden
                    />
                  ) : null}
                  {clones.map((clone, cloneIdx) => (
                      <button
                      key={clone.id}
                      type="button"
                      data-clone-id={clone.id}
                      className={cn(
                        'stage2-clone',
                        cloneIdx >= spawnedVisible && 'stage2-clone--pending',
                        cloneIdx < spawnedVisible && 'stage2-clone--spawn-in',
                        hitCloneId === clone.id && 'stage2-clone--hit',
                        hideWrongClones &&
                          !clone.isCorrect &&
                          'stage2-clone--culled',
                        hideWrongClones &&
                          clone.isCorrect &&
                          'stage2-clone--correct-revealed',
                      )}
                      style={
                        {
                          ['--taunt-delay' as string]: `${cloneIdx * STAGE2_TAUNT_STAGGER_MS}ms`,
                          ['--clone-spawn-i' as string]: String(cloneIdx),
                        } as React.CSSProperties
                      }
                        disabled={busy || shuffleLocked}
                        aria-label={`Pick clone: ${clone.label}`}
                        onClick={() => handlePickClone(clone)}
                      >
                        <div className="stage2-clone-stack">
                          <div className="stage2-clone-figure">
                            {cloneTaunts[clone.id] ? (
                              <span
                                key={`${clone.id}-taunt-${tauntTicks[clone.id] ?? 0}`}
                                className="stage2-clone-taunt"
                                aria-hidden
                              >
                                {cloneTaunts[clone.id]}
                              </span>
                            ) : null}
                            <Stage2NinjaRive
                              className="stage2-purple-ninja stage2-clone-ninja"
                              fireHit={hitCloneId === clone.id && clone.isCorrect}
                              fireMiss={feedback === 'miss' && missCloneId === clone.id}
                              onMissComplete={
                                feedback === 'miss' && missCloneId === clone.id
                                  ? handleMissAnimationComplete
                                  : undefined
                              }
                            />
                          </div>
                          <span
                            className={cn(
                              'stage2-clone-word quiz-play-opt-label quiz-cute-stroke-text',
                              cloneWordLengthClass(clone.label),
                            )}
                          >
                            {clone.label}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              ) : null}

              {feedback ? (
                <div
                  className={cn(
                    fredoka.className,
                    'stage2-round-feedback-wrap',
                    feedback === 'miss' && 'stage2-round-feedback-wrap--miss',
                    feedback === 'miss' &&
                      feedbackExplanation &&
                      'stage2-round-feedback-wrap--holdable',
                  )}
                  role="status"
                  aria-live="assertive"
                >
                  <p
                    className={cn(
                      'stage2-round-feedback quiz-status-stroke-text',
                      feedback === 'bingo'
                        ? 'stage2-round-feedback--bingo'
                        : 'stage2-round-feedback--miss',
                    )}
                  >
                    {feedback === 'bingo' ? 'BINGO' : 'MISS'}
                  </p>
                  {feedback === 'miss' && feedbackExplanation ? (
                    <button
                      type="button"
                      disabled={missExplanationExtended}
                      className={cn(
                        'stage2-round-feedback-explanation-box touch-manipulation',
                        missExplanationExtended &&
                          'stage2-round-feedback-explanation-box--extended',
                      )}
                      aria-label={
                        missExplanationExtended ? '已延長顯示 3 秒' : '長按延長顯示 3 秒'
                      }
                      onPointerDown={onMissExplanationPointerDown}
                      onPointerUp={onMissExplanationPointerUp}
                      onPointerCancel={onMissExplanationPointerUp}
                      onPointerLeave={onMissExplanationPointerLeave}
                      onContextMenu={(e) => e.preventDefault()}
                    >
                      <p className="stage2-round-feedback-explanation">
                        {feedbackExplanation.split('\n').map((line, i) => (
                          <span key={i}>
                            {i > 0 ? <br /> : null}
                            {line}
                          </span>
                        ))}
                      </p>
                      <p className="stage2-round-feedback-hold-hint">
                        {missExplanationExtended ? '已延長 3 秒' : '長按延長 3 秒'}
                      </p>
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {shurikens.map((s) => (
            <span
              key={s.id}
              className="stage2-shuriken"
              style={
                {
                  ['--from-x' as string]: `${s.fromX}px`,
                  ['--from-y' as string]: `${s.fromY}px`,
                  ['--to-x' as string]: `${s.toX}px`,
                  ['--to-y' as string]: `${s.toY}px`,
                } as React.CSSProperties
              }
              aria-hidden
            >
              <NextImage
                src={STAGE2_ASSETS.shuriken}
                alt=""
                width={52}
                height={52}
                className="stage2-shuriken-img"
                draggable={false}
              />
            </span>
          ))}

          <div className="stage2-rpg-heroes" ref={heroesRef}>
            <div className="stage2-hero-mount stage2-hero--red">
              <Stage2RedBoyRive throwTick={redBoyThrowTick} priority />
            </div>
            <div className="stage2-hero-wrap stage2-hero-wrap--blue">
              {heroineHint && roundClockActive ? (
                <div
                  className="stage2-heroine-hint"
                  role="status"
                  aria-live="polite"
                  aria-label={`${heroineHint.lead} ${heroineHint.answer}`}
                >
                  <p className="stage2-heroine-hint-lead">{heroineHint.lead}</p>
                  <p className="stage2-heroine-hint-answer">{heroineHint.answer}</p>
                </div>
              ) : null}
              <div className="stage2-hero-mount stage2-hero--blue">
                <Stage2BlueGirlRive className="stage2-hero--blue" priority />
              </div>
            </div>
          </div>
        </div>

        {currentWord && phase === 'playing' && !busy && !shuffleLocked && feedback === null ? (
          <p className="stage2-hint">Tap the clone with the correct spelling</p>
        ) : null}

        <div className="stage2-hearts" aria-label={`生命 ${hearts}`}>
          {Array.from({ length: STAGE2_MAX_HEARTS }, (_, i) => (
            <span
              key={i}
              className={cn(
                'stage2-heart',
                i < hearts && 'stage2-heart--full',
                isLowHealth && i === 0 && 'stage2-heart--critical',
              )}
              aria-hidden
            >
              ♥
            </span>
          ))}
        </div>
      </div>
    </div>
  );

  if (!embedded) {
    return stage2Scene;
  }

  return (
    <div ref={viewportRef} className="stage2-fixed-viewport">
      <div
        className="stage2-fixed-canvas"
        style={{ '--stage2-canvas-scale': canvasScale } as CSSProperties}
      >
        {stage2Scene}
      </div>
    </div>
  );
}
