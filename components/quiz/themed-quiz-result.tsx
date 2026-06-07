'use client';

import { useEffect, useMemo, useState } from 'react';

import { Fredoka } from 'next/font/google';
import { Check, ChevronRight, RotateCcw, Sparkles, Trophy, Volume2, X } from 'lucide-react';

import '@/app/quiz-play-themes.css';
import '@/app/stage2-scene.css';
import '@/app/stage3-disco.css';

import { QuizForestAtmosphere } from '@/components/quiz/quiz-forest-atmosphere';
import { Stage2SceneBackdrop } from '@/components/stage2/stage2-scene-backdrop';
import { Stage3DiscoBackdrop } from '@/components/stage3/stage3-disco-backdrop';
import { QuizProgressStar } from '@/components/quiz/quiz-progress-star';
import { GameStaminaCost } from '@/components/games/game-stamina-cost';
import {
  GAME_STAMINA_COST_CONTINUE,
  GAME_STAMINA_COST_RETRY,
} from '@/lib/game/stamina';
import { getQuizThemeRootStyle } from '@/lib/games/quiz-theme-css-vars';
import { DEFAULT_QUIZ_VISUAL_THEME, QUIZ_VISUAL_THEMES } from '@/lib/games/quiz-visual-themes';
import { getQuizStageRemarkOutcome } from '@/lib/quiz/constants';
import type { EditorRemark } from '@/lib/quiz/editor-personality';
import type { QuizScoreBreakdown } from '@/lib/quiz/score-formula';
import { STAGE2_MAX_HEARTS } from '@/lib/stage2/constants';
import { STAGE2_MODE_LABEL } from '@/lib/stage2/stage2-messages';
import type { Stage2SessionWord } from '@/lib/stage2/session-word';
import { STAGE3_ASSETS, STAGE3_PASS_MIN_SCORE100 } from '@/lib/stage3/constants';
import { cn } from '@/lib/utils';

const fredoka = Fredoka({
  subsets: ['latin'],
  weight: ['600', '700'],
  display: 'swap',
});

function formatSecondsShort(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '—';
  return `${sec.toFixed(1)} 秒／題`;
}

type Stage2ReviewEntry = {
  word: Stage2SessionWord;
  outcome: boolean;
};

type Stage3ReviewEntry = {
  word: string;
  outcome: boolean;
};

function normalizeStage2ReviewEntries(
  words: Stage2SessionWord[],
  outcomes: boolean[],
): Stage2ReviewEntry[] {
  const seen = new Set<string>();
  const out: Stage2ReviewEntry[] = [];
  for (const [index, entry] of words.entries()) {
    const key = entry.word.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({ word: entry, outcome: outcomes[index] === true });
  }
  return out;
}

function speakEnglishWord(word: string): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  const text = word.trim();
  if (!text) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = 0.88;
  utterance.pitch = 1.02;
  synth.speak(utterance);
}

function normalizeStage3ReviewEntries(
  words: string[],
  outcomes: boolean[],
): Stage3ReviewEntry[] {
  const seen = new Set<string>();
  const out: Stage3ReviewEntry[] = [];
  for (const [index, rawWord] of words.entries()) {
    const key = rawWord.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({
      word: rawWord,
      outcome: outcomes[index] === true,
    });
  }
  return out;
}

type RecordOutcome = {
  ok: boolean;
  loggedIn?: boolean;
  newRank?: number;
  totalPlayers?: number;
  rankDelta?: number | null;
  previousBest?: number;
  newBest?: number;
  xpEarned?: number;
  newExp?: number;
  newLevel?: number;
};

export type ThemedQuizResultProps = {
  embedded?: boolean;
  stagePassed: boolean;
  fullMark?: boolean;
  stageLabel: string;
  total: number;
  starsCorrect: boolean[];
  animatedCorrectTotal: number;
  animatedScore100: number;
  resultBreakdown: QuizScoreBreakdown | null;
  avgDifficultyLabel: string;
  editorRemark: EditorRemark | null;
  isAdmin: boolean;
  userId: string | null;
  syncingScore: boolean;
  recordOutcome: RecordOutcome | null;
  recordError: string | null;
  playAgainLabel: string;
  playAgainMode?: 'replay' | 'next';
  onPlayAgain: () => void;
  /** Stage 2 影分身術 / Stage 3 迪斯可結果版面 */
  variant?: 'quiz' | 'stage2-clone' | 'stage3-disco';
  stage2HeartsLeft?: number;
  stage2ReviewWords?: Stage2SessionWord[];
  stage2ReviewOutcomes?: boolean[];
  stage3ReviewWords?: string[];
  stage3ReviewOutcomes?: boolean[];
  /** Stage 2 失敗：續關（3 點）／再玩（1 點）；Stage 3 失敗：續關（3 點，STAGE 3 重頭）／重玩（1 點，STAGE 1 重頭） */
  stageFailOptions?: {
    onContinue: () => void;
    onRetry: () => void;
  };
  staminaNotice?: string | null;
  staminaActionPending?: boolean;
};

export function ThemedQuizResult({
  embedded = false,
  stagePassed,
  fullMark = false,
  stageLabel,
  total,
  starsCorrect,
  animatedCorrectTotal,
  animatedScore100,
  resultBreakdown,
  avgDifficultyLabel,
  editorRemark,
  isAdmin,
  userId,
  syncingScore,
  recordOutcome,
  recordError,
  playAgainLabel,
  playAgainMode = 'replay',
  onPlayAgain,
  variant = 'quiz',
  stage2HeartsLeft = 0,
  stage2ReviewWords = [],
  stage2ReviewOutcomes = [],
  stage3ReviewWords = [],
  stage3ReviewOutcomes = [],
  stageFailOptions,
  staminaNotice,
  staminaActionPending = false,
}: ThemedQuizResultProps) {
  const isStage2 = variant === 'stage2-clone';
  const isStage3 = variant === 'stage3-disco';
  const useForestBg = !isStage2 && !isStage3;
  const themeId = DEFAULT_QUIZ_VISUAL_THEME;
  const theme = QUIZ_VISUAL_THEMES[themeId];
  const themeStyle = getQuizThemeRootStyle(themeId);
  const score100 = resultBreakdown?.score100 ?? 0;
  const stageRemarkOutcome = getQuizStageRemarkOutcome(score100);
  const remarkTone =
    stageRemarkOutcome === 'pass'
      ? 'high'
      : stageRemarkOutcome === 'near_pass'
        ? 'mid'
        : score100 <= 35
          ? 'low'
          : 'mid';
  const showSyncStats =
    Boolean(userId) && Boolean(recordOutcome?.ok && recordOutcome.loggedIn && !syncingScore);
  const stageLabelNoWrap = stageLabel.startsWith('STAGE ')
    ? stageLabel.replace('STAGE ', 'STAGE\u00A0')
    : stageLabel;

  const reviewWords = useMemo(
    () =>
      normalizeStage2ReviewEntries(stage2ReviewWords, stage2ReviewOutcomes).slice(
        0,
        Math.max(0, stage2ReviewOutcomes.length),
      ),
    [stage2ReviewWords, stage2ReviewOutcomes],
  );
  const stage3ReviewWordsNormalized = useMemo(
    () =>
      normalizeStage3ReviewEntries(stage3ReviewWords, stage3ReviewOutcomes).slice(
        0,
        Math.max(0, stage3ReviewOutcomes.length),
      ),
    [stage3ReviewWords, stage3ReviewOutcomes],
  );
  const hasStage2Review = isStage2 && reviewWords.length > 0;
  const hasStage3Review = isStage3 && stage3ReviewWordsNormalized.length > 0;
  const hasWordReview = hasStage2Review || hasStage3Review;
  const [showStage2Review, setShowStage2Review] = useState(hasWordReview);
  useEffect(() => {
    setShowStage2Review(hasWordReview);
  }, [hasWordReview]);

  const playAgainReady = !syncingScore;

  return (
    <div
      className={cn(
        fredoka.className,
        'quiz-play-root select-none',
        embedded ? 'flex min-h-0 flex-1 flex-col' : 'mx-auto w-full max-w-4xl px-2 py-2',
      )}
      style={themeStyle}
      data-quiz-play-area
      data-quiz-theme={themeId}
    >
      <div
        className={cn(
          'quiz-play-scene quiz-result-scene',
          embedded && 'quiz-play-scene--embedded',
          isStage2 && 'quiz-result-scene--stage2 stage2-scene-shell',
          isStage3 && 'quiz-result-scene--stage3 stage3-scene-shell',
        )}
        style={
          isStage3
            ? ({
                ['--stage3-bg-url' as string]: `url("${STAGE3_ASSETS.discoBg}")`,
              } as React.CSSProperties)
            : undefined
        }
      >
        {isStage2 ? <Stage2SceneBackdrop /> : null}
        {isStage3 ? <Stage3DiscoBackdrop /> : null}
        {useForestBg ? <QuizForestAtmosphere /> : null}
        <div className="quiz-play-inner quiz-result-inner">
          <h2 className="quiz-bubble-title quiz-result-title-compact text-center">
            <span className="quiz-title-line-1">{stageLabel}</span>
            <span className="quiz-title-line-2">RESULT</span>
          </h2>

          <div
            className={cn(
              'quiz-play-board quiz-result-board',
              !stagePassed && 'quiz-result-board--fail',
              fullMark && stagePassed && 'quiz-result-board--full-mark',
            )}
            style={
              stagePassed
                ? {
                    borderColor: themeStyle['--qp-board-border'],
                    background: themeStyle['--qp-board-bg'],
                    ...(fullMark ? {} : { boxShadow: themeStyle['--qp-board-shadow'] }),
                  }
                : undefined
            }
          >
            <div
              className={cn(
                'quiz-play-status-bar',
                !stagePassed && 'quiz-result-status-bar--fail',
              )}
              style={stagePassed ? { background: themeStyle['--qp-status-bg'] } : undefined}
            >
              <span className="quiz-status-stroke-text whitespace-nowrap">
                {isStage2
                  ? stagePassed
                    ? 'STAGE\u00A0CLEAR'
                    : 'STAGE\u00A0FAIL'
                  : stagePassed
                    ? fullMark
                      ? '滿分通關'
                      : '通關成功'
                    : '通關失敗'}
              </span>
              <span className="quiz-status-score quiz-status-stroke-text whitespace-nowrap">
                {stageLabelNoWrap}
                {fullMark && stagePassed ? (
                  <span className="quiz-result-full-mark-badge" aria-label="滿分">
                    ★
                  </span>
                ) : null}
              </span>
            </div>

            {showStage2Review ? (
              <div className="quiz-result-scroll">
                <div className="quiz-result-remark-panel quiz-result-remark-panel--mid">
                  <div className="quiz-result-remark-head">
                    <Sparkles className="size-4 shrink-0 text-violet-600" aria-hidden />
                    <span className="quiz-result-remark-title">Vocabulary Review</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(isStage2 ? reviewWords : stage3ReviewWordsNormalized).map((entry) => (
                    <div
                      key={
                        isStage2
                          ? `${(entry as Stage2ReviewEntry).word.vocabGrade}-${(entry as Stage2ReviewEntry).word.word}`
                          : `stage3-${(entry as Stage3ReviewEntry).word}`
                      }
                      className="flex items-center gap-2 rounded-lg border border-violet-300/25 bg-violet-950/35 px-3 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-black tracking-wide text-violet-100">
                          {isStage2
                            ? (entry as Stage2ReviewEntry).word.word
                            : (entry as Stage3ReviewEntry).word}
                        </p>
                        {isStage2 ? (
                          <p className="truncate text-sm text-violet-200/85">
                            {(entry as Stage2ReviewEntry).word.meaningZh?.trim() || '（暫無中文解釋）'}
                          </p>
                        ) : null}
                      </div>
                      <span
                        aria-label={entry.outcome ? 'correct' : 'wrong'}
                        className={cn(
                          'inline-flex h-7 w-7 items-center justify-center rounded-full',
                          entry.outcome
                            ? 'bg-emerald-500/20 text-emerald-200'
                            : 'bg-rose-500/20 text-rose-200',
                        )}
                      >
                        {entry.outcome ? (
                          <Check className="h-4 w-4" aria-hidden />
                        ) : (
                          <X className="h-4 w-4" aria-hidden />
                        )}
                      </span>
                      <button
                        type="button"
                        aria-label={`pronounce ${isStage2 ? (entry as Stage2ReviewEntry).word.word : (entry as Stage3ReviewEntry).word}`}
                        className="inline-flex h-7 w-7 min-w-0 items-center justify-center rounded-full border border-violet-300/35 bg-violet-200/10 p-0 text-violet-100 !shadow-none [box-shadow:none] outline-none ring-0 transition-colors hover:bg-violet-200/20 focus-visible:outline-none focus-visible:ring-0 focus-visible:shadow-none"
                        onClick={() =>
                          speakEnglishWord(
                            isStage2
                              ? (entry as Stage2ReviewEntry).word.word
                              : (entry as Stage3ReviewEntry).word,
                          )
                        }
                      >
                        <Volume2 className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="quiz-result-scroll">
              <div className="quiz-result-summary">
                <div className="quiz-result-summary-main">
                  <Trophy className="quiz-result-trophy-icon" aria-hidden />
                  <div>
                    <p className="quiz-result-score-line">
                      {isStage3 ? (
                        <>
                          <span className="quiz-result-score-num">{animatedScore100}</span>
                          <span className="quiz-result-score-denom">/100</span>
                          <span className="quiz-result-score-label"> 總分</span>
                        </>
                      ) : (
                        <>
                          <span className="quiz-result-score-num">{animatedCorrectTotal}</span>
                          <span className="quiz-result-score-denom">/{total}</span>
                          <span className="quiz-result-score-label">
                            {isStage2 ? ' 回合完成' : ' 答對'}
                          </span>
                        </>
                      )}
                    </p>
                    <p className="quiz-result-total-line">
                      {isStage2 ? '評價分 ' : '總分 '}
                      <strong>{resultBreakdown ? animatedScore100 : '—'}</strong>/100
                    </p>
                  </div>
                </div>
                {!isStage3 ? (
                  <div className="quiz-result-chip-row quiz-result-chip-row--compact">
                    {isStage2 ? (
                      <>
                        <span className="quiz-result-chip">{STAGE2_MODE_LABEL}</span>
                        <span className="quiz-result-chip">
                          生命力 {stage2HeartsLeft}/{STAGE2_MAX_HEARTS}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="quiz-result-chip">難度 {avgDifficultyLabel}</span>
                        {resultBreakdown ? (
                          <span className="quiz-result-chip">
                            {formatSecondsShort(resultBreakdown.avgSecondsPerQuestion)}
                          </span>
                        ) : null}
                      </>
                    )}
                  </div>
                ) : null}
                {resultBreakdown && isStage3 && resultBreakdown.stage3 ? (
                  <div className="quiz-result-stage3-score-detail">
                    <p className="quiz-result-meta quiz-result-meta--tight">
                      Combo {resultBreakdown.stage3.comboHits}（最高 {resultBreakdown.stage3.maxCombo}）
                      · PERFECT {resultBreakdown.stage3.perfectCount} · 字母{' '}
                      {resultBreakdown.stage3.correctLetters}
                    </p>
                    <p className="quiz-result-meta quiz-result-meta--tight">
                      Combo {Math.round(resultBreakdown.stage3.comboPoints)}/50 · PERFECT{' '}
                      {Math.round(resultBreakdown.stage3.perfectPoints)}/30 · 字母{' '}
                      {Math.round(resultBreakdown.stage3.letterPoints)}/20
                    </p>
                    <p className="quiz-result-meta quiz-result-meta--tight quiz-result-stage3-fever-note">
                      FEVER 回合（第 5–8 局）統計 ×{resultBreakdown.stage3.feverMultiplier}
                    </p>
                    <p className="quiz-result-meta quiz-result-meta--tight">
                      通關線 {STAGE3_PASS_MIN_SCORE100} 分（滿分 100）
                    </p>
                  </div>
                ) : null}
                {resultBreakdown && !isStage2 && !isStage3 && (
                  <p className="quiz-result-meta quiz-result-meta--tight">
                    答對率 {Math.round(resultBreakdown.accuracyPoints)}/65 · 速度{' '}
                    {Math.round(resultBreakdown.speedPoints)}/35
                  </p>
                )}
                <div className="quiz-result-progress-track" aria-hidden>
                  <div
                    className="quiz-result-progress-fill"
                    style={{ width: `${resultBreakdown ? animatedScore100 : 0}%` }}
                  />
                </div>
              </div>

              <div
                className={cn('quiz-result-remark-panel', `quiz-result-remark-panel--${remarkTone}`)}
              >
                <div className="quiz-result-remark-head">
                  <Sparkles className="size-4 shrink-0 text-violet-600" aria-hidden />
                  <span className="quiz-result-remark-title">AI小編評語</span>
                  {isAdmin && editorRemark && (
                    <span className="quiz-result-admin-tag">{editorRemark.style}</span>
                  )}
                </div>
                <p className="quiz-result-remark-text">
                  {editorRemark?.text ?? '小編正在努力想梗…'}
                </p>
              </div>

              {userId && (
                <div className="quiz-result-panel quiz-result-sync-panel">
                  {syncingScore && (
                    <p className="quiz-result-meta text-center">正在同步成績與經驗值…</p>
                  )}
                  {showSyncStats && recordOutcome && (
                    <>
                      <div className="quiz-result-stats-grid">
                        <div className="quiz-result-stat-cell">
                          <span className="quiz-result-stat-label">排名</span>
                          <span className="quiz-result-stat-value">
                            {recordOutcome.newRank}/{recordOutcome.totalPlayers}
                          </span>
                        </div>
                        {recordOutcome.rankDelta != null && recordOutcome.rankDelta !== 0 && (
                          <div className="quiz-result-stat-cell">
                            <span className="quiz-result-stat-label">名次</span>
                            <span
                              className={cn(
                                'quiz-result-stat-value',
                                recordOutcome.rankDelta > 0
                                  ? 'text-emerald-700'
                                  : 'text-red-600',
                              )}
                            >
                              {recordOutcome.rankDelta > 0
                                ? `↑${recordOutcome.rankDelta}`
                                : `↓${Math.abs(recordOutcome.rankDelta)}`}
                            </span>
                          </div>
                        )}
                        <div className="quiz-result-stat-cell">
                          <span className="quiz-result-stat-label">最佳（前）</span>
                          <span className="quiz-result-stat-value">
                            {recordOutcome.previousBest}
                          </span>
                        </div>
                        <div className="quiz-result-stat-cell">
                          <span className="quiz-result-stat-label">最佳（後）</span>
                          <span className="quiz-result-stat-value">{recordOutcome.newBest}</span>
                        </div>
                      </div>
                      {recordOutcome.newBest != null &&
                        recordOutcome.previousBest != null &&
                        recordOutcome.newBest > recordOutcome.previousBest && (
                          <p className="quiz-result-new-record">🌟 新紀錄！</p>
                        )}
                      <div className="quiz-result-xp-box">
                        <span>+{recordOutcome.xpEarned} XP</span>
                        <span>
                          EXP {recordOutcome.newExp} · Lv.{recordOutcome.newLevel}
                        </span>
                      </div>
                    </>
                  )}
                  {!syncingScore && recordOutcome?.ok && !recordOutcome.loggedIn && (
                    <p className="quiz-result-meta text-center">登入已失效，無法寫入經驗值。</p>
                  )}
                </div>
              )}

              {!userId && (
                <p className="quiz-result-meta text-center">登入後可記錄經驗值與最高分。</p>
              )}

              {recordError && <p className="quiz-result-error text-center">{recordError}</p>}
              </div>
            )}

            <footer className="quiz-result-footer">
              {showStage2Review ? (
                <button
                  type="button"
                  className="quiz-result-play-again !shadow-none [box-shadow:none] hover:!shadow-none active:!shadow-none"
                  onClick={() => setShowStage2Review(false)}
                >
                  <ChevronRight className="size-5" aria-hidden />
                  關卡結算
                </button>
              ) : (
                <>
                  <div className="quiz-result-stars" aria-label={`${total}/${total}`}>
                    {Array.from({ length: total }, (_, i) => {
                      const color = theme.starFilled[i % theme.starFilled.length];
                      return (
                        <QuizProgressStar
                          key={i}
                          filled
                          correct={starsCorrect[i] === true}
                          fillColor={color}
                          className="quiz-result-star-icon"
                        />
                      );
                    })}
                  </div>
                  {(isStage2 || isStage3) && !stagePassed && stageFailOptions ? (
                    <div className="quiz-result-stage2-fail-actions">
                      <button
                        type="button"
                        className="quiz-result-play-again quiz-result-play-again--continue"
                        disabled={staminaActionPending}
                        onClick={stageFailOptions.onContinue}
                      >
                        <span>{staminaActionPending ? '處理中…' : '續關'}</span>
                        <span className="quiz-result-stamina-cost">（<GameStaminaCost amount={GAME_STAMINA_COST_CONTINUE} />）</span>
                      </button>
                      <button
                        type="button"
                        className="quiz-result-play-again"
                        disabled={staminaActionPending}
                        onClick={stageFailOptions.onRetry}
                      >
                        <RotateCcw className="size-5" aria-hidden />
                        <span>{isStage3 ? '重玩一次' : '再玩一次'}</span>
                        <span className="quiz-result-stamina-cost">（<GameStaminaCost amount={GAME_STAMINA_COST_RETRY} />）</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="quiz-result-play-again"
                      disabled={!playAgainReady}
                      onClick={onPlayAgain}
                    >
                      {playAgainMode === 'next' ? (
                        <ChevronRight className="size-5" aria-hidden />
                      ) : (
                        <RotateCcw className="size-5" aria-hidden />
                      )}
                      {playAgainLabel}
                    </button>
                  )}
                </>
              )}
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}
