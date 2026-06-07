'use client';

import { useRef, useState, useTransition, type ChangeEvent, type FormEvent } from 'react';
import { Loader2, Upload } from 'lucide-react';

import { updateQuizGameVideos } from '@/lib/admin/quiz-game-actions';
import {
  parseQuizCinemaConfig,
  QUIZ_CINEMA_FORM_FIELDS,
  QUIZ_CINEMA_LEVEL_META,
} from '@/lib/quiz-game-config';
import { HOMEPAGE_VIDEO_ACCEPT, uploadHomepageMedia } from '@/lib/homepage-storage';
import { createClient } from '@/lib/supabase/client';
import type { HomepageConfig, QuizDifficultyLevel } from '@/types/database.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Props = {
  initial: HomepageConfig | null;
};

type UploadKey = `${QuizDifficultyLevel}-start` | `${QuizDifficultyLevel}-complete`;

type LevelUrls = { start: string; complete: string };

const inputClass =
  'border-zinc-700 bg-zinc-950/80 text-zinc-100 placeholder:text-zinc-500';

function readUrlsFromRow(row: HomepageConfig | null): Record<QuizDifficultyLevel, LevelUrls> {
  const cinema = parseQuizCinemaConfig(row);
  return Object.fromEntries(
    QUIZ_CINEMA_LEVEL_META.map(({ id }) => [
      id,
      {
        start: cinema[id].startVideoUrl ?? '',
        complete: cinema[id].completeVideoUrl ?? '',
      },
    ]),
  ) as Record<QuizDifficultyLevel, LevelUrls>;
}

export function QuizGameVideosForm({ initial }: Props) {
  const [urlsByLevel, setUrlsByLevel] = useState(() => readUrlsFromRow(initial));
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [uploading, setUploading] = useState<UploadKey | null>(null);

  const fileRefMap = useRef<Partial<Record<UploadKey, HTMLInputElement | null>>>({});

  function setLevelUrl(
    level: QuizDifficultyLevel,
    kind: 'start' | 'complete',
    value: string,
  ) {
    setUrlsByLevel((prev) => ({
      ...prev,
      [level]: { ...prev[level], [kind]: value },
    }));
  }

  async function handleVideoFile(
    e: ChangeEvent<HTMLInputElement>,
    level: QuizDifficultyLevel,
    kind: 'start' | 'complete',
  ) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const key: UploadKey = `${level}-${kind}`;
    setMessage(null);
    setUploading(key);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setMessage({ type: 'err', text: '請先登入。' });
        return;
      }

      const res = await uploadHomepageMedia(supabase, file, 'video');
      if (!res.ok) {
        setMessage({ type: 'err', text: res.error });
        return;
      }

      setLevelUrl(level, kind, res.publicUrl);
      setMessage({ type: 'ok', text: '影片已上傳，請按「儲存設定」套用到遊戲。' });
    } finally {
      setUploading(null);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const formData = new FormData();
    for (const { id } of QUIZ_CINEMA_LEVEL_META) {
      const fields = QUIZ_CINEMA_FORM_FIELDS[id];
      formData.set(fields.start, urlsByLevel[id].start.trim());
      formData.set(fields.complete, urlsByLevel[id].complete.trim());
    }
    setMessage(null);
    startTransition(async () => {
      const res = await updateQuizGameVideos(formData);
      if (res.ok) setMessage({ type: 'ok', text: '已儲存，各難度影片已套用至遊戲。' });
      else setMessage({ type: 'err', text: res.error });
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-10">
      {QUIZ_CINEMA_LEVEL_META.map(({ id, label, stageNumber }) => (
        <section
          key={id}
          className="space-y-4 rounded-xl border border-zinc-700 bg-zinc-900/50 p-4 md:p-5"
        >
          <div>
            <h3 className="text-base font-semibold text-zinc-100">
              {label}
              <span className="ml-2 text-sm font-normal text-zinc-500">
                STAGE {stageNumber}
              </span>
            </h3>
            <p className="mt-1 text-xs text-zinc-500">
              玩家進入此難度關卡時使用的開局與過關影片。
            </p>
          </div>

          <VideoField
            id={QUIZ_CINEMA_FORM_FIELDS[id].start}
            label="開局影片"
            hint="載入題目後播放；播畢後顯示 STAGE 提示再開始答題。留空則跳過影片。"
            url={urlsByLevel[id].start}
            onUrlChange={(v) => setLevelUrl(id, 'start', v)}
            onClear={() => setLevelUrl(id, 'start', '')}
            uploading={uploading === `${id}-start`}
            onPickFile={() => fileRefMap.current[`${id}-start`]?.click()}
            onFileChange={(e) => void handleVideoFile(e, id, 'start')}
            fileRef={(el) => {
              fileRefMap.current[`${id}-start`] = el;
            }}
          />

          <VideoField
            id={QUIZ_CINEMA_FORM_FIELDS[id].complete}
            label="過關影片"
            hint="達晉級分數後，在「測驗完成」畫面前播放。留空則直接結算。"
            url={urlsByLevel[id].complete}
            onUrlChange={(v) => setLevelUrl(id, 'complete', v)}
            onClear={() => setLevelUrl(id, 'complete', '')}
            uploading={uploading === `${id}-complete`}
            onPickFile={() => fileRefMap.current[`${id}-complete`]?.click()}
            onFileChange={(e) => void handleVideoFile(e, id, 'complete')}
            fileRef={(el) => {
              fileRefMap.current[`${id}-complete`] = el;
            }}
          />
        </section>
      ))}

      {message ? (
        <p
          className={
            message.type === 'ok' ? 'text-sm text-emerald-400' : 'text-sm text-red-400'
          }
        >
          {message.text}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={pending || uploading !== null}
        className="bg-violet-600 text-white hover:bg-violet-500"
      >
        {pending ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            儲存中…
          </>
        ) : (
          '儲存設定'
        )}
      </Button>
    </form>
  );
}

function VideoField({
  id,
  label,
  hint,
  url,
  onUrlChange,
  onClear,
  uploading,
  onPickFile,
  onFileChange,
  fileRef,
}: {
  id: string;
  label: string;
  hint: string;
  url: string;
  onUrlChange: (v: string) => void;
  onClear: () => void;
  uploading: boolean;
  onPickFile: () => void;
  onFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  fileRef: (el: HTMLInputElement | null) => void;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
      <div>
        <Label htmlFor={id} className="text-zinc-200">
          {label}
        </Label>
        <p className="mt-1 text-xs text-zinc-500">{hint}</p>
      </div>
      <Input
        id={id}
        name={id}
        type="url"
        placeholder="https://…（MP4 / WebM）"
        value={url}
        onChange={(e) => onUrlChange(e.target.value)}
        autoComplete="off"
        className={inputClass}
      />
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept={HOMEPAGE_VIDEO_ACCEPT}
          className="sr-only"
          aria-hidden
          tabIndex={-1}
          onChange={onFileChange}
        />
        <Button
          type="button"
          variant="outline"
          disabled={uploading}
          className="border-zinc-600 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
          onClick={onPickFile}
        >
          {uploading ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              上傳中…
            </>
          ) : (
            <>
              <Upload className="mr-2 size-4" />
              上傳影片
            </>
          )}
        </Button>
        {url ? (
          <Button
            type="button"
            variant="ghost"
            className="text-zinc-400 hover:text-zinc-200"
            onClick={onClear}
          >
            清除
          </Button>
        ) : null}
      </div>
      {url ? (
        <video
          src={url}
          controls
          playsInline
          preload="metadata"
          className="max-h-40 w-full rounded-md border border-zinc-700 bg-black"
        />
      ) : null}
    </div>
  );
}
