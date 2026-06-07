'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';

import { CourseQuizOptionVisualFields } from '@/components/mentor/course-quiz-option-visual-fields';
import { CourseQuizShapeTypefaceUpload } from '@/components/mentor/course-quiz-shape-typeface-upload';
import { CourseQuizQuestionVideoUpload } from '@/components/mentor/course-quiz-video-upload';
import { CourseQuizSpeechPanel } from '@/components/mentor/course-quiz-speech-panel';
import {
  parseOptionImageUrls,
  parseOptionShapeGlyphs,
} from '@/lib/course-quiz/shape-glyphs';
import { mentorTextareaClass } from '@/components/mentor/field-classes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CourseQuizSequencePanel } from '@/components/mentor/course-quiz-sequence-panel';
import {
  parseSubscriptionAccessFromForm,
  SubscriptionAccessFields,
} from '@/components/mentor/subscription-access-fields';
import type { SubscriptionPlanLabels } from '@/lib/billing/subscription-plan-labels';
import {
  createCourseQuizAction,
  createCourseQuizQuestionAction,
  deleteCourseQuizAction,
  deleteCourseQuizQuestionAction,
  updateCourseQuizAction,
  updateCourseQuizQuestionAction,
} from '@/lib/mentor/course-quiz-actions';
import {
  choiceCountForMode,
  choiceModeLabel,
  optionLabelsForMode,
} from '@/lib/course-quiz/choice-mode';
import { COURSE_QUIZ_INTERACTION_MODES } from '@/lib/course-quiz/interaction-modes';
import {
  COURSE_QUIZ_VOCABULARY_DISPLAYS,
  resolveCourseQuizVocabularyDisplay,
} from '@/lib/course-quiz/vocabulary-display';
import {
  COURSE_QUIZ_PLAY_THEMES,
  resolveCourseQuizPlayTheme,
} from '@/lib/course-quiz/play-themes';
import type {
  CourseQuizInteractionMode,
  CourseQuizPlayTheme,
  CourseQuizVocabularyDisplay,
} from '@/types/database.types';
import { cn } from '@/lib/utils';
import type {
  CourseQuiz,
  CourseQuizChoiceMode,
  CourseQuizQuestion,
  CourseQuizStep,
  Lesson,
} from '@/types/database.types';

function parseChoiceMode(value: FormDataEntryValue | null): CourseQuizChoiceMode {
  return value === 'three' ? 'three' : 'four';
}

function parsePlayTheme(value: FormDataEntryValue | null): CourseQuizPlayTheme {
  if (value === 'magic_forest') return 'magic_forest';
  if (value === 'kindergarten') return 'kindergarten';
  if (value === 'off') return 'off';
  return 'kindergarten';
}

function parseInteractionMode(
  value: FormDataEntryValue | null,
): CourseQuizInteractionMode {
  return value === 'vocabulary_drop' ? 'vocabulary_drop' : 'choice_grid';
}

function parseVocabularyDisplay(
  value: FormDataEntryValue | null,
): CourseQuizVocabularyDisplay {
  if (value === 'shape' || value === 'card') return 'shape';
  return 'character';
}

function resolveQuizChoiceMode(quiz: CourseQuiz): CourseQuizChoiceMode {
  return quiz.choice_mode === 'three' ? 'three' : 'four';
}

type Props = {
  courseId: string;
  courseSubBasic?: boolean;
  courseSubPro?: boolean;
  planLabels?: SubscriptionPlanLabels;
  lessons: Lesson[];
  quizzes: CourseQuiz[];
  questions: CourseQuizQuestion[];
  steps: CourseQuizStep[];
  azureSpeechConfigured?: boolean;
};

export function CourseQuizEditor({
  courseId,
  courseSubBasic = false,
  courseSubPro = false,
  planLabels,
  lessons,
  quizzes,
  questions,
  steps,
  azureSpeechConfigured = false,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [expandedQuizId, setExpandedQuizId] = useState<string | null>(
    quizzes[0]?.id ?? null,
  );
  const [newQuizOpen, setNewQuizOpen] = useState(false);

  const questionsByQuiz = useMemo(() => {
    const map = new Map<string, CourseQuizQuestion[]>();
    for (const q of questions) {
      const list = map.get(q.quiz_id) ?? [];
      list.push(q);
      map.set(q.quiz_id, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.sort_order - b.sort_order);
    }
    return map;
  }, [questions]);

  function refresh() {
    router.refresh();
  }

  function handleCreateQuiz(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setMsg(null);
    const placement = form.get('placement') as 'after_lesson' | 'final_exam';
    startTransition(async () => {
      const res = await createCourseQuizAction({
        course_id: courseId,
        title: String(form.get('title') || '測驗'),
        placement,
        after_lesson_id:
          placement === 'after_lesson'
            ? String(form.get('after_lesson_id') || '') || null
            : null,
        choice_mode: parseChoiceMode(form.get('choice_mode')),
        play_theme: parsePlayTheme(form.get('play_theme')),
        interaction_mode: parseInteractionMode(form.get('interaction_mode')),
        vocabulary_display: parseVocabularyDisplay(form.get('vocabulary_display')),
        require_to_continue: form.get('require_to_continue') === 'on',
        require_to_complete_course: form.get('require_to_complete_course') === 'on',
        xp_reward: Number(form.get('xp_reward') || 300),
        is_published: form.get('is_published') === 'on',
      });
      setMsg(res.success ?? res.error ?? null);
      if (res.quiz) {
        setExpandedQuizId(res.quiz.id);
        setNewQuizOpen(false);
      }
      refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">測驗管理</CardTitle>
            <CardDescription>
              建立題目與影片、插入影片文字（字型／對齊／動畫），並調整出現順序
            </CardDescription>
          </div>
          <Button type="button" size="sm" onClick={() => setNewQuizOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            新增測驗
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {msg ? (
          <p
            className={cn(
              'text-sm font-medium',
              msg.includes('失敗') ||
                msg.includes('錯誤') ||
                msg.includes('無效') ||
                msg.includes('未設定') ||
                msg.includes('401')
                ? 'text-destructive'
                : 'text-green-700 dark:text-green-400',
            )}
            role="status"
          >
            {msg}
          </p>
        ) : null}

        {quizzes.length === 0 ? (
          <p className="text-sm text-muted-foreground">尚未建立測驗</p>
        ) : null}

        {quizzes.map((quiz) => (
          <QuizBlock
            key={quiz.id}
            quiz={quiz}
            lessons={lessons}
            courseId={courseId}
            courseSubBasic={courseSubBasic}
            courseSubPro={courseSubPro}
            planLabels={planLabels}
            questions={questionsByQuiz.get(quiz.id) ?? []}
            steps={steps}
            expanded={expandedQuizId === quiz.id}
            onToggle={() =>
              setExpandedQuizId((id) => (id === quiz.id ? null : quiz.id))
            }
            pending={pending}
            onMessage={setMsg}
            onDone={refresh}
            azureSpeechConfigured={azureSpeechConfigured}
          />
        ))}
      </CardContent>

      <Dialog open={newQuizOpen} onOpenChange={setNewQuizOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>新增測驗</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateQuiz} className="space-y-4">
            <div>
              <Label htmlFor="new-quiz-title">標題</Label>
              <Input id="new-quiz-title" name="title" defaultValue="測驗" required />
            </div>
            <div>
              <Label htmlFor="new-quiz-placement">插入位置</Label>
              <select
                id="new-quiz-placement"
                name="placement"
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                defaultValue="after_lesson"
              >
                <option value="after_lesson">某單元之後</option>
                <option value="final_exam">課程最後（總測驗）</option>
              </select>
            </div>
            <div>
              <Label htmlFor="new-quiz-after">插在單元之後</Label>
              <select
                id="new-quiz-after"
                name="after_lesson_id"
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {lessons.map((l) => (
                  <option key={l.id} value={l.id}>
                    單元 #{l.sort_order} — {l.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="new-quiz-choice-mode">答題模式</Label>
              <select
                id="new-quiz-choice-mode"
                name="choice_mode"
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                defaultValue="four"
              >
                <option value="four">四選一</option>
                <option value="three">三選一</option>
              </select>
            </div>
            <div>
              <Label htmlFor="new-quiz-play-theme">播放主題</Label>
              <select
                id="new-quiz-play-theme"
                name="play_theme"
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                defaultValue="kindergarten"
              >
                {Object.values(COURSE_QUIZ_PLAY_THEMES).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-muted-foreground">
                {COURSE_QUIZ_PLAY_THEMES.kindergarten.description}
              </p>
            </div>
            <div>
              <Label htmlFor="new-quiz-interaction-mode">互動模式</Label>
              <select
                id="new-quiz-interaction-mode"
                name="interaction_mode"
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                defaultValue="choice_grid"
              >
                {(
                  Object.entries(COURSE_QUIZ_INTERACTION_MODES) as [
                    CourseQuizInteractionMode,
                    (typeof COURSE_QUIZ_INTERACTION_MODES)[CourseQuizInteractionMode],
                  ][]
                ).map(([id, meta]) => (
                  <option key={id} value={id}>
                    {meta.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-muted-foreground">
                {COURSE_QUIZ_INTERACTION_MODES.choice_grid.description}
              </p>
            </div>
            <div>
              <Label htmlFor="new-quiz-vocabulary-display">新題預設單字顯示（單字模式）</Label>
              <select
                id="new-quiz-vocabulary-display"
                name="vocabulary_display"
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                defaultValue="character"
              >
                {(
                  Object.entries(COURSE_QUIZ_VOCABULARY_DISPLAYS) as [
                    CourseQuizVocabularyDisplay,
                    (typeof COURSE_QUIZ_VOCABULARY_DISPLAYS)[CourseQuizVocabularyDisplay],
                  ][]
                ).map(([id, meta]) => (
                  <option key={id} value={id}>
                    {meta.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-muted-foreground">
                {COURSE_QUIZ_VOCABULARY_DISPLAYS.character.description}
              </p>
            </div>
            <div>
              <Label htmlFor="new-quiz-xp">經驗值 (XP)</Label>
              <Input id="new-quiz-xp" name="xp_reward" type="number" defaultValue={300} min={0} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="require_to_continue" defaultChecked />
              必須完成才可進入下一單元
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="require_to_complete_course" defaultChecked />
              總測驗：必須完成才可完成課程
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="is_published" />
              立即發布（學生可見）
            </label>
            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : '建立'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function QuizBlock({
  quiz,
  lessons,
  courseId,
  courseSubBasic,
  courseSubPro,
  planLabels,
  questions,
  steps,
  expanded,
  onToggle,
  pending,
  onMessage,
  onDone,
  azureSpeechConfigured,
}: {
  quiz: CourseQuiz;
  lessons: Lesson[];
  courseId: string;
  courseSubBasic: boolean;
  courseSubPro: boolean;
  planLabels?: SubscriptionPlanLabels;
  questions: CourseQuizQuestion[];
  steps: CourseQuizStep[];
  expanded: boolean;
  onToggle: () => void;
  pending: boolean;
  onMessage: (m: string | null) => void;
  onDone: () => void;
  azureSpeechConfigured: boolean;
}) {
  const [pendingLocal, startTransition] = useTransition();
  const busy = pending || pendingLocal;

  function saveSettings(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    onMessage(null);
    const placement = form.get('placement') as 'after_lesson' | 'final_exam';
    const subAccess = parseSubscriptionAccessFromForm(form);
    startTransition(async () => {
      const res = await updateCourseQuizAction(quiz.id, {
        course_id: courseId,
        title: String(form.get('title') || quiz.title),
        placement,
        after_lesson_id:
          placement === 'after_lesson'
            ? String(form.get('after_lesson_id') || '') || null
            : null,
        choice_mode: parseChoiceMode(form.get('choice_mode')),
        play_theme: parsePlayTheme(form.get('play_theme')),
        interaction_mode: parseInteractionMode(form.get('interaction_mode')),
        vocabulary_display: parseVocabularyDisplay(form.get('vocabulary_display')),
        require_to_continue: form.get('require_to_continue') === 'on',
        require_to_complete_course: form.get('require_to_complete_course') === 'on',
        xp_reward: Number(form.get('xp_reward') || quiz.xp_reward),
        is_published: form.get('is_published') === 'on',
        sub_access_override: form.get('sub_access_override') === 'on',
        sub_basic_free: subAccess.sub_basic_free ?? false,
        sub_pro_free: subAccess.sub_pro_free ?? false,
      });
      onMessage(res.success ?? res.error ?? null);
      onDone();
    });
  }

  function deleteQuiz() {
    if (!confirm('確定刪除此測驗？')) return;
    startTransition(async () => {
      const res = await deleteCourseQuizAction(quiz.id);
      onMessage(res.success ?? res.error ?? null);
      onDone();
    });
  }

  const choiceMode = resolveQuizChoiceMode(quiz);
  const playTheme = resolveCourseQuizPlayTheme(quiz.play_theme);
  const interactionMode =
    quiz.interaction_mode === 'vocabulary_drop' ? 'vocabulary_drop' : 'choice_grid';
  const defaultVocabularyDisplay = resolveCourseQuizVocabularyDisplay(
    quiz.vocabulary_display,
  );
  const placementLabel =
    quiz.placement === 'final_exam'
      ? '課程總測驗'
      : `單元 #${lessons.find((l) => l.id === quiz.after_lesson_id)?.sort_order ?? '?'} 之後`;

  const quizStepList = steps.filter((s) => s.quiz_id === quiz.id);

  return (
    <div className="rounded-lg border border-border">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium"
        onClick={onToggle}
      >
        <span>
          {quiz.title}
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            {placementLabel} · {choiceModeLabel(choiceMode)} ·{' '}
            {COURSE_QUIZ_PLAY_THEMES[playTheme].label} ·{' '}
            {COURSE_QUIZ_INTERACTION_MODES[interactionMode].label} · {questions.length} 題
            {quiz.is_published ? ' · 已發布' : ' · 草稿'}
          </span>
        </span>
      </button>

      {expanded ? (
        <div className="space-y-4 border-t border-border px-4 py-4">
          <form onSubmit={saveSettings} className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>標題</Label>
              <Input name="title" defaultValue={quiz.title} />
            </div>
            <div>
              <Label>位置</Label>
              <select
                name="placement"
                defaultValue={quiz.placement}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="after_lesson">單元之後</option>
                <option value="final_exam">課程總測驗</option>
              </select>
            </div>
            <div>
              <Label>插在單元</Label>
              <select
                name="after_lesson_id"
                defaultValue={quiz.after_lesson_id ?? ''}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {lessons.map((l) => (
                  <option key={l.id} value={l.id}>
                    單元 #{l.sort_order} — {l.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>答題模式</Label>
              <select
                name="choice_mode"
                defaultValue={choiceMode}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="four">四選一</option>
                <option value="three">三選一</option>
              </select>
              <p className="mt-1 text-[11px] text-muted-foreground">
                變更模式後請重新檢查各題選項數量
              </p>
            </div>
            <div>
              <Label>播放主題</Label>
              <select
                name="play_theme"
                defaultValue={playTheme}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {Object.values(COURSE_QUIZ_PLAY_THEMES).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {COURSE_QUIZ_PLAY_THEMES[playTheme].description}
              </p>
            </div>
            <div>
              <Label>互動模式</Label>
              <select
                name="interaction_mode"
                defaultValue={interactionMode}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {(
                  Object.entries(COURSE_QUIZ_INTERACTION_MODES) as [
                    CourseQuizInteractionMode,
                    (typeof COURSE_QUIZ_INTERACTION_MODES)[CourseQuizInteractionMode],
                  ][]
                ).map(([id, meta]) => (
                  <option key={id} value={id}>
                    {meta.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {COURSE_QUIZ_INTERACTION_MODES[interactionMode].description}
              </p>
            </div>
            <div>
              <Label>新題預設單字顯示</Label>
              <select
                name="vocabulary_display"
                defaultValue={defaultVocabularyDisplay}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {(
                  Object.entries(COURSE_QUIZ_VOCABULARY_DISPLAYS) as [
                    CourseQuizVocabularyDisplay,
                    (typeof COURSE_QUIZ_VOCABULARY_DISPLAYS)[CourseQuizVocabularyDisplay],
                  ][]
                ).map(([id, meta]) => (
                  <option key={id} value={id}>
                    {meta.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-muted-foreground">
                僅影響之後新增的題目；各題可在題目編輯中個別設定。
              </p>
            </div>
            <div>
              <Label>XP</Label>
              <Input name="xp_reward" type="number" defaultValue={quiz.xp_reward} min={0} />
            </div>
            <div className="sm:col-span-2">
              <SubscriptionAccessFields
                mode="quiz"
                courseBasic={courseSubBasic}
                coursePro={courseSubPro}
                entityBasic={quiz.sub_basic_free}
                entityPro={quiz.sub_pro_free}
                planLabels={planLabels}
              />
            </div>
            <div className="flex flex-col gap-2 sm:col-span-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="require_to_continue"
                  defaultChecked={quiz.require_to_continue}
                />
                必須完成才可進入下一單元
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="require_to_complete_course"
                  defaultChecked={quiz.require_to_complete_course}
                />
                總測驗：必須完成才可完成課程
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="is_published"
                  defaultChecked={quiz.is_published}
                />
                已發布
              </label>
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit" size="sm" disabled={busy}>
                儲存設定
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                disabled={busy}
                onClick={deleteQuiz}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </form>

          {interactionMode === 'vocabulary_drop' ? (
            <div className="space-y-2 border-t border-border pt-4">
              <Label>圖形模式 · 進階自訂字型（選用）</Label>
              <CourseQuizShapeTypefaceUpload
                quizId={quiz.id}
                currentUrl={
                  (quiz as { shape_typeface_url?: string | null }).shape_typeface_url ?? null
                }
                disabled={busy}
                onMessage={onMessage}
                onDone={onDone}
              />
            </div>
          ) : null}

          <CourseQuizSequencePanel
            quizId={quiz.id}
            steps={steps}
            questions={questions}
            busy={busy}
            onMessage={onMessage}
            onDone={onDone}
            renderQuestionEditor={(questionId) => {
              const q = questions.find((item) => item.id === questionId);
              if (!q) return null;
              const qi = questions.findIndex((item) => item.id === questionId);
              return (
                <QuestionEditor
                  question={q}
                  choiceMode={choiceMode}
                  interactionMode={interactionMode}
                  defaultVocabularyDisplay={defaultVocabularyDisplay}
                  index={qi}
                  busy={busy}
                  onMessage={onMessage}
                  onDone={onDone}
                  azureSpeechConfigured={azureSpeechConfigured}
                  compact
                />
              );
            }}
            renderAddQuestion={() => (
              <AddQuestionForm
                quizId={quiz.id}
                choiceMode={choiceMode}
                interactionMode={interactionMode}
                defaultVocabularyDisplay={defaultVocabularyDisplay}
                busy={busy}
                onMessage={onMessage}
                onDone={onDone}
              />
            )}
          />
        </div>
      ) : null}
    </div>
  );
}

function QuestionEditor({
  question,
  choiceMode,
  interactionMode,
  defaultVocabularyDisplay,
  index,
  busy,
  onMessage,
  onDone,
  azureSpeechConfigured,
  compact = false,
}: {
  question: CourseQuizQuestion;
  choiceMode: CourseQuizChoiceMode;
  interactionMode: 'choice_grid' | 'vocabulary_drop';
  defaultVocabularyDisplay: CourseQuizVocabularyDisplay;
  index: number;
  busy: boolean;
  onMessage: (m: string | null) => void;
  onDone: () => void;
  azureSpeechConfigured: boolean;
  compact?: boolean;
}) {
  const optionCount = choiceCountForMode(choiceMode);
  const optionLabels = optionLabelsForMode(choiceMode);
  const optionImageUrls = parseOptionImageUrls(
    (question as { option_image_urls?: unknown }).option_image_urls,
    optionCount,
  );
  const optionShapeGlyphs = parseOptionShapeGlyphs(
    (question as { option_shape_glyphs?: unknown }).option_shape_glyphs,
    optionCount,
  );
  const savedVocabularyDisplay = resolveCourseQuizVocabularyDisplay(
    question.vocabulary_display ?? defaultVocabularyDisplay,
  );
  const [vocabularyDisplayDraft, setVocabularyDisplayDraft] =
    useState<CourseQuizVocabularyDisplay>(savedVocabularyDisplay);
  const [pending, startTransition] = useTransition();
  const [questionSpeechDraft, setQuestionSpeechDraft] = useState(
    () => question.question_speech_text ?? '',
  );
  const [videoUid, setVideoUid] = useState(() => question.cf_video_uid);
  const [correctVideoUid, setCorrectVideoUid] = useState(
    () => (question as unknown as { cf_correct_video_uid?: string | null }).cf_correct_video_uid ?? null,
  );
  const [wrongVideoUid, setWrongVideoUid] = useState(
    () => (question as unknown as { cf_wrong_video_uid?: string | null }).cf_wrong_video_uid ?? null,
  );
  const questionCorrectVideoUid =
    (question as unknown as { cf_correct_video_uid?: string | null }).cf_correct_video_uid ?? null;
  const questionWrongVideoUid =
    (question as unknown as { cf_wrong_video_uid?: string | null }).cf_wrong_video_uid ?? null;
  const opts = Array.isArray(question.options)
    ? (question.options as string[]).slice(0, optionCount)
    : [];
  while (opts.length < optionCount) opts.push('');

  useEffect(() => {
    setQuestionSpeechDraft(question.question_speech_text ?? '');
    setVideoUid(question.cf_video_uid);
    setCorrectVideoUid(questionCorrectVideoUid);
    setWrongVideoUid(questionWrongVideoUid);
    setVocabularyDisplayDraft(
      resolveCourseQuizVocabularyDisplay(
        question.vocabulary_display ?? defaultVocabularyDisplay,
      ),
    );
  }, [
    question.id,
    question.question_speech_text,
    question.cf_video_uid,
    question.vocabulary_display,
    questionCorrectVideoUid,
    questionWrongVideoUid,
    defaultVocabularyDisplay,
  ]);

  function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    onMessage(null);
    startTransition(async () => {
      const options = optionLabels.map((_, i) =>
        String(form.get(`option_${i}`) || ''),
      );
      const res = await updateCourseQuizQuestionAction(question.id, {
        quiz_id: question.quiz_id,
        question_text: String(form.get('question_text') || ''),
        question_speech_text: String(form.get('question_speech_text') || ''),
        options,
        correct_index: Number(form.get('correct_index') || 0),
        explanation: String(form.get('explanation') || ''),
        vocabulary_display:
          interactionMode === 'vocabulary_drop'
            ? parseVocabularyDisplay(form.get('vocabulary_display'))
            : 'character',
      });
      onMessage(res.success ?? res.error ?? null);
      onDone();
    });
  }

  function remove() {
    if (!confirm('刪除此題？')) return;
    startTransition(async () => {
      const res = await deleteCourseQuizQuestionAction(question.id);
      onMessage(res.success ?? res.error ?? null);
      onDone();
    });
  }

  return (
    <div className={compact ? 'space-y-3' : 'rounded-md border border-dashed border-border p-3'}>
      {!compact ? (
        <p className="mb-2 text-xs font-medium text-muted-foreground">第 {index + 1} 題</p>
      ) : null}
      <form onSubmit={save} className="space-y-3">
        <div>
          <Label>題目</Label>
          <textarea
            name="question_text"
            className={mentorTextareaClass}
            rows={2}
            defaultValue={question.question_text}
            required
          />
        </div>
        <div>
          <Label htmlFor={`question-speech-${question.id}`}>問題語音</Label>
          <p className="text-[11px] text-muted-foreground mb-1">
            供 Azure 朗讀的英文稿；產生語音時以此為準。留空則使用上方「題目」文字。
          </p>
          <textarea
            id={`question-speech-${question.id}`}
            name="question_speech_text"
            className={mentorTextareaClass}
            rows={2}
            value={questionSpeechDraft}
            onChange={(e) => setQuestionSpeechDraft(e.target.value)}
            placeholder="例：What color is the apple?"
          />
        </div>
        <CourseQuizSpeechPanel
          question={question}
          questionSpeechDraft={questionSpeechDraft}
          disabled={busy || pending}
          azureConfigured={azureSpeechConfigured}
          onMessage={onMessage}
          onDone={onDone}
        />
        {optionLabels.map((label, i) => (
          <div key={label}>
            <Label>選項 {label}</Label>
            <Input name={`option_${i}`} defaultValue={opts[i]} required />
          </div>
        ))}
        <div>
          <Label>正確答案</Label>
          <select
            name="correct_index"
            defaultValue={String(
              Math.min(question.correct_index, optionCount - 1),
            )}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {optionLabels.map((label, i) => (
              <option key={label} value={String(i)}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>解析（選填）</Label>
          <textarea
            name="explanation"
            className={mentorTextareaClass}
            rows={2}
            defaultValue={question.explanation ?? ''}
          />
        </div>
        {interactionMode === 'vocabulary_drop' ? (
          <div>
            <Label htmlFor={`vocabulary-display-${question.id}`}>單字顯示</Label>
            <select
              id={`vocabulary-display-${question.id}`}
              name="vocabulary_display"
              value={vocabularyDisplayDraft}
              onChange={(e) =>
                setVocabularyDisplayDraft(parseVocabularyDisplay(e.target.value))
              }
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {(
                Object.entries(COURSE_QUIZ_VOCABULARY_DISPLAYS) as [
                  CourseQuizVocabularyDisplay,
                  (typeof COURSE_QUIZ_VOCABULARY_DISPLAYS)[CourseQuizVocabularyDisplay],
                ][]
              ).map(([id, meta]) => (
                <option key={id} value={id}>
                  {meta.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {COURSE_QUIZ_VOCABULARY_DISPLAYS[vocabularyDisplayDraft].description}
            </p>
          </div>
        ) : null}
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={busy || pending}>
            儲存題目
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={busy || pending} onClick={remove}>
            刪除
          </Button>
        </div>
      </form>

      <div className="space-y-2 border-t border-border pt-3">
        <Label>題目影片（Cloudflare Stream）</Label>
        {videoUid ? (
          <p className="text-xs text-muted-foreground">UID: {videoUid}</p>
        ) : (
          <p className="text-xs text-muted-foreground">尚未上傳影片</p>
        )}
        <CourseQuizQuestionVideoUpload
          questionId={question.id}
          kind="question"
          label="上傳題目影片"
          disabled={busy || pending}
          onSaved={(uid) => {
            setVideoUid(uid);
            onMessage('影片已連結');
            onDone();
          }}
        />
      </div>

      {interactionMode === 'vocabulary_drop' ? (
        <div className="space-y-2 border-t border-border pt-3">
          <Label>單字模式結果影片（答對 / 答錯）</Label>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              {correctVideoUid ? (
                <p className="text-xs text-muted-foreground">答對 UID: {correctVideoUid}</p>
              ) : (
                <p className="text-xs text-muted-foreground">尚未上傳答對影片</p>
              )}
              <CourseQuizQuestionVideoUpload
                questionId={question.id}
                kind="correct"
                label="上傳答對影片"
                disabled={busy || pending}
                onSaved={(uid) => {
                  setCorrectVideoUid(uid);
                  onMessage('答對影片已連結');
                  onDone();
                }}
              />
            </div>
            <div className="space-y-2">
              {wrongVideoUid ? (
                <p className="text-xs text-muted-foreground">答錯 UID: {wrongVideoUid}</p>
              ) : (
                <p className="text-xs text-muted-foreground">尚未上傳答錯影片</p>
              )}
              <CourseQuizQuestionVideoUpload
                questionId={question.id}
                kind="wrong"
                label="上傳答錯影片"
                disabled={busy || pending}
                onSaved={(uid) => {
                  setWrongVideoUid(uid);
                  onMessage('答錯影片已連結');
                  onDone();
                }}
              />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            單字模式：答題後會先播對/錯影片，播完才會顯示 WELL DONE！/NICE TRY！
          </p>
        </div>
      ) : null}

      {interactionMode === 'vocabulary_drop' && vocabularyDisplayDraft === 'shape' ? (
        <CourseQuizOptionVisualFields
          questionId={question.id}
          optionLabels={optionLabels}
          imageUrls={optionImageUrls}
          shapeGlyphs={optionShapeGlyphs}
          disabled={busy || pending}
          onMessage={onMessage}
          onDone={onDone}
        />
      ) : null}
    </div>
  );
}

function AddQuestionForm({
  quizId,
  choiceMode,
  interactionMode,
  defaultVocabularyDisplay,
  busy,
  onMessage,
  onDone,
}: {
  quizId: string;
  choiceMode: CourseQuizChoiceMode;
  interactionMode: 'choice_grid' | 'vocabulary_drop';
  defaultVocabularyDisplay: CourseQuizVocabularyDisplay;
  busy: boolean;
  onMessage: (m: string | null) => void;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const optionLabels = optionLabelsForMode(choiceMode);

  function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    onMessage(null);
    const options = optionLabels.map((_, i) => String(form.get(`option_${i}`) || ''));
    startTransition(async () => {
      const res = await createCourseQuizQuestionAction({
        quiz_id: quizId,
        question_text: String(form.get('question_text') || ''),
        question_speech_text: String(form.get('question_speech_text') || ''),
        options,
        correct_index: Number(form.get('correct_index') || 0),
        explanation: String(form.get('explanation') || ''),
        vocabulary_display:
          interactionMode === 'vocabulary_drop'
            ? parseVocabularyDisplay(
                form.get('vocabulary_display') ?? defaultVocabularyDisplay,
              )
            : 'character',
      });
      onMessage(res.success ?? res.error ?? null);
      onDone();
    });
  }

  return (
    <form onSubmit={add} className="rounded-md bg-muted/40 p-3 space-y-3">
      <p className="text-sm font-medium">新增題目</p>
      <textarea
        name="question_text"
        className={mentorTextareaClass}
        rows={2}
        placeholder="題目文字（畫面顯示）"
        required
      />
      <div>
        <Label className="text-xs">問題語音（選填）</Label>
        <textarea
          name="question_speech_text"
          className={mentorTextareaClass}
          rows={2}
          placeholder="Azure 朗讀用英文；留空則用題目文字"
        />
      </div>
      {optionLabels.map((label, i) => (
        <Input key={label} name={`option_${i}`} placeholder={`選項 ${label}`} required />
      ))}
      {interactionMode === 'vocabulary_drop' ? (
        <div>
          <Label className="text-xs">單字顯示</Label>
          <select
            name="vocabulary_display"
            defaultValue={defaultVocabularyDisplay}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {(
              Object.entries(COURSE_QUIZ_VOCABULARY_DISPLAYS) as [
                CourseQuizVocabularyDisplay,
                (typeof COURSE_QUIZ_VOCABULARY_DISPLAYS)[CourseQuizVocabularyDisplay],
              ][]
            ).map(([id, meta]) => (
              <option key={id} value={id}>
                {meta.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <select
        name="correct_index"
        defaultValue="0"
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      >
        {optionLabels.map((label, i) => (
          <option key={label} value={String(i)}>
            正確：{label}
          </option>
        ))}
      </select>
      <Button type="submit" size="sm" disabled={busy || pending}>
        <Plus className="mr-1 h-4 w-4" />
        新增題目
      </Button>
    </form>
  );
}
