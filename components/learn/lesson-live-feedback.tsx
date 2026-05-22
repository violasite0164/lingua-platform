'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, MessageSquare, XCircle } from 'lucide-react';

import {
  recordLessonCueAnswer,
  syncLessonCompletionIfReady,
} from '@/app/actions/lesson-cue-progress';
import {
  allRequiredCuesAnswered,
  getRequiredCueIds,
  isRequiredCueType,
} from '@/lib/lesson-cues/completion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  LESSON_CUE_ANSWER_AUTO_ADVANCE_MS,
  LESSON_CUE_SENTENCE_AUTO_ADVANCE_MS,
  LESSON_CUE_TYPEWRITER_MS_PER_CHAR,
} from '@/lib/lesson-cues/constants';
import {
  getCueDisplayText,
  parseCuePayload,
  type LessonCuePayload,
} from '@/lib/lesson-cues/types';
import type { LessonTimedCue } from '@/types/database.types';

type StreamPlayerLike = {
  currentTime: number;
  pause: () => void;
  play: () => Promise<void>;
};

type ActiveCue = {
  row: LessonTimedCue;
  payload: LessonCuePayload;
};

function rowToActive(row: LessonTimedCue): ActiveCue | null {
  const payload = parseCuePayload(row.cue_type, row.payload);
  if (!payload) return null;
  return { row, payload };
}

export function LessonLiveFeedbackPanel({
  cues,
  currentTimeSec,
  player,
  lessonId,
  courseId,
  answeredCueIds,
  lockRequiredCues,
  incompleteAfterVideo,
  onAnsweredChange,
  onLessonCompleted,
  onPersistError,
}: {
  cues: LessonTimedCue[];
  currentTimeSec: number;
  player: StreamPlayerLike | null;
  lessonId: string;
  courseId: string;
  answeredCueIds: string[];
  /** 已完成或已答完所有必答題：選擇題／文字不再彈出（除非重新學習） */
  lockRequiredCues: boolean;
  /** 影片已播畢但尚有未答對的必答題時為 true，此時不自動恢復播放 */
  incompleteAfterVideo: boolean;
  onAnsweredChange: (ids: string[] | ((prev: string[]) => string[])) => void;
  onLessonCompleted: () => void;
  onPersistError: (message: string | null) => void;
}) {
  const [active, setActive] = useState<ActiveCue | null>(null);
  const [typedText, setTypedText] = useState('');
  const [typingDone, setTypingDone] = useState(false);
  const [mcAnswer, setMcAnswer] = useState<number | null>(null);
  const [textAnswer, setTextAnswer] = useState('');
  const [textResult, setTextResult] = useState<'idle' | 'correct' | 'wrong'>(
    'idle',
  );
  const [saveError, setSaveError] = useState<string | null>(null);

  const firedRef = useRef(new Set<string>());
  const answeredSetRef = useRef(new Set<string>(answeredCueIds));
  const queueRef = useRef<LessonTimedCue[]>([]);
  const activeRef = useRef<ActiveCue | null>(null);
  /** 上一次回報的播放秒數（跨越觸發點時觸發；句子可重複、其他類型僅一次） */
  const prevTimeRef = useRef<number | null>(null);

  const parsedCues = useMemo(
    () =>
      cues
        .map((c) => ({ c, active: rowToActive(c) }))
        .filter((x): x is { c: LessonTimedCue; active: ActiveCue } => !!x.active),
    [cues],
  );

  const resumePlaybackAfterCue = useCallback(() => {
    if (incompleteAfterVideo) return;
    void player?.play().catch(() => undefined);
  }, [player, incompleteAfterVideo]);

  const dismissActive = useCallback(() => {
    activeRef.current = null;
    setActive(null);
    setTypedText('');
    setTypingDone(false);
    setMcAnswer(null);
    setTextAnswer('');
    setTextResult('idle');
    resumePlaybackAfterCue();
  }, [resumePlaybackAfterCue]);

  const showCue = useCallback(
    (row: LessonTimedCue) => {
      const next = rowToActive(row);
      if (!next) return;
      activeRef.current = next;
      setActive(next);
      setTypedText('');
      setTypingDone(false);
      setMcAnswer(null);
      setTextAnswer('');
      setTextResult('idle');

      if (next.row.cue_type !== 'sentence') {
        player?.pause();
      }
    },
    [player],
  );

  const dequeueNext = useCallback(() => {
    const next = queueRef.current.shift();
    if (next) showCue(next);
    else dismissActive();
  }, [showCue, dismissActive]);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  const cuesKey = useMemo(
    () => cues.map((c) => c.id).join(','),
    [cues],
  );

  const markRequiredCuesAsFired = useCallback(() => {
    for (const { c } of parsedCues) {
      if (isRequiredCueType(c.cue_type)) {
        firedRef.current.add(c.id);
      }
    }
  }, [parsedCues]);

  useEffect(() => {
    answeredSetRef.current = new Set(answeredCueIds);
    for (const id of answeredCueIds) {
      firedRef.current.add(id);
    }
    if (lockRequiredCues) {
      markRequiredCuesAsFired();
    }
  }, [answeredCueIds, lockRequiredCues, markRequiredCuesAsFired]);

  useEffect(() => {
    firedRef.current.clear();
    queueRef.current = [];
    prevTimeRef.current = null;
  }, [cuesKey]);

  useEffect(() => {
    for (const id of answeredCueIds) {
      firedRef.current.add(id);
    }
  }, [answeredCueIds]);

  const persistCueAnswer = useCallback(
    async (cueId: string) => {
      if (answeredSetRef.current.has(cueId)) return;

      setSaveError(null);
      onPersistError(null);

      onAnsweredChange((prev) => {
        if (prev.includes(cueId)) return prev;
        return [...prev, cueId];
      });
      answeredSetRef.current.add(cueId);
      firedRef.current.add(cueId);

      const res = await recordLessonCueAnswer({ lessonId, cueId, courseId });
      if (res.error) {
        answeredSetRef.current.delete(cueId);
        firedRef.current.delete(cueId);
        onAnsweredChange((prev) => prev.filter((id) => id !== cueId));
        setSaveError(res.error);
        onPersistError(res.error);
        return;
      }
      if (res.answeredCueIds && res.answeredCueIds.length > 0) {
        answeredSetRef.current = new Set(res.answeredCueIds);
        for (const id of res.answeredCueIds) {
          firedRef.current.add(id);
        }
        onAnsweredChange((prev) => {
          const merged = new Set([...prev, ...res.answeredCueIds!]);
          return [...merged];
        });
      }
      if (res.lessonCompleted) {
        onLessonCompleted();
      }
    },
    [
      lessonId,
      courseId,
      onAnsweredChange,
      onLessonCompleted,
      onPersistError,
    ],
  );

  useEffect(() => {
    const prev = prevTimeRef.current;
    prevTimeRef.current = currentTimeSec;

    // 初次取樣（含續播跳到影片中段）：選擇題／文字略過已過觸發點；句子仍可在之後再次經過時觸發
    if (prev === null) {
      if (lockRequiredCues) {
        markRequiredCuesAsFired();
      } else {
        for (const { c: row } of parsedCues) {
          if (
            isRequiredCueType(row.cue_type) &&
            currentTimeSec >= row.trigger_at_sec
          ) {
            firedRef.current.add(row.id);
          }
        }
      }
      return;
    }

    // 使用者往回拖曳：未鎖定時才允許必答題再次觸發
    if (!lockRequiredCues && currentTimeSec < prev - 0.5) {
      for (const { c: row } of parsedCues) {
        if (
          isRequiredCueType(row.cue_type) &&
          row.trigger_at_sec > currentTimeSec
        ) {
          firedRef.current.delete(row.id);
        }
      }
      const showing = activeRef.current;
      if (
        showing?.row.cue_type === 'sentence' &&
        currentTimeSec < showing.row.trigger_at_sec
      ) {
        dismissActive();
      }
    }

    // 大幅往前跳（續播／拖曳）：略過區間內的選擇題／文字；句子需實際播放到該秒才觸發
    if (currentTimeSec - prev > 2) {
      for (const { c: row } of parsedCues) {
        if (
          isRequiredCueType(row.cue_type) &&
          row.trigger_at_sec > prev &&
          row.trigger_at_sec <= currentTimeSec
        ) {
          firedRef.current.add(row.id);
        }
      }
      return;
    }

    if (activeRef.current) return;

    const due = parsedCues
      .filter(({ c }) => {
        const crossed =
          prev < c.trigger_at_sec && currentTimeSec >= c.trigger_at_sec;
        if (c.cue_type === 'sentence') return crossed;
        if (lockRequiredCues) return false;
        return crossed && !firedRef.current.has(c.id);
      })
      .map(({ c }) => c);

    if (due.length === 0) return;

    for (const row of due) {
      if (row.cue_type !== 'sentence') {
        firedRef.current.add(row.id);
      }
    }

    const [first, ...rest] = due;
    queueRef.current = rest;
    showCue(first);
  }, [currentTimeSec, parsedCues, showCue, dismissActive]);

  const displayText = active ? getCueDisplayText(active.row.cue_type, active.payload) : '';

  useEffect(() => {
    if (!active || active.row.cue_type !== 'sentence') {
      setTypedText('');
      setTypingDone(false);
      return;
    }

    const full = displayText;
    let i = 0;
    setTypedText('');
    setTypingDone(false);

    const timer = setInterval(() => {
      i += 1;
      setTypedText(full.slice(0, i));
      if (i >= full.length) {
        clearInterval(timer);
        setTypingDone(true);
      }
    }, LESSON_CUE_TYPEWRITER_MS_PER_CHAR);

    return () => clearInterval(timer);
  }, [active?.row.id, displayText, active?.row.cue_type]);

  useEffect(() => {
    if (!active || active.row.cue_type !== 'sentence' || !typingDone) return;

    const timer = setTimeout(() => {
      dequeueNext();
    }, LESSON_CUE_SENTENCE_AUTO_ADVANCE_MS);

    return () => clearTimeout(timer);
  }, [active?.row.id, active?.row.cue_type, typingDone, dequeueNext]);

  useEffect(() => {
    if (!active || active.row.cue_type !== 'multiple_choice' || mcAnswer === null) return;
    if (!('correct_index' in active.payload)) return;

    const isCorrect = mcAnswer === active.payload.correct_index;
    if (!isCorrect) return;

    resumePlaybackAfterCue();
    const timer = setTimeout(() => {
      dequeueNext();
    }, LESSON_CUE_ANSWER_AUTO_ADVANCE_MS);

    return () => clearTimeout(timer);
  }, [
    active?.row.id,
    active?.row.cue_type,
    active?.payload,
    mcAnswer,
    resumePlaybackAfterCue,
    dequeueNext,
  ]);

  useEffect(() => {
    if (!active || active.row.cue_type !== 'text_input') return;

    if (textResult === 'correct') {
      resumePlaybackAfterCue();
      const timer = setTimeout(() => {
        dequeueNext();
      }, LESSON_CUE_ANSWER_AUTO_ADVANCE_MS);
      return () => clearTimeout(timer);
    }
  }, [
    active?.row.id,
    active?.row.cue_type,
    textResult,
    resumePlaybackAfterCue,
    dequeueNext,
  ]);

  function handleMcSelect(index: number) {
    if (!active || active.row.cue_type !== 'multiple_choice') return;
    if (!('correct_index' in active.payload)) return;
    setMcAnswer(index);
    if (index === active.payload.correct_index) {
      void persistCueAnswer(active.row.id);
    }
  }

  function handleMcRetry() {
    setMcAnswer(null);
    player?.pause();
  }

  function handleTextSubmit() {
    if (!active || active.row.cue_type !== 'text_input') return;
    if (!('acceptable_answers' in active.payload)) return;
    const p = active.payload;
    const normalized = (s: string) =>
      p.case_sensitive ? s.trim() : s.trim().toLowerCase();
    const answer = normalized(textAnswer);
    const ok = p.acceptable_answers.some((a: string) => normalized(a) === answer);
    setTextResult(ok ? 'correct' : 'wrong');
    if (ok) {
      void persistCueAnswer(active.row.id);
    }
  }

  if (!active) {
    return (
      <div className="flex min-h-[7rem] items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-4 py-6 text-center">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <MessageSquare className="h-4 w-4 shrink-0" />
          播放影片時，這裡會出現即時互動內容
        </p>
      </div>
    );
  }

  const type = active.row.cue_type;

  return (
    <div className="rounded-xl border border-border bg-card px-4 py-4 shadow-sm">
      <p className="mb-2 text-xs font-medium text-muted-foreground">即時回饋</p>
      {saveError ? (
        <p className="mb-2 text-xs text-destructive" role="alert">
          {saveError}
        </p>
      ) : null}

      {type === 'sentence' ? (
        <div className="space-y-3">
          <p className="min-h-[3rem] whitespace-pre-wrap text-base leading-relaxed">
            {typedText}
            {!typingDone ? (
              <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-foreground align-middle" />
            ) : null}
          </p>
        </div>
      ) : null}

      {type === 'multiple_choice' && 'options' in active.payload ? (
        (() => {
          const mcPayload = active.payload;
          return (
        <div className="space-y-3">
          <p className="text-base font-medium leading-snug">{mcPayload.prompt}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {mcPayload.options.map((opt, i) => {
              const chosen = mcAnswer === i;
              const showResult = mcAnswer !== null;
              const isCorrect = i === mcPayload.correct_index;
              return (
                <button
                  key={i}
                  type="button"
                  disabled={mcAnswer !== null}
                  onClick={() => handleMcSelect(i)}
                  className={cn(
                    'rounded-lg border px-3 py-2.5 text-left text-sm transition-colors',
                    !showResult && 'hover:bg-muted',
                    showResult && isCorrect && 'border-emerald-500/50 bg-emerald-500/10',
                    showResult && chosen && !isCorrect && 'border-destructive/50 bg-destructive/10',
                    showResult && !chosen && !isCorrect && 'opacity-60',
                  )}
                >
                  <span className="font-medium text-muted-foreground">
                    {String.fromCharCode(65 + i)}.
                  </span>{' '}
                  {opt}
                </button>
              );
            })}
          </div>
          {mcAnswer !== null ? (
            <div className="space-y-2">
              {mcAnswer === mcPayload.correct_index ? (
                <p className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  答對了！
                </p>
              ) : (
                <p className="flex items-center gap-1.5 text-sm text-destructive">
                  <XCircle className="h-4 w-4" />
                  再想想看
                </p>
              )}
              {mcPayload.explanation ? (
                <p className="text-sm text-muted-foreground">
                  {mcPayload.explanation}
                </p>
              ) : null}
              {mcAnswer !== mcPayload.correct_index ? (
                <Button type="button" size="sm" variant="outline" onClick={handleMcRetry}>
                  再答一次
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
          );
        })()
      ) : null}

      {type === 'text_input' && active.payload && 'acceptable_answers' in active.payload ? (
        <div className="space-y-3">
          <p className="text-base font-medium leading-snug">{active.payload.prompt}</p>
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              value={textAnswer}
              onChange={(e) => setTextAnswer(e.target.value)}
              disabled={textResult !== 'idle'}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTextSubmit();
              }}
              className="min-w-[12rem] flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="輸入你的答案"
            />
            <Button
              type="button"
              size="sm"
              disabled={textResult !== 'idle' || !textAnswer.trim()}
              onClick={handleTextSubmit}
            >
              送出
            </Button>
          </div>
          {textResult === 'correct' ? (
            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                答對了！
              </p>
              {active.payload.explanation ? (
                <p className="text-sm text-muted-foreground">
                  {active.payload.explanation}
                </p>
              ) : null}
            </div>
          ) : null}
          {textResult === 'wrong' ? (
            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-sm text-destructive">
                <XCircle className="h-4 w-4" />
                還不對，請再答一次（須答對才算完成）
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setTextResult('idle');
                  player?.pause();
                }}
              >
                再答一次
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** 供 lesson-workspace 串接：回傳要傳給 VideoPlayer 的 props */
export function useLessonLiveFeedback(
  cues: LessonTimedCue[],
  options: {
    lessonId: string;
    courseId: string;
    initialAnsweredCueIds: string[];
    initialCompleted: boolean;
  },
) {
  const router = useRouter();
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [player, setPlayer] = useState<StreamPlayerLike | null>(null);
  const [answeredCueIds, setAnsweredCueIds] = useState(
    options.initialAnsweredCueIds,
  );
  const [lessonCompleted, setLessonCompleted] = useState(
    options.initialCompleted,
  );
  const [sessionKey, setSessionKey] = useState(0);
  const [persistError, setPersistError] = useState<string | null>(null);
  const [incompleteAfterVideo, setIncompleteAfterVideo] = useState(false);

  const resetLearningSession = useCallback(() => {
    setPersistError(null);
    setIncompleteAfterVideo(false);
    setAnsweredCueIds([]);
    setLessonCompleted(false);
    setCurrentTimeSec(0);
    setSessionKey((k) => k + 1);
  }, []);

  const restartVideoFromStart = useCallback(() => {
    setIncompleteAfterVideo(false);
    setCurrentTimeSec(0);
    setSessionKey((k) => k + 1);
  }, []);

  const requiredCueIds = useMemo(() => getRequiredCueIds(cues), [cues]);

  const lockRequiredCues =
    lessonCompleted ||
    allRequiredCuesAnswered(requiredCueIds, answeredCueIds);

  useEffect(() => {
    if (lessonCompleted) return;
    if (requiredCueIds.length === 0) return;
    if (answeredCueIds.length < requiredCueIds.length) return;
    if (!allRequiredCuesAnswered(requiredCueIds, answeredCueIds)) return;

    let cancelled = false;
    void (async () => {
      const res = await syncLessonCompletionIfReady({
        lessonId: options.lessonId,
        courseId: options.courseId,
      });
      if (cancelled) return;
      if (res.error) {
        setPersistError(res.error);
        return;
      }
      if (res.lessonCompleted) {
        setLessonCompleted(true);
        router.refresh();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    answeredCueIds,
    requiredCueIds,
    lessonCompleted,
    options.lessonId,
    options.courseId,
    router,
  ]);

  const handleLessonCompleted = useCallback(() => {
    setLessonCompleted(true);
    setIncompleteAfterVideo(false);
    router.refresh();
  }, [router]);

  const handleVideoEnded = useCallback(() => {
    player?.pause();

    if (requiredCueIds.length === 0) return;
    if (
      lessonCompleted ||
      allRequiredCuesAnswered(requiredCueIds, answeredCueIds)
    ) {
      return;
    }
    setIncompleteAfterVideo(true);
  }, [requiredCueIds, lessonCompleted, answeredCueIds, player]);

  const videoPlayerProps = useMemo(
    () => ({
      onPlaybackTimeUpdate: (seconds: number) => setCurrentTimeSec(seconds),
      onPlayerReady: (p: StreamPlayerLike) => setPlayer(p),
      onEnded: handleVideoEnded,
    }),
    [handleVideoEnded],
  );

  const panel = (
    <LessonLiveFeedbackPanel
      key={sessionKey}
      cues={cues}
      currentTimeSec={currentTimeSec}
      player={player}
      lessonId={options.lessonId}
      courseId={options.courseId}
      answeredCueIds={answeredCueIds}
      lockRequiredCues={lockRequiredCues}
      incompleteAfterVideo={incompleteAfterVideo}
      onAnsweredChange={setAnsweredCueIds}
      onLessonCompleted={handleLessonCompleted}
      onPersistError={setPersistError}
    />
  );

  return {
    videoPlayerProps,
    panel,
    answeredCueIds,
    lessonCompleted,
    lockRequiredCues,
    persistError,
    incompleteAfterVideo,
    resetLearningSession,
    restartVideoFromStart,
    requiredCueIds,
  };
}
