'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type AnimationEvent,
  type MutableRefObject,
} from 'react';
import Image from 'next/image';
import { Fredoka, Monoton } from 'next/font/google';

import '@/app/stage3-disco.css';

import {
  STAGE3_ASSETS,
  STAGE3_BEAT_MS,
  STAGE3_BOSS_HINT_FADE_BEATS,
  STAGE3_BOSS_HINT_HOLD_BEATS,
  STAGE3_COMBO_MIN_HITS,
  STAGE3_COMBO_TIER_THRESHOLDS,
  STAGE3_AWARD_CEREMONY_MS,
  STAGE3_AWARD_REACTION_MS,
  STAGE3_AWARD_TV_OFF_MS,
  STAGE3_FEVER_MARQUEE_ROUND_INDEX,
  STAGE3_INPUT_FEEDBACK_MS,
  STAGE3_MARQUEE_MS,
  STAGE3_TOTAL_ROUNDS,
  STAGE3_WORD_PERFECT_MS,
} from '@/lib/stage3/constants';
import { Stage3AwardCeremony } from '@/components/stage3/stage3-award-ceremony';
import {
  computeStage3FinalScore,
  createEmptyStage3RunStats,
  isStage3FeverRound,
  isStage3RoundPerfect,
  recordStage3CorrectKeystroke,
  recordStage3Perfect,
  syncStage3PerfectCountFromRounds,
  type Stage3FinalScoreResult,
  type Stage3RunStats,
} from '@/lib/stage3/stage3-final-score';
import { STAGE3_MARQUEE_TEXT } from '@/lib/stage3/stage3-messages';
import { Stage3DiscoBackdrop } from '@/components/stage3/stage3-disco-backdrop';
import {
  buildStage3Session,
  type Stage3InputMode,
  type Stage3RoundSpec,
  type Stage3Session,
} from '@/lib/stage3/rounds';
import {
  isStage3GameKey,
  STAGE3_BOSS_BONUS_KEY,
  STAGE3_BOY_KEY_HINTS,
  STAGE3_GIRL_KEY_HINTS,
  stage3BoyKeyIndex,
  stage3GirlKeyIndex,
} from '@/lib/stage3/keyboard';
import {
  buildStage3KeyRevealSequence,
  computeStage3KeyVisibilityFromSides,
  resolveStage3KeyLetter,
  stage3ModeUsesBoss,
  stage3ModeUsesBoy,
  stage3ModeUsesGirl,
  STAGE3_KEY_SIDES_HIDDEN,
  type Stage3KeyLayout,
  type Stage3KeySidesRevealed,
} from '@/lib/stage3/key-layout';
import { scoreStage3Round, type Stage3CharResult } from '@/lib/stage3/scoring';
import {
  ensureQuizAudio,
  playStage3AwardScoreRevealHit,
  playStage3ComboHit,
  playStage3Great,
  playStage3Miss,
  playStage3Perfect,
  playStage3SlabLand,
  playStage3TypeTick,
  runStage3QuarterBeatLoop,
  scheduleStage3Beats,
  startStage3AwardDrumRoll,
  startStage3LetsDanceMusic,
  stopStage3AwardDrumRoll,
  stopStage3LetsDanceMusic,
} from '@/lib/quiz/rpg-audio';
import { cn } from '@/lib/utils';

const fredoka = Fredoka({
  subsets: ['latin'],
  weight: ['600', '700'],
  display: 'swap',
});

const monoton = Monoton({
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
});

type Phase =
  | 'loading'
  | 'marquee'
  | 'boss-announce'
  | 'round-play'
  | 'award-ceremony';

type RoundBeatMode = 'reveal' | 'type';

type ProtagonistMood = 'idle' | 'happy' | 'sad';

type InputFlashKind = 'great' | 'miss';

type CharSlot = {
  state: Stage3CharResult;
  letter?: string;
};

export type Stage3GameResult = Stage3FinalScoreResult & {
  session: Stage3Session;
  roundScores: number[];
  totalCorrectLetters: number;
};

export type Stage3ResumeState = {
  roundIndex: number;
  session: Stage3Session;
  roundScores: number[];
  runStats: Stage3RunStats;
};

type Props = {
  embedded?: boolean;
  resume?: Stage3ResumeState;
  onStageClear: (result: Stage3GameResult) => void;
  onGameOver: (result: Stage3GameResult) => void;
};

function preloadImage(src: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = src;
  });
}

function emptyCharSlots(word: string): CharSlot[] {
  return Array.from({ length: word.length }, () => ({ state: 'pending' as const }));
}

function stage3ComboTier(combo: number): number {
  if (combo >= STAGE3_COMBO_TIER_THRESHOLDS[4]) return 5;
  if (combo >= STAGE3_COMBO_TIER_THRESHOLDS[3]) return 4;
  if (combo >= STAGE3_COMBO_TIER_THRESHOLDS[2]) return 3;
  if (combo >= STAGE3_COMBO_TIER_THRESHOLDS[1]) return 2;
  return 1;
}

function karaokeLenClass(charCount: number): string {
  if (charCount >= 12) return 'stage3-karaoke--len-xl';
  if (charCount >= 9) return 'stage3-karaoke--len-lg';
  if (charCount >= 7) return 'stage3-karaoke--len-md';
  return '';
}

function slabCharFontClass(charCount: number): string {
  if (charCount >= 12) return 'stage3-word-drop--len-xl';
  if (charCount >= 9) return 'stage3-word-drop--len-lg';
  if (charCount >= 7) return 'stage3-word-drop--len-md';
  return '';
}

function onSlabAnimationStart(
  e: AnimationEvent<HTMLElement>,
  playSound: boolean,
  playedRef: MutableRefObject<boolean>,
  pitchIndex: number,
) {
  if (!playSound || playedRef.current) return;
  if (e.animationName !== 'stage3-slab-char-drop') return;
  playedRef.current = true;
  playStage3TypeTick(pitchIndex);
}

function Stage3SlabChar({
  char,
  delay = 0,
  playSound = false,
  pitchIndex = 0,
  settled = false,
}: {
  char: string;
  delay?: number;
  playSound?: boolean;
  pitchIndex?: number;
  settled?: boolean;
}) {
  const playedRef = useRef(false);

  if (settled) {
    return <span className="stage3-slab-char stage3-slab-char--settled">{char}</span>;
  }

  return (
    <span
      className="stage3-slab-char"
      style={{ animationDelay: `${delay}s` }}
      onAnimationStart={(e) => onSlabAnimationStart(e, playSound, playedRef, pitchIndex)}
    >
      {char}
    </span>
  );
}

function Stage3SlabWordLine({
  word,
  charSlots,
  slotKey,
  slabEpoch,
  inputSizing = false,
}: {
  word: string;
  charSlots: CharSlot[];
  slotKey: string;
  slabEpoch: number;
  inputSizing?: boolean;
}) {
  const upper = word.toUpperCase();
  let typedCount = 0;
  while (typedCount < charSlots.length && charSlots[typedCount]?.state === 'correct') {
    typedCount += 1;
  }

  return (
    <div
      className={cn(
        'stage3-word-drop',
        inputSizing && 'stage3-word-drop--input',
        slabCharFontClass(word.length),
      )}
      aria-label={upper}
    >
      {upper.split('').map((expected, ci) => {
        const slot = charSlots[ci] ?? { state: 'pending' as const };
        if (slot.state === 'correct') {
          const isLatest = ci === typedCount - 1;
          return (
            <Stage3SlabChar
              key={`${slotKey}-${ci}-e${slabEpoch}`}
              char={(slot.letter ?? expected).toUpperCase()}
              pitchIndex={ci}
              playSound={isLatest}
              settled={!isLatest}
            />
          );
        }
        return (
          <span key={`${slotKey}-p-${ci}`} className="stage3-word-char-pending">
            _
          </span>
        );
      })}
    </div>
  );
}

function Stage3KaraokeLine({
  word,
  charSlots,
  activeIndex,
  revealCount,
  slotKey,
}: {
  word: string;
  charSlots?: CharSlot[];
  activeIndex: number;
  revealCount?: number;
  slotKey: string;
}) {
  const upper = word.toUpperCase();
  const slots = charSlots ?? emptyCharSlots(word);
  const litThrough = revealCount ?? upper.length;
  const revealMode = !charSlots;
  const inputMode = !!charSlots;

  return (
    <div
      className={cn('stage3-karaoke', karaokeLenClass(word.length))}
      aria-label={upper}
    >
      {upper.split('').map((expected, ci) => {
        const slot = slots[ci] ?? { state: 'pending' as const };
        const revealed = ci < litThrough;
        const isPast = ci < activeIndex;
        const isHit =
          slot.state === 'correct' || (revealMode && revealed && ci < activeIndex);
        const isMiss =
          !inputMode && (slot.state === 'wrong' || (isPast && slot.state === 'pending'));
        const isActive = ci === activeIndex;
        const display = expected;

        return (
          <span
            key={`${slotKey}-${ci}`}
            className={cn(
              'stage3-karaoke__char',
              !revealed && 'stage3-karaoke__char--hidden',
              revealed &&
                !isHit &&
                !isMiss &&
                !isActive &&
                ci > activeIndex &&
                'stage3-karaoke__char--upcoming',
              isActive && 'stage3-karaoke__char--active',
              isHit && 'stage3-karaoke__char--hit',
              isMiss && 'stage3-karaoke__char--miss',
            )}
          >
            {revealed ? display : '·'}
          </span>
        );
      })}
    </div>
  );
}

function Stage3BossWordBubble({
  word,
  visibleCount,
  animKey,
  activeIndex = 0,
  fadeOut = false,
}: {
  word: string;
  visibleCount: number;
  animKey: string;
  activeIndex?: number;
  fadeOut?: boolean;
}) {
  const len = word.length;

  return (
    <div
      className={cn(
        'stage3-bubble stage3-bubble--boss',
        len > 8 && 'stage3-bubble--boss-wide',
        fadeOut && 'stage3-bubble--boss-fade-out',
      )}
    >
      <Stage3KaraokeLine
        word={word}
        activeIndex={activeIndex}
        revealCount={visibleCount}
        slotKey={`boss-${animKey}`}
      />
    </div>
  );
}

function Stage3DiscoWordLine({ word, slotKey }: { word: string; slotKey: string }) {
  const upper = word.toUpperCase();

  return (
    <div
      className={cn(
        'stage3-word-drop stage3-word-drop--input stage3-word-drop--disco',
        slabCharFontClass(word.length),
        monoton.className,
      )}
      aria-label={upper}
    >
      {upper.split('').map((ch, ci) => (
        <span key={`${slotKey}-disco-${ci}`} className="stage3-disco-char">
          {ch}
        </span>
      ))}
    </div>
  );
}

function Stage3InputWordBubble({
  word,
  charSlots,
  slotKey,
  slabEpoch,
  discoPerfect = false,
  showPerfectPop = false,
}: {
  word: string;
  charSlots: CharSlot[];
  slotKey: string;
  slabEpoch: number;
  discoPerfect?: boolean;
  showPerfectPop?: boolean;
}) {
  return (
    <div className="stage3-side-input-wrap">
      {showPerfectPop ? (
        <span className={cn(monoton.className, 'stage3-perfect-pop quiz-status-stroke-text')}>
          PERFECT!
        </span>
      ) : null}
      <div
        className={cn(
          'stage3-bubble stage3-bubble--input',
          word.length > 8 && 'stage3-bubble--input-wide',
          discoPerfect && 'stage3-bubble--input-disco-perfect',
        )}
      >
        {discoPerfect ? (
          <Stage3DiscoWordLine word={word} slotKey={slotKey} />
        ) : (
          <Stage3SlabWordLine
            word={word}
            charSlots={charSlots}
            slotKey={slotKey}
            slabEpoch={slabEpoch}
            inputSizing
          />
        )}
      </div>
    </div>
  );
}

function Stage3KeyButton({
  letter,
  hint,
  onPress,
  dropDelay = 0,
  pitchIndex = 0,
  playMountSound = false,
}: {
  letter: string;
  hint: string;
  onPress: () => void;
  dropDelay?: number;
  pitchIndex?: number;
  playMountSound?: boolean;
}) {
  const playedRef = useRef(false);

  return (
    <button type="button" className="stage3-key" onClick={onPress}>
      <span
        className="stage3-key-mount-slab"
        style={{ animationDelay: `${dropDelay}s` }}
        onAnimationStart={(e) => {
          if (!playMountSound || playedRef.current) return;
          if (e.animationName !== 'stage3-key-mount-drop') return;
          playedRef.current = true;
          playStage3SlabLand(pitchIndex);
        }}
      >
        <span className="stage3-key-letter">{letter.toUpperCase()}</span>
        <span className="stage3-key-hint">{hint}</span>
      </span>
    </button>
  );
}

function Stage3WasdKeypad({
  letters,
  onLetter,
  mountKey,
  visibleSlots = [true, true, true, true],
}: {
  letters: string[];
  onLetter: (letter: string) => void;
  mountKey: string;
  visibleSlots?: boolean[];
}) {
  const slot = (index: number) => {
    if (!visibleSlots[index]) {
      return <span className="stage3-keypad__spacer" aria-hidden />;
    }
    const letter = letters[index];
    if (!letter) return <span className="stage3-keypad__spacer" aria-hidden />;
    return (
      <Stage3KeyButton
        key={`${mountKey}-${index}-on`}
        letter={letter}
        hint={STAGE3_BOY_KEY_HINTS[index]!}
        onPress={() => onLetter(letter)}
        dropDelay={0}
        pitchIndex={index}
      />
    );
  };

  return (
    <div className="stage3-keypad stage3-keypad--wasd stage3-keypad--on-char">
      <div className="stage3-keypad__row">
        <span className="stage3-keypad__spacer" aria-hidden />
        {slot(0)}
        <span className="stage3-keypad__spacer" aria-hidden />
      </div>
      <div className="stage3-keypad__row">
        {slot(1)}
        {slot(2)}
        {slot(3)}
      </div>
    </div>
  );
}

function Stage3ArrowKeypad({
  letters,
  onLetter,
  mountKey,
  visibleSlots = [true, true, true, true],
}: {
  letters: string[];
  onLetter: (letter: string) => void;
  mountKey: string;
  visibleSlots?: boolean[];
}) {
  const slot = (index: number) => {
    if (!visibleSlots[index]) {
      return <span className="stage3-keypad__spacer" aria-hidden />;
    }
    const letter = letters[index];
    if (!letter) return <span className="stage3-keypad__spacer" aria-hidden />;
    return (
      <Stage3KeyButton
        key={`${mountKey}-${index}-on`}
        letter={letter}
        hint={STAGE3_GIRL_KEY_HINTS[index]!}
        onPress={() => onLetter(letter)}
        dropDelay={0}
        pitchIndex={index}
      />
    );
  };

  return (
    <div className="stage3-keypad stage3-keypad--arrows stage3-keypad--on-char">
      <div className="stage3-keypad__row">
        <span className="stage3-keypad__spacer" aria-hidden />
        {slot(0)}
        <span className="stage3-keypad__spacer" aria-hidden />
      </div>
      <div className="stage3-keypad__row">
        {slot(1)}
        {slot(2)}
        {slot(3)}
      </div>
    </div>
  );
}

export function Stage3DiscoSpellGame({ embedded, resume, onStageClear, onGameOver }: Props) {
  const [session] = useState<Stage3Session>(() => resume?.session ?? buildStage3Session());
  const [roundIndex, setRoundIndex] = useState(() => resume?.roundIndex ?? 0);
  const [phase, setPhase] = useState<Phase>('loading');
  const [charSlots, setCharSlots] = useState<CharSlot[]>([]);
  const [roundScores, setRoundScores] = useState<number[]>(() => resume?.roundScores ?? []);
  const [boyDancing, setBoyDancing] = useState(false);
  const [girlDancing, setGirlDancing] = useState(false);
  const [bossDancing, setBossDancing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [marqueeText, setMarqueeText] = useState<string>(STAGE3_MARQUEE_TEXT.opening);
  const [bossVisibleChars, setBossVisibleChars] = useState(0);
  const [bossHintFadeOut, setBossHintFadeOut] = useState(false);
  const [bossHintDismissed, setBossHintDismissed] = useState(false);
  const [beatPulse, setBeatPulse] = useState(0);
  const [roundBeatMode, setRoundBeatMode] = useState<RoundBeatMode>('reveal');
  const [typeBeatsRemaining, setTypeBeatsRemaining] = useState(0);
  const [inputSlabEpoch, setInputSlabEpoch] = useState(0);
  const [inputFlash, setInputFlash] = useState<{ kind: InputFlashKind; token: number } | null>(
    null,
  );
  const [inputCombo, setInputCombo] = useState(0);
  const [comboBump, setComboBump] = useState(0);
  const [wordPerfectFlash, setWordPerfectFlash] = useState(false);
  const [karaokeIndex, setKaraokeIndex] = useState(0);
  const [keySidesRevealed, setKeySidesRevealed] = useState<Stage3KeySidesRevealed>(
    STAGE3_KEY_SIDES_HIDDEN,
  );
  const [finalScoreResult, setFinalScoreResult] = useState<Stage3FinalScoreResult | null>(
    null,
  );
  const [protagonistMood, setProtagonistMood] = useState<ProtagonistMood>('idle');
  const [awardScoreRevealed, setAwardScoreRevealed] = useState(false);
  const [awardProtagonistSpotlight, setAwardProtagonistSpotlight] = useState(false);
  const [awardTvOff, setAwardTvOff] = useState(false);

  const phaseRef = useRef(phase);
  const pendingAwardResultRef = useRef<Stage3GameResult | null>(null);
  const awardHandoffDoneRef = useRef(false);
  const awardHandoffTimerRef = useRef<number | null>(null);
  const awardDrumRollCancelRef = useRef<(() => void) | null>(null);
  const awardRevealHandledRef = useRef(false);
  const runStatsRef = useRef<Stage3RunStats>(createEmptyStage3RunStats());
  const roundIndexRef = useRef(roundIndex);
  const charSlotsRef = useRef(charSlots);
  const roundScoresRef = useRef(roundScores);
  const sessionRef = useRef(session);
  const phaseTimerRef = useRef<number | null>(null);
  const feedbackTimerRef = useRef<number | null>(null);
  const perfectTimerRef = useRef<number | null>(null);
  const wordPerfectPendingRef = useRef(false);
  const inputComboRef = useRef(0);
  const beatScheduleCancelRef = useRef<(() => void) | null>(null);
  const roundRhythmTokenRef = useRef(0);
  const karaokeIndexRef = useRef(0);
  const currentLayoutRef = useRef<Stage3KeyLayout | null>(null);
  const currentModeRef = useRef<Stage3InputMode>('boy');
  const currentWordRef = useRef('');
  const roundBeatModeRef = useRef<RoundBeatMode>(roundBeatMode);
  const roundFinishedRef = useRef(false);
  const perfectRecordedRoundRef = useRef(-1);

  phaseRef.current = phase;
  roundBeatModeRef.current = roundBeatMode;
  roundIndexRef.current = roundIndex;
  charSlotsRef.current = charSlots;
  roundScoresRef.current = roundScores;
  sessionRef.current = session;

  const currentRound: Stage3RoundSpec | undefined = session.rounds[roundIndex];
  const currentWord = currentRound?.word ?? '';
  const boyLetters = currentRound?.keyLayout.boyKeys ?? [];
  const girlLetters = currentRound?.keyLayout.girlKeys ?? [];
  const bossBonusLetter = currentRound?.keyLayout.bossLetter?.toUpperCase() ?? null;

  const keyVisibility = useMemo(
    () => computeStage3KeyVisibilityFromSides(keySidesRevealed),
    [keySidesRevealed],
  );

  const clearPhaseTimer = useCallback(() => {
    if (phaseTimerRef.current) {
      clearTimeout(phaseTimerRef.current);
      phaseTimerRef.current = null;
    }
  }, []);

  const clearAwardHandoffTimer = useCallback(() => {
    if (awardHandoffTimerRef.current) {
      clearTimeout(awardHandoffTimerRef.current);
      awardHandoffTimerRef.current = null;
    }
  }, []);

  const clearRhythmTimer = useCallback(() => {
    if (beatScheduleCancelRef.current) {
      beatScheduleCancelRef.current();
      beatScheduleCancelRef.current = null;
    }
  }, []);

  const clearInputFeedback = useCallback(() => {
    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = null;
    }
    setInputFlash(null);
  }, []);

  const resetInputCombo = useCallback(() => {
    inputComboRef.current = 0;
    setInputCombo(0);
    setComboBump(0);
  }, []);

  const clearWordPerfect = useCallback(() => {
    if (perfectTimerRef.current) {
      clearTimeout(perfectTimerRef.current);
      perfectTimerRef.current = null;
    }
    wordPerfectPendingRef.current = false;
    setWordPerfectFlash(false);
  }, []);

  const recordPerfectForCurrentRound = useCallback(() => {
    const ri = roundIndexRef.current;
    if (perfectRecordedRoundRef.current === ri) return;
    perfectRecordedRoundRef.current = ri;
    recordStage3Perfect(runStatsRef.current, ri);
  }, []);

  const triggerWordPerfect = useCallback(() => {
    if (wordPerfectPendingRef.current) return;
    wordPerfectPendingRef.current = true;
    recordPerfectForCurrentRound();
    clearRhythmTimer();
    setTypeBeatsRemaining(0);
    setWordPerfectFlash(true);
    playStage3Perfect();
    if (perfectTimerRef.current) {
      clearTimeout(perfectTimerRef.current);
    }
    perfectTimerRef.current = window.setTimeout(() => {
      clearWordPerfect();
      finishRoundPlayRef.current();
    }, STAGE3_WORD_PERFECT_MS);
  }, [clearRhythmTimer, clearWordPerfect, recordPerfectForCurrentRound]);

  const flashInputResult = useCallback((kind: InputFlashKind) => {
    setInputFlash({ kind, token: Date.now() });
    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current);
    }
    feedbackTimerRef.current = window.setTimeout(() => {
      setInputFlash(null);
      feedbackTimerRef.current = null;
    }, STAGE3_INPUT_FEEDBACK_MS);
  }, []);

  const pulseBeat = useCallback(() => {
    setBeatPulse((n) => n + 1);
    setBoyDancing(stage3ModeUsesBoy(currentModeRef.current));
    setGirlDancing(stage3ModeUsesGirl(currentModeRef.current));
    setBossDancing(true);
    window.setTimeout(() => {
      setBoyDancing(false);
      setGirlDancing(false);
      setBossDancing(false);
    }, STAGE3_BEAT_MS * 0.45);
  }, []);

  const finishAwardCeremony = useCallback(
    (result: Stage3GameResult) => {
      if (awardHandoffDoneRef.current) return;
      awardHandoffDoneRef.current = true;
      clearAwardHandoffTimer();
      awardDrumRollCancelRef.current?.();
      awardDrumRollCancelRef.current = null;
      stopStage3AwardDrumRoll();
      pendingAwardResultRef.current = null;
      if (result.passed) onStageClear(result);
      else onGameOver(result);
    },
    [clearAwardHandoffTimer, onStageClear, onGameOver],
  );

  const handleAwardScoreReveal = useCallback(() => {
    if (awardRevealHandledRef.current) return;
    const result = pendingAwardResultRef.current;
    if (!result) return;
    awardRevealHandledRef.current = true;

    playStage3AwardScoreRevealHit();
    setAwardScoreRevealed(true);
    setProtagonistMood(result.passed ? 'happy' : 'sad');
    if (result.passed) setAwardProtagonistSpotlight(true);

    clearAwardHandoffTimer();
    awardHandoffTimerRef.current = window.setTimeout(() => {
      setAwardTvOff(true);
      awardHandoffTimerRef.current = window.setTimeout(() => {
        finishAwardCeremony(result);
      }, STAGE3_AWARD_TV_OFF_MS);
    }, STAGE3_AWARD_REACTION_MS);
  }, [clearAwardHandoffTimer, finishAwardCeremony]);

  const handleAwardTvOffAnimationEnd = useCallback(
    (e: AnimationEvent<HTMLDivElement>) => {
      if (e.animationName !== 'stage3-tv-collapse') return;
      const result = pendingAwardResultRef.current;
      if (!result || !awardTvOff) return;
      finishAwardCeremony(result);
    },
    [awardTvOff, finishAwardCeremony],
  );

  const finishGame = useCallback(
    (scores: number[]) => {
      syncStage3PerfectCountFromRounds(
        runStatsRef.current,
        sessionRef.current.rounds,
        scores,
      );
      const scoreResult = computeStage3FinalScore(runStatsRef.current);
      const result: Stage3GameResult = {
        ...scoreResult,
        session: sessionRef.current,
        roundScores: scores,
        totalCorrectLetters: scores.reduce((a, b) => a + b, 0),
      };
      resetInputCombo();
      awardRevealHandledRef.current = false;
      awardHandoffDoneRef.current = false;
      pendingAwardResultRef.current = result;
      setFinalScoreResult(scoreResult);
      setProtagonistMood('idle');
      setAwardScoreRevealed(false);
      setAwardProtagonistSpotlight(false);
      setAwardTvOff(false);
      setPhase('award-ceremony');
      awardDrumRollCancelRef.current?.();
      awardDrumRollCancelRef.current = startStage3AwardDrumRoll();
    },
    [resetInputCombo],
  );

  const advanceAfterRound = useCallback(
    (score: number) => {
      const wordLen = currentWordRef.current.length;
      if (isStage3RoundPerfect(score, wordLen)) {
        recordPerfectForCurrentRound();
      }
      const nextScores = [...roundScoresRef.current, score];
      setRoundScores(nextScores);
      roundScoresRef.current = nextScores;

      const nextRound = roundIndexRef.current + 1;
      if (nextRound >= STAGE3_TOTAL_ROUNDS) {
        finishGame(nextScores);
        return;
      }

      setRoundIndex(nextRound);
      setBossVisibleChars(0);
      setBossHintFadeOut(false);
      setBossHintDismissed(false);
      setRoundBeatMode('reveal');
      roundBeatModeRef.current = 'reveal';
      setTypeBeatsRemaining(0);
      setInputSlabEpoch(0);
      clearInputFeedback();
      clearWordPerfect();
      setKaraokeIndex(0);
      setKeySidesRevealed(STAGE3_KEY_SIDES_HIDDEN);
      roundFinishedRef.current = false;
      if (nextRound === STAGE3_FEVER_MARQUEE_ROUND_INDEX) {
        setMarqueeText(STAGE3_MARQUEE_TEXT.feverTime);
        setPhase('marquee');
      } else {
        setPhase('boss-announce');
      }
    },
    [finishGame, clearInputFeedback, clearWordPerfect, recordPerfectForCurrentRound],
  );

  const finishRoundPlay = useCallback(() => {
    if (phaseRef.current !== 'round-play' || roundFinishedRef.current) return;
    roundFinishedRef.current = true;
    const slots = charSlotsRef.current;
    const wordLen = currentWordRef.current.length;
    clearWordPerfect();
    clearRhythmTimer();
    setTypeBeatsRemaining(0);
    const score = scoreStage3Round(slots.map((s) => s.state));
    if (isStage3RoundPerfect(score, wordLen)) {
      recordPerfectForCurrentRound();
    }
    advanceAfterRound(score);
  }, [advanceAfterRound, clearRhythmTimer, clearWordPerfect, recordPerfectForCurrentRound]);

  const pulseBeatRef = useRef(pulseBeat);
  const finishRoundPlayRef = useRef(finishRoundPlay);
  const clearRhythmTimerRef = useRef(clearRhythmTimer);
  const triggerWordPerfectRef = useRef(triggerWordPerfect);
  pulseBeatRef.current = pulseBeat;
  finishRoundPlayRef.current = finishRoundPlay;
  clearRhythmTimerRef.current = clearRhythmTimer;
  triggerWordPerfectRef.current = triggerWordPerfect;

  const handleLetter = useCallback(
    (letter: string) => {
      if (phaseRef.current !== 'round-play' || roundBeatModeRef.current !== 'type') {
        return;
      }
      if (wordPerfectPendingRef.current) return;
      const word = currentWordRef.current;
      let idx = 0;
      while (idx < word.length && charSlotsRef.current[idx]?.state === 'correct') {
        idx += 1;
      }
      if (idx >= word.length) return;

      const expected = word[idx]?.toLowerCase();
      if (!expected) return;

      const ch = letter.toLowerCase();
      if (ch === expected) {
        inputComboRef.current += 1;
        const combo = inputComboRef.current;
        recordStage3CorrectKeystroke(runStatsRef.current, roundIndexRef.current, combo);
        setInputCombo(combo);
        setComboBump((n) => n + 1);
        const nextIdx = idx + 1;
        const wordComplete = nextIdx >= word.length;
        if (!wordComplete) {
          flashInputResult('great');
          playStage3Great();
          if (combo >= STAGE3_COMBO_MIN_HITS) {
            playStage3ComboHit(combo);
          }
        }
        const next = [...charSlotsRef.current];
        next[idx] = { state: 'correct', letter: ch };
        charSlotsRef.current = next;
        setCharSlots(next);
        setKaraokeIndex(nextIdx < word.length ? nextIdx : idx);
        karaokeIndexRef.current = nextIdx < word.length ? nextIdx : idx;
        if (wordComplete) {
          triggerWordPerfectRef.current();
        }
        return;
      }

      flashInputResult('miss');
      playStage3Miss();
      resetInputCombo();
      const reset = emptyCharSlots(word);
      charSlotsRef.current = reset;
      setCharSlots(reset);
      setKaraokeIndex(0);
      karaokeIndexRef.current = 0;
      setInputSlabEpoch((n) => n + 1);
    },
    [flashInputResult, resetInputCombo],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (phaseRef.current !== 'round-play' || roundBeatModeRef.current !== 'type') {
        return;
      }
      if (wordPerfectPendingRef.current) return;
      if (e.repeat) return;

      const mode = currentModeRef.current;
      const layout = currentLayoutRef.current;
      if (!layout) return;

      const boyActive = stage3ModeUsesBoy(mode);
      const girlActive = stage3ModeUsesGirl(mode);
      const bossActive = stage3ModeUsesBoss(mode) && !!layout.bossLetter;

      if (isStage3GameKey(e.key, { boyActive, girlActive, bossBonusActive: bossActive })) {
        e.preventDefault();
      }

      let letter: string | null = null;
      if (boyActive) {
        const idx = stage3BoyKeyIndex(e.key);
        if (idx !== null) letter = resolveStage3KeyLetter(layout, { boyKeyIndex: idx });
      }
      if (!letter && girlActive) {
        const idx = stage3GirlKeyIndex(e.key);
        if (idx !== null) letter = resolveStage3KeyLetter(layout, { girlKeyIndex: idx });
      }
      if (!letter && bossActive && e.key === STAGE3_BOSS_BONUS_KEY) {
        letter = resolveStage3KeyLetter(layout, { boss: true });
      }
      if (letter) handleLetter(letter);
    },
    [handleLetter],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [handleKeyDown]);

  const beginOpeningMarquee = useCallback(() => {
    setMarqueeText(STAGE3_MARQUEE_TEXT.opening);
    setPhase('marquee');
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      ensureQuizAudio();
      await Promise.all(Object.values(STAGE3_ASSETS).map(preloadImage));
      if (cancelled) return;

      if (resume) {
        runStatsRef.current = { ...resume.runStats };
        setRoundScores(resume.roundScores);
        roundScoresRef.current = resume.roundScores;
        setRoundIndex(resume.roundIndex);
        roundIndexRef.current = resume.roundIndex;
        perfectRecordedRoundRef.current = resume.roundIndex - 1;
        if (resume.roundIndex === STAGE3_FEVER_MARQUEE_ROUND_INDEX) {
          setMarqueeText(STAGE3_MARQUEE_TEXT.feverTime);
          setPhase('marquee');
        } else {
          setPhase('boss-announce');
        }
        return;
      }

      beginOpeningMarquee();
    })().catch(() => {
      if (!cancelled) setLoadError('無法載入 Stage 3 資源');
    });
    return () => {
      cancelled = true;
      clearPhaseTimer();
      clearAwardHandoffTimer();
      clearRhythmTimer();
      clearInputFeedback();
      clearWordPerfect();
      stopStage3LetsDanceMusic();
    };
  }, [
    beginOpeningMarquee,
    clearPhaseTimer,
    clearAwardHandoffTimer,
    clearRhythmTimer,
    clearInputFeedback,
    clearWordPerfect,
    resume,
  ]);

  /** 頒獎轉場計時器若被回合清掉，仍會在總時長後交棒給結算 */
  useEffect(() => {
    if (phase !== 'award-ceremony') return;
    const result = pendingAwardResultRef.current;
    if (!result) return;

    const failsafe = window.setTimeout(() => {
      if (phaseRef.current !== 'award-ceremony') return;
      finishAwardCeremony(result);
    }, STAGE3_AWARD_CEREMONY_MS + 500);

    return () => clearTimeout(failsafe);
  }, [phase, finishAwardCeremony]);

  useEffect(() => {
    if (phase !== 'marquee') return;
    clearRhythmTimer();
    const cancel = scheduleStage3Beats(4, (beatIndex) => {
      pulseBeatRef.current();
      if (beatIndex >= 3) {
        setPhase('boss-announce');
      }
    });
    return cancel;
  }, [phase, marqueeText, clearRhythmTimer]);

  useEffect(() => {
    if (phase === 'loading') return;
    if (phase === 'award-ceremony') {
      stopStage3LetsDanceMusic();
      return;
    }
    void startStage3LetsDanceMusic();
  }, [phase]);

  useEffect(() => {
    if (phase === 'award-ceremony') return;
    clearAwardHandoffTimer();
    awardDrumRollCancelRef.current?.();
    awardDrumRollCancelRef.current = null;
    stopStage3AwardDrumRoll();
    awardRevealHandledRef.current = false;
    awardHandoffDoneRef.current = false;
    setAwardScoreRevealed(false);
    setAwardProtagonistSpotlight(false);
    setAwardTvOff(false);
    pendingAwardResultRef.current = null;
  }, [phase, clearAwardHandoffTimer]);

  useEffect(() => {
    if (phase !== 'boss-announce' || !currentRound) return;
    clearPhaseTimer();
    clearRhythmTimer();
    setBossVisibleChars(0);
    currentWordRef.current = currentRound.word;
    currentLayoutRef.current = currentRound.keyLayout;
    currentModeRef.current = currentRound.inputMode;
    const cancel = scheduleStage3Beats(1, () => {
      pulseBeatRef.current();
      setPhase('round-play');
    });
    return () => {
      cancel();
      clearPhaseTimer();
    };
  }, [phase, roundIndex, currentRound, clearPhaseTimer, clearRhythmTimer]);

  useEffect(() => {
    if (phase !== 'round-play' || !currentRound) return;

    clearRhythmTimerRef.current();
    const token = roundRhythmTokenRef.current + 1;
    roundRhythmTokenRef.current = token;

    const word = currentRound.word;
    currentWordRef.current = word;
    currentLayoutRef.current = currentRound.keyLayout;
    currentModeRef.current = currentRound.inputMode;

    roundFinishedRef.current = false;
    setRoundBeatMode('reveal');
    roundBeatModeRef.current = 'reveal';
    setTypeBeatsRemaining(0);
    setInputSlabEpoch(0);
    clearInputFeedback();
    clearWordPerfect();
    setBossVisibleChars(0);
    setKaraokeIndex(0);
    karaokeIndexRef.current = 0;
    setKeySidesRevealed(STAGE3_KEY_SIDES_HIDDEN);
    const slots = emptyCharSlots(word);
    charSlotsRef.current = slots;
    setCharSlots(slots);

    const keySequence = buildStage3KeyRevealSequence(currentRound.inputMode);
    let keyRevealIndex = 0;
    let rhythmPhase: 'keys' | 'reveal' | 'type' =
      keySequence.length > 0 ? 'keys' : 'reveal';
    let charIndex = 0;
    let typeBeatsLeft = 0;

    const revealKeySide = (side: (typeof keySequence)[number]) => {
      setKeySidesRevealed((prev) => ({ ...prev, [side]: true }));
    };

    beatScheduleCancelRef.current = runStage3QuarterBeatLoop(() => {
      if (roundRhythmTokenRef.current !== token || phaseRef.current !== 'round-play') {
        return false;
      }

      pulseBeatRef.current();

      if (rhythmPhase === 'keys') {
        const side = keySequence[keyRevealIndex]!;
        revealKeySide(side);
        playStage3SlabLand(keyRevealIndex);
        keyRevealIndex += 1;
        if (keyRevealIndex >= keySequence.length) {
          rhythmPhase = 'reveal';
          charIndex = 0;
        }
        return true;
      }

      if (rhythmPhase === 'reveal') {
        const visible = charIndex + 1;
        const activeKaraoke = charIndex;
        setBossVisibleChars(visible);
        setKaraokeIndex(activeKaraoke);
        karaokeIndexRef.current = activeKaraoke;
        playStage3SlabLand(activeKaraoke);

        charIndex += 1;
        if (charIndex >= word.length) {
          rhythmPhase = 'type';
          typeBeatsLeft = word.length;
          roundBeatModeRef.current = 'type';
          setRoundBeatMode('type');
          setTypeBeatsRemaining(typeBeatsLeft);
          setBossVisibleChars(word.length);
        }
        return true;
      }

      setBossVisibleChars(word.length);
      if (typeBeatsLeft <= 0) {
        finishRoundPlayRef.current();
        return false;
      }
      typeBeatsLeft -= 1;
      setTypeBeatsRemaining(typeBeatsLeft);
      if (typeBeatsLeft <= 0) {
        finishRoundPlayRef.current();
        return false;
      }
      return true;
    });

    return () => {
      roundRhythmTokenRef.current += 1;
      clearRhythmTimerRef.current();
    };
  }, [phase, roundIndex, currentRound, clearInputFeedback, clearWordPerfect]);

  const inputSlotKey = `${roundIndex}`;

  if (loadError) {
    return (
      <div className="stage3-root stage3-root--error">
        <p>{loadError}</p>
      </div>
    );
  }

  const showBoyKeypad =
    phase === 'round-play' &&
    currentRound &&
    stage3ModeUsesBoy(currentRound.inputMode) &&
    keySidesRevealed.boy;
  const showGirlKeypad =
    phase === 'round-play' &&
    currentRound &&
    stage3ModeUsesGirl(currentRound.inputMode) &&
    keySidesRevealed.girl;
  const showSideInputBubble =
    phase === 'round-play' && roundBeatMode === 'type' && !!currentRound;
  const showBossBonusKey =
    phase === 'round-play' &&
    !!currentRound &&
    stage3ModeUsesBoss(currentRound.inputMode) &&
    keyVisibility.boss &&
    !!bossBonusLetter;
  const showBossWordBubble =
    !!currentRound &&
    (phase === 'boss-announce' || (phase === 'round-play' && !bossHintDismissed));
  const protagonistCelebrate = protagonistMood === 'happy';
  const protagonistDisappointed = protagonistMood === 'sad';
  const comboTier = stage3ComboTier(inputCombo);
  const showComboHud =
    inputCombo >= STAGE3_COMBO_MIN_HITS &&
    phase !== 'loading' &&
    phase !== 'award-ceremony';
  const isFeverMarquee =
    phase === 'marquee' && marqueeText === STAGE3_MARQUEE_TEXT.feverTime;
  const isFeverActive =
    (phase !== 'loading' &&
      phase !== 'award-ceremony' &&
      isStage3FeverRound(roundIndex)) ||
    isFeverMarquee;

  return (
    <div
      className={cn(
        fredoka.className,
        'stage3-root',
        embedded && 'stage3-root--embedded',
        awardTvOff && 'stage3-root--tv-off',
      )}
      data-stage3-disco-game
      style={{
        ['--stage3-bg-url' as string]: `url("${STAGE3_ASSETS.discoBg}")`,
        ['--stage3-beat-ms' as string]: `${STAGE3_BEAT_MS}ms`,
        ['--stage3-perfect-ms' as string]: `${STAGE3_WORD_PERFECT_MS}ms`,
        ['--stage3-tv-off-ms' as string]: `${STAGE3_AWARD_TV_OFF_MS}ms`,
      }}
    >
      <div
        className={cn(
          'stage3-scene',
          (bossDancing || boyDancing || girlDancing || phase === 'marquee' || beatPulse > 0) &&
            'stage3-scene--disco-pulse',
          showComboHud && comboTier >= 4 && 'stage3-scene--combo-blaze',
          showComboHud && comboTier >= 5 && 'stage3-scene--combo-max',
          isFeverActive && 'stage3-scene--fever',
          awardProtagonistSpotlight && 'stage3-scene--award-spotlight',
          awardTvOff && 'stage3-scene--tv-shutting',
        )}
        onAnimationEnd={handleAwardTvOffAnimationEnd}
      >
        <Stage3DiscoBackdrop />

        {awardProtagonistSpotlight ? (
          <>
            <div className="stage3-award-spotlight stage3-award-spotlight--boy" aria-hidden />
            <div className="stage3-award-spotlight stage3-award-spotlight--girl" aria-hidden />
          </>
        ) : null}

        {awardTvOff ? <div className="stage3-tv-off-flash" aria-hidden /> : null}

        {phase !== 'loading' && phase !== 'marquee' ? (
          <div
            className={cn(
              fredoka.className,
              'stage3-round-badge quiz-status-stroke-text',
              isFeverActive && 'stage3-round-badge--fever',
            )}
          >
            {isFeverActive ? (
              <span className="stage3-round-badge__fever-tag">FEVER</span>
            ) : null}
            ROUND {Math.min(roundIndex + 1, STAGE3_TOTAL_ROUNDS)}/{STAGE3_TOTAL_ROUNDS}
          </div>
        ) : null}

        {phase === 'round-play' && roundBeatMode === 'type' && typeBeatsRemaining > 0 ? (
          <div
            className={cn(
              fredoka.className,
              'stage3-round-timer quiz-status-stroke-text',
              typeBeatsRemaining <= 2 && 'stage3-round-timer--urgent',
            )}
            aria-live="polite"
            aria-label={`剩餘 ${typeBeatsRemaining} 拍`}
          >
            {typeBeatsRemaining}
          </div>
        ) : null}

        {showComboHud ? (
          <div
            className={cn(
              'stage3-combo-hud',
              `stage3-combo-hud--tier-${comboTier}`,
            )}
            aria-live="polite"
            aria-label={`${inputCombo} hit combo`}
          >
            <span key={comboBump} className="stage3-combo-hud__count quiz-status-stroke-text">
              {inputCombo}
            </span>
            <span className={cn(monoton.className, 'stage3-combo-hud__label quiz-status-stroke-text')}>
              HIT COMBO
            </span>
          </div>
        ) : null}

        {phase === 'round-play' && roundBeatMode === 'type' && inputFlash ? (
          <div className="stage3-feedback-overlay" aria-live="polite">
            <div className="stage3-input-feedback-stack">
              <span
                key={inputFlash.token}
                className={cn(
                  fredoka.className,
                  'stage3-feedback-text stage3-input-feedback-pop quiz-status-stroke-text',
                  inputFlash.kind === 'great'
                    ? 'stage3-feedback-text--great'
                    : 'stage3-feedback-text--fail',
                )}
              >
                {inputFlash.kind === 'great' ? 'GREAT' : 'MISS'}
              </span>
            </div>
          </div>
        ) : null}

        {phase === 'marquee' ? (
          <div
            className={cn(
              'stage3-lets-dance-overlay',
              isFeverMarquee && 'stage3-lets-dance-overlay--fever',
            )}
            aria-live="polite"
            style={{ ['--stage3-lets-dance-ms' as string]: `${STAGE3_MARQUEE_MS}ms` }}
          >
            {isFeverMarquee ? <div className="stage3-fever-marquee-bursts" aria-hidden /> : null}
            <p
              className={cn(
                monoton.className,
                'stage3-lets-dance-text',
                isFeverMarquee && 'stage3-lets-dance-text--fever',
              )}
            >
              {marqueeText}
            </p>
          </div>
        ) : null}

        <div className={cn('stage3-char stage3-char--boss', bossDancing && 'stage3-char--dancing')}>
          {showBossWordBubble ? (
            <Stage3BossWordBubble
              word={currentRound!.word}
              visibleCount={bossVisibleChars}
              activeIndex={karaokeIndex}
              fadeOut={bossHintFadeOut}
              animKey={`${roundIndex}-${roundBeatMode}`}
            />
          ) : null}
          <div className="stage3-char-img-wrap stage3-char-img-wrap--boss">
            {showBossBonusKey ? (
              <button
                type="button"
                className="stage3-key stage3-key--boss stage3-key--on-char"
                onClick={() => {
                  if (phase !== 'round-play' || roundBeatModeRef.current !== 'type') return;
                  const letter = currentRound!.keyLayout.bossLetter;
                  if (letter) handleLetter(letter);
                }}
              >
                <span className="stage3-key-mount-slab">
                  <span className="stage3-key-letter">{bossBonusLetter}</span>
                  <span className="stage3-key-hint">SPACE</span>
                </span>
              </button>
            ) : null}
            <Image
              src={STAGE3_ASSETS.danceBoss}
              alt=""
              width={1120}
              height={1440}
              className="stage3-char-img"
              priority
            />
          </div>
        </div>

        <div
          className={cn(
            'stage3-char stage3-char--boy',
            boyDancing && 'stage3-char--dancing',
            protagonistCelebrate && 'stage3-char--celebrate',
            protagonistDisappointed && 'stage3-char--disappointed',
            awardProtagonistSpotlight && 'stage3-char--award-lit',
          )}
        >
          {showSideInputBubble && stage3ModeUsesBoy(currentRound!.inputMode) ? (
            <Stage3InputWordBubble
              word={currentRound!.word}
              charSlots={charSlots}
              slotKey={`boy-${inputSlotKey}`}
              slabEpoch={inputSlabEpoch}
              discoPerfect={wordPerfectFlash}
              showPerfectPop={wordPerfectFlash}
            />
          ) : null}
          <div className="stage3-char-img-wrap stage3-char-img-wrap--side">
            {showBoyKeypad ? (
              <Stage3WasdKeypad
                letters={boyLetters}
                onLetter={handleLetter}
                mountKey={`boy-kb-${inputSlotKey}`}
                visibleSlots={keyVisibility.boy}
              />
            ) : null}
            <Image
              src={STAGE3_ASSETS.danceBoy}
              alt=""
              width={800}
              height={1280}
              className="stage3-char-img"
            />
          </div>
        </div>

        <div
          className={cn(
            'stage3-char stage3-char--girl',
            girlDancing && 'stage3-char--dancing',
            protagonistCelebrate && 'stage3-char--celebrate',
            protagonistDisappointed && 'stage3-char--disappointed',
            awardProtagonistSpotlight && 'stage3-char--award-lit',
          )}
        >
          {showSideInputBubble && stage3ModeUsesGirl(currentRound!.inputMode) ? (
            <Stage3InputWordBubble
              word={currentRound!.word}
              charSlots={charSlots}
              slotKey={`girl-${inputSlotKey}`}
              slabEpoch={inputSlabEpoch}
              discoPerfect={wordPerfectFlash}
              showPerfectPop={wordPerfectFlash}
            />
          ) : null}
          <div className="stage3-char-img-wrap stage3-char-img-wrap--side">
            {showGirlKeypad ? (
              <Stage3ArrowKeypad
                letters={girlLetters}
                onLetter={handleLetter}
                mountKey={`girl-kb-${inputSlotKey}`}
                visibleSlots={keyVisibility.girl}
              />
            ) : null}
            <Image
              src={STAGE3_ASSETS.danceGirl}
              alt=""
              width={800}
              height={1280}
              className="stage3-char-img"
            />
          </div>
        </div>

        {phase === 'award-ceremony' && finalScoreResult ? (
          <Stage3AwardCeremony
            score100={finalScoreResult.score100}
            onScoreReveal={handleAwardScoreReveal}
          />
        ) : null}
      </div>
    </div>
  );
}
