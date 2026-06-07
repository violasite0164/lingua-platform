'use client';

import { useMemo, useState, useTransition } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Volume2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { questionSpeechSource } from '@/lib/course-quiz/speech-text';
import { generateCourseQuizQuestionSpeechAction } from '@/lib/mentor/course-quiz-speech-actions';
import type { CourseQuizQuestion } from '@/types/database.types';
import { cn } from '@/lib/utils';

function parseOptionAudioUrls(question: CourseQuizQuestion): string[] {
  const raw = question.option_audio_urls;
  return Array.isArray(raw) ? raw.map(String) : [];
}

export function CourseQuizSpeechPanel({
  question,
  questionSpeechDraft,
  disabled,
  azureConfigured,
  onMessage,
  onDone,
}: {
  question: CourseQuizQuestion;
  /** 表單內「問題語音」目前內容（含未儲存） */
  questionSpeechDraft: string;
  disabled?: boolean;
  azureConfigured: boolean;
  onMessage: (m: string | null) => void;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [localMsg, setLocalMsg] = useState<{
    type: 'error' | 'success';
    text: string;
  } | null>(null);

  const optionUrls = parseOptionAudioUrls(question);
  const optionCount = Array.isArray(question.options)
    ? (question.options as string[]).length
    : 0;

  const speechPreview = useMemo(
    () =>
      questionSpeechSource({
        question_speech_text: questionSpeechDraft,
        question_text: question.question_text,
      }),
    [questionSpeechDraft, question.question_text],
  );

  const usesSpeechField = questionSpeechDraft.trim().length > 0;

  function generate() {
    setLocalMsg(null);
    onMessage(null);

    if (!azureConfigured) {
      const text =
        '伺服器未讀到 Azure 設定。請在 .env.local 加入 AZURE_SPEECH_KEY、AZURE_SPEECH_REGION 後重啟 npm run dev。';
      setLocalMsg({ type: 'error', text });
      onMessage(text);
      return;
    }

    startTransition(async () => {
      try {
        const res = await generateCourseQuizQuestionSpeechAction(question.id, {
          question_speech_text: questionSpeechDraft,
        });
        const text = res.success ?? res.error ?? '語音產生未完成';
        if (res.error) {
          setLocalMsg({ type: 'error', text });
        } else {
          setLocalMsg({ type: 'success', text });
        }
        onMessage(text);
        onDone();
      } catch (e) {
        const text = e instanceof Error ? e.message : '語音產生失敗';
        setLocalMsg({ type: 'error', text });
        onMessage(text);
      }
    });
  }

  return (
    <div className="rounded-md border border-border/80 bg-muted/30 p-3 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium text-foreground">Azure 英文語音</p>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={disabled || pending}
          onClick={generate}
        >
          {pending ? (
            <>
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              產生中…
            </>
          ) : (
            <>
              <Volume2 className="mr-1 h-3.5 w-3.5" />
              產生題目與選項語音
            </>
          )}
        </Button>
      </div>

      {!azureConfigured ? (
        <p className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          尚未偵測到 Azure 環境變數（需重啟 dev server）。
        </p>
      ) : null}

      {localMsg ? (
        <p
          className={cn(
            'flex items-start gap-1.5 text-xs font-medium',
            localMsg.type === 'error'
              ? 'text-destructive'
              : 'text-green-700 dark:text-green-400',
          )}
          role="alert"
        >
          {localMsg.type === 'error' ? (
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          ) : (
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          )}
          {localMsg.text}
        </p>
      ) : null}

      <p className="text-[11px] text-muted-foreground leading-relaxed">
        題目語音依「問題語音」欄位產生（有填寫時不會使用「題目」文字）。產生前會自動儲存問題語音。
        選項語音仍依各選項文字。
      </p>
      {speechPreview ? (
        <p className="text-[11px] text-muted-foreground">
          將朗讀{usesSpeechField ? '（問題語音）' : '（題目）'}：「
          {speechPreview.length > 80 ? `${speechPreview.slice(0, 80)}…` : speechPreview}」
        </p>
      ) : (
        <p className="text-[11px] text-amber-700 dark:text-amber-400">
          請先填寫「問題語音」或「題目」。
        </p>
      )}
      <ul className="text-[11px] text-muted-foreground space-y-0.5">
        <li>
          題目語音：{question.question_audio_url ? '✓ 已產生' : '— 尚未產生'}
          {question.question_audio_url ? (
            <audio
              className="mt-1 block h-7 max-w-full"
              controls
              preload="none"
              src={question.question_audio_url}
            />
          ) : null}
        </li>
        {Array.from({ length: optionCount }, (_, i) => (
          <li key={i}>
            選項 {String.fromCharCode(65 + i)}：
            {optionUrls[i] ? ' ✓ 已產生' : ' — 尚未產生'}
          </li>
        ))}
      </ul>
    </div>
  );
}
