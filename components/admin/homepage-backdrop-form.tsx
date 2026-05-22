'use client';

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
  type FormEvent,
} from 'react';
import { Loader2, Upload } from 'lucide-react';

import { MarketingThemePicker } from '@/components/admin/marketing-theme-picker';
import { updateHomepageBackdrop } from '@/lib/admin/homepage-actions';
import {
  resolveMarketingThemePreset,
  type MarketingThemePresetId,
} from '@/lib/marketing-theme';
import { HOME_TEACHERS } from '@/lib/marketing-home-content';
import {
  HOMEPAGE_BACKGROUND_IMAGE_SLOTS,
  HOME_QUIZ_CTA_MAX_LEN,
  HOME_QUIZ_INTRO_MAX_LEN,
  normalizeHexColor,
  parseBackgroundImageUrlsFromDb,
  TEACHERS_CARD_COUNT,
} from '@/lib/homepage-public';
import {
  HOMEPAGE_IMAGE_ACCEPT,
  HOMEPAGE_VIDEO_ACCEPT,
  uploadHomepageMedia,
} from '@/lib/homepage-storage';
import { createClient } from '@/lib/supabase/client';
import type { HomepageConfig } from '@/types/database.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type Props = {
  initial: HomepageConfig | null;
};

const inputClass =
  'border-zinc-700 bg-zinc-950/80 text-zinc-100 placeholder:text-zinc-500';

const HOME_TEACHERS_CARD_FIELDS = [
  'home_teachers_card_1_image_url',
  'home_teachers_card_2_image_url',
  'home_teachers_card_3_image_url',
] as const;

function readTeachersCardUrlsFromRow(row: HomepageConfig | null): [string, string, string] {
  return [
    row?.home_teachers_card_1_image_url ?? '',
    row?.home_teachers_card_2_image_url ?? '',
    row?.home_teachers_card_3_image_url ?? '',
  ];
}

function readBackgroundImageUrlsFromRow(row: HomepageConfig | null): string[] {
  const parsed = parseBackgroundImageUrlsFromDb(
    row?.background_image_urls,
    row?.background_image_url,
  );
  const slots = Array.from({ length: HOMEPAGE_BACKGROUND_IMAGE_SLOTS }, () => '');
  parsed.forEach((url, i) => {
    if (i < HOMEPAGE_BACKGROUND_IMAGE_SLOTS) slots[i] = url;
  });
  return slots;
}

/** 遮罩 0–1；統一解析 DB 可能回傳的字串／逗號小數 */
function clampOverlayOpacity(raw: unknown): number {
  const n =
    typeof raw === 'number'
      ? raw
      : Number.parseFloat(String(raw ?? '').trim().replace(',', '.'));
  if (Number.isNaN(n)) return 0.45;
  return Math.round(Math.min(1, Math.max(0, n)) * 100) / 100;
}

export function HomepageBackdropForm({ initial }: Props) {
  const defaults = initial ?? {
    id: 1,
    background_image_url: null,
    background_video_url: null,
    home_quiz_result_background_image_url: null,
    overlay_opacity: 0.45,
    updated_at: '',
  };

  const [backgroundImageUrls, setBackgroundImageUrls] = useState<string[]>(() =>
    readBackgroundImageUrlsFromRow(initial),
  );
  const [videoUrl, setVideoUrl] = useState(defaults.background_video_url ?? '');
  const [quizResultBgUrl, setQuizResultBgUrl] = useState(
    defaults.home_quiz_result_background_image_url ?? '',
  );
  const [overlayOpacity, setOverlayOpacity] = useState(() =>
    clampOverlayOpacity(initial?.overlay_opacity ?? defaults.overlay_opacity),
  );
  const [imageEnabled, setImageEnabled] = useState(initial?.background_image_enabled ?? true);
  const [videoEnabled, setVideoEnabled] = useState(initial?.background_video_enabled ?? true);
  const [headingLight, setHeadingLight] = useState(
    () => normalizeHexColor(initial?.heading_text_color_light) ?? '',
  );
  const [headingDark, setHeadingDark] = useState(
    () => normalizeHexColor(initial?.heading_text_color_dark) ?? '',
  );
  const [quizIntro, setQuizIntro] = useState(() => initial?.home_quiz_intro_text ?? '');
  const [quizCta, setQuizCta] = useState(() => initial?.home_quiz_cta_text ?? '');
  const [featuresStudentUrl, setFeaturesStudentUrl] = useState(
    () => initial?.features_student_image_url ?? '',
  );
  const [teachersCardUrls, setTeachersCardUrls] = useState<[string, string, string]>(() =>
    readTeachersCardUrlsFromRow(initial),
  );
  const [marketingTheme, setMarketingTheme] = useState<MarketingThemePresetId>(() =>
    resolveMarketingThemePreset(initial?.marketing_theme_preset),
  );
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [uploading, setUploading] = useState<
    | 'video'
    | 'quizResultImage'
    | 'featuresStudent'
    | 'bg0'
    | 'bg1'
    | 'bg2'
    | 'bg3'
    | 'bg4'
    | 0
    | 1
    | 2
    | null
  >(null);

  const backgroundImageFileRefs = Array.from({ length: HOMEPAGE_BACKGROUND_IMAGE_SLOTS }, () =>
    useRef<HTMLInputElement>(null),
  );
  const videoFileRef = useRef<HTMLInputElement>(null);
  const quizResultImageFileRef = useRef<HTMLInputElement>(null);
  const featuresStudentFileRef = useRef<HTMLInputElement>(null);
  const teachersCardFileRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  useEffect(() => {
    setOverlayOpacity(clampOverlayOpacity(initial?.overlay_opacity ?? 0.45));
  }, [initial?.overlay_opacity]);

  useEffect(() => {
    setBackgroundImageUrls(readBackgroundImageUrlsFromRow(initial));
    setVideoUrl(initial?.background_video_url ?? '');
  }, [initial?.background_image_url, initial?.background_image_urls, initial?.background_video_url]);

  useEffect(() => {
    setQuizResultBgUrl(initial?.home_quiz_result_background_image_url ?? '');
  }, [initial?.home_quiz_result_background_image_url]);

  useEffect(() => {
    setImageEnabled(initial?.background_image_enabled ?? true);
    setVideoEnabled(initial?.background_video_enabled ?? true);
  }, [initial?.background_image_enabled, initial?.background_video_enabled]);

  useEffect(() => {
    setHeadingLight(normalizeHexColor(initial?.heading_text_color_light) ?? '');
    setHeadingDark(normalizeHexColor(initial?.heading_text_color_dark) ?? '');
  }, [initial?.heading_text_color_light, initial?.heading_text_color_dark]);

  useEffect(() => {
    setQuizIntro(initial?.home_quiz_intro_text ?? '');
    setQuizCta(initial?.home_quiz_cta_text ?? '');
  }, [initial?.home_quiz_intro_text, initial?.home_quiz_cta_text]);

  useEffect(() => {
    setFeaturesStudentUrl(initial?.features_student_image_url ?? '');
  }, [initial?.features_student_image_url]);

  useEffect(() => {
    setTeachersCardUrls(readTeachersCardUrlsFromRow(initial));
  }, [
    initial?.home_teachers_card_1_image_url,
    initial?.home_teachers_card_2_image_url,
    initial?.home_teachers_card_3_image_url,
  ]);

  useEffect(() => {
    setMarketingTheme(resolveMarketingThemePreset(initial?.marketing_theme_preset));
  }, [initial?.marketing_theme_preset]);

  function setBackgroundImageUrl(slotIndex: number, value: string) {
    setBackgroundImageUrls((prev) => {
      const next = [...prev];
      while (next.length < HOMEPAGE_BACKGROUND_IMAGE_SLOTS) next.push('');
      next[slotIndex] = value;
      return next;
    });
  }

  async function handleBackgroundImageFile(
    slotIndex: number,
    e: ChangeEvent<HTMLInputElement>,
  ) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setMessage(null);
    const uploadKey = `bg${slotIndex}` as 'bg0' | 'bg1' | 'bg2' | 'bg3' | 'bg4';
    setUploading(uploadKey);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setMessage({ type: 'err', text: '請先登入。' });
        return;
      }

      const res = await uploadHomepageMedia(supabase, file, 'image');
      if (!res.ok) setMessage({ type: 'err', text: res.error });
      else {
        setBackgroundImageUrl(slotIndex, res.publicUrl);
        setMessage({
          type: 'ok',
          text: `背景圖 ${slotIndex + 1} 已上傳，請按「儲存設定」套用至首頁。`,
        });
      }
    } finally {
      setUploading(null);
    }
  }

  function removeBackgroundImage(slotIndex: number) {
    setBackgroundImageUrl(slotIndex, '');
    setMessage({
      type: 'ok',
      text: `已移除背景圖 ${slotIndex + 1}（請按「儲存設定」套用）。`,
    });
  }

  async function handleVideoFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setMessage(null);
    setUploading('video');
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
      if (!res.ok) setMessage({ type: 'err', text: res.error });
      else {
        setVideoUrl(res.publicUrl);
        setMessage({ type: 'ok', text: '影片已上傳，請按「儲存設定」套用至首頁。' });
      }
    } finally {
      setUploading(null);
    }
  }

  function removeBackgroundVideo() {
    setVideoUrl('');
    setVideoEnabled(false);
    setMessage({ type: 'ok', text: '已移除背景影片設定（請按「儲存設定」套用）。' });
  }

  async function handleQuizResultImageFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setMessage(null);
    setUploading('quizResultImage');
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setMessage({ type: 'err', text: '請先登入。' });
        return;
      }

      const res = await uploadHomepageMedia(supabase, file, 'image');
      if (!res.ok) setMessage({ type: 'err', text: res.error });
      else {
        setQuizResultBgUrl(res.publicUrl);
        setMessage({ type: 'ok', text: '結果背景圖已上傳，請按「儲存設定」套用。' });
      }
    } finally {
      setUploading(null);
    }
  }

  function removeQuizResultImage() {
    setQuizResultBgUrl('');
    setMessage({ type: 'ok', text: '已移除結果背景圖設定（請按「儲存設定」套用）。' });
  }

  async function handleFeaturesStudentFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setMessage(null);
    setUploading('featuresStudent');
    try {
      const supabase = createClient();
      const res = await uploadHomepageMedia(supabase, file, 'image');
      if (!res.ok) setMessage({ type: 'err', text: res.error });
      else {
        setFeaturesStudentUrl(res.publicUrl);
        setMessage({ type: 'ok', text: '賣點區插圖已上傳，請按「儲存設定」套用。' });
      }
    } finally {
      setUploading(null);
    }
  }

  function removeFeaturesStudentImage() {
    setFeaturesStudentUrl('');
    setMessage({ type: 'ok', text: '已移除插圖（請按「儲存設定」套用；首頁將不顯示右側圖片）。' });
  }

  async function handleTeachersCardFile(cardIndex: 0 | 1 | 2, e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setMessage(null);
    setUploading(cardIndex);
    try {
      const supabase = createClient();
      const res = await uploadHomepageMedia(supabase, file, 'image');
      if (!res.ok) setMessage({ type: 'err', text: res.error });
      else {
        setTeachersCardUrls((prev) => {
          const next = [...prev] as [string, string, string];
          next[cardIndex] = res.publicUrl;
          return next;
        });
        setMessage({
          type: 'ok',
          text: `說明卡 ${cardIndex + 1} 圖片已上傳，請按「儲存設定」套用。`,
        });
      }
    } finally {
      setUploading(null);
    }
  }

  function removeTeachersCardImage(cardIndex: 0 | 1 | 2) {
    setTeachersCardUrls((prev) => {
      const next = [...prev] as [string, string, string];
      next[cardIndex] = '';
      return next;
    });
    setMessage({
      type: 'ok',
      text: `已移除說明卡 ${cardIndex + 1} 圖片（請按「儲存設定」套用）。`,
    });
  }

  function setTeachersCardUrl(cardIndex: 0 | 1 | 2, value: string) {
    setTeachersCardUrls((prev) => {
      const next = [...prev] as [string, string, string];
      next[cardIndex] = value;
      return next;
    });
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData();
    for (let i = 0; i < HOMEPAGE_BACKGROUND_IMAGE_SLOTS; i++) {
      formData.set(`background_image_url_${i}`, (backgroundImageUrls[i] ?? '').trim());
    }
    formData.set('background_video_url', videoUrl.trim());
    formData.set('home_quiz_result_background_image_url', quizResultBgUrl.trim());
    formData.set('overlay_opacity', String(overlayOpacity));
    formData.set('background_image_enabled', imageEnabled ? 'true' : 'false');
    formData.set('background_video_enabled', videoEnabled ? 'true' : 'false');
    formData.set('heading_text_color_light', headingLight.trim());
    formData.set('heading_text_color_dark', headingDark.trim());
    formData.set('home_quiz_intro_text', quizIntro);
    formData.set('home_quiz_cta_text', quizCta);
    formData.set('features_student_image_url', featuresStudentUrl.trim());
    for (let i = 0; i < TEACHERS_CARD_COUNT; i++) {
      formData.set(HOME_TEACHERS_CARD_FIELDS[i], teachersCardUrls[i].trim());
    }
    formData.set('marketing_theme_preset', marketingTheme);
    setMessage(null);
    startTransition(async () => {
      const res = await updateHomepageBackdrop(formData);
      if (res.ok) setMessage({ type: 'ok', text: '已儲存並更新首頁設定。' });
      else setMessage({ type: 'err', text: res.error });
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4 rounded-lg border border-zinc-700 bg-zinc-900/40 p-4">
        <div>
          <p className="text-sm font-medium text-zinc-200">首頁背景圖片（最多 {HOMEPAGE_BACKGROUND_IMAGE_SLOTS} 張）</p>
          <p className="mt-1 text-xs text-zinc-500">
            訪客每次進入首頁會隨機顯示其中一張。可上傳或貼 HTTPS 連結；若同時設定影片，隨機圖可作為載入前的封面。
          </p>
        </div>
        {Array.from({ length: HOMEPAGE_BACKGROUND_IMAGE_SLOTS }, (_, slotIndex) => {
          const url = backgroundImageUrls[slotIndex] ?? '';
          const uploadKey = `bg${slotIndex}` as 'bg0' | 'bg1' | 'bg2' | 'bg3' | 'bg4';
          const fieldId = `background_image_url_${slotIndex}`;
          return (
            <div
              key={fieldId}
              className="space-y-2 border-t border-zinc-800 pt-4 first:border-t-0 first:pt-0"
            >
              <Label htmlFor={fieldId} className="text-zinc-200">
                背景圖 {slotIndex + 1}
              </Label>
              <Input
                id={fieldId}
                name={fieldId}
                type="url"
                placeholder="https://…（選填）"
                value={url}
                onChange={(ev) => setBackgroundImageUrl(slotIndex, ev.target.value)}
                autoComplete="off"
                className={inputClass}
              />
              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={backgroundImageFileRefs[slotIndex]}
                  type="file"
                  accept={HOMEPAGE_IMAGE_ACCEPT}
                  className="sr-only"
                  aria-hidden
                  tabIndex={-1}
                  onChange={(ev) => handleBackgroundImageFile(slotIndex, ev)}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={uploading !== null}
                  className="border-zinc-600 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
                  onClick={() => backgroundImageFileRefs[slotIndex].current?.click()}
                >
                  {uploading === uploadKey ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      上傳中…
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 size-4" />
                      上傳圖片
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={uploading !== null || !url.trim()}
                  className="border-zinc-700 bg-zinc-950/60 text-zinc-200 hover:bg-zinc-900 disabled:opacity-50"
                  onClick={() => removeBackgroundImage(slotIndex)}
                >
                  移除
                </Button>
              </div>
              {url.trim() ? (
                <div className="mt-2 overflow-hidden rounded-lg border border-zinc-700 bg-zinc-950 p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url.trim()}
                    alt={`背景圖 ${slotIndex + 1} 預覽`}
                    className="mx-auto max-h-36 w-full object-contain"
                  />
                </div>
              ) : (
                <p className="text-xs text-zinc-600">尚無圖片</p>
              )}
            </div>
          );
        })}
        <p className="text-xs text-zinc-500">JPEG / PNG / WebP / GIF，單檔最大 12 MiB</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="background_video_url" className="text-zinc-200">
          背景影片 URL
        </Label>
        <Input
          id="background_video_url"
          name="background_video_url"
          type="url"
          placeholder="https://… 或 YouTube 連結"
          value={videoUrl}
          onChange={(ev) => setVideoUrl(ev.target.value)}
          autoComplete="off"
          className={inputClass}
        />
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={videoFileRef}
            type="file"
            accept={HOMEPAGE_VIDEO_ACCEPT}
            className="sr-only"
            aria-hidden
            tabIndex={-1}
            onChange={handleVideoFile}
          />
          <Button
            type="button"
            variant="outline"
            disabled={uploading !== null}
            className="border-zinc-600 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
            onClick={() => videoFileRef.current?.click()}
          >
            {uploading === 'video' ? (
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
          <Button
            type="button"
            variant="outline"
            disabled={uploading !== null || !videoUrl.trim()}
            className="border-zinc-700 bg-zinc-950/60 text-zinc-200 hover:bg-zinc-900 disabled:opacity-50"
            onClick={removeBackgroundVideo}
          >
            移除
          </Button>
          <span className="text-xs text-zinc-500">MP4 / MOV / WebM，最大 100 MiB</span>
        </div>
        <p className="text-xs text-zinc-500">
          可貼直連影片（MP4 等）、YouTube 一般／Shorts／嵌入網址（youtu.be 亦可），或本機上傳；首頁會靜音循環播放；僅填圖片時則為靜態背景。YouTube
          以嵌入顯示。          若出現「Sign in to confirm you are not a bot」為 **YouTube 端限制**（嵌入／自動播放常被判定異常），網站無法強制跳過；請改用後台上傳
          MP4、或直接連結檔案。嵌入問題請確認允許嵌入，並設好{' '}
          <code className="rounded bg-zinc-950 px-1">NEXT_PUBLIC_APP_URL</code>
          ；不需 nocookie 時勿設定{' '}
          <code className="rounded bg-zinc-950 px-1">NEXT_PUBLIC_YOUTUBE_EMBED_USE_NOCOOKIE</code>
          。
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="home_quiz_result_background_image_url" className="text-zinc-200">
          HomeQuiz 結果畫面背景圖 URL
        </Label>
        <Input
          id="home_quiz_result_background_image_url"
          name="home_quiz_result_background_image_url"
          type="url"
          placeholder="https://…（選填；只套用在結果畫面）"
          value={quizResultBgUrl}
          onChange={(ev) => setQuizResultBgUrl(ev.target.value)}
          autoComplete="off"
          className={inputClass}
        />
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={quizResultImageFileRef}
            type="file"
            accept={HOMEPAGE_IMAGE_ACCEPT}
            className="sr-only"
            aria-hidden
            tabIndex={-1}
            onChange={handleQuizResultImageFile}
          />
          <Button
            type="button"
            variant="outline"
            disabled={uploading !== null}
            className="border-zinc-600 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
            onClick={() => quizResultImageFileRef.current?.click()}
          >
            {uploading === 'quizResultImage' ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                上傳中…
              </>
            ) : (
              <>
                <Upload className="mr-2 size-4" />
                上傳結果背景圖
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={uploading !== null || !quizResultBgUrl.trim()}
            className="border-zinc-700 bg-zinc-950/60 text-zinc-200 hover:bg-zinc-900 disabled:opacity-50"
            onClick={removeQuizResultImage}
          >
            移除
          </Button>
          <span className="text-xs text-zinc-500">JPEG / PNG / WebP / GIF，最大 12 MiB</span>
        </div>
        <p className="text-xs text-zinc-500">
          僅套用於首頁公開測驗的「結果畫面」；留空則沿用原本背景（不額外疊圖）。
        </p>
      </div>

      <div className="space-y-4 rounded-lg border border-zinc-700 bg-zinc-900/40 p-4">
        <p className="text-sm font-medium text-zinc-200">全站主題配色</p>
        <p className="text-xs text-zinc-500">
          套用於主色按鈕、統計卡、步驟圓圈、賣點區背景與強調色、Hero CTA 等；變更後重新整理首頁即可預覽。
        </p>
        <MarketingThemePicker value={marketingTheme} onChange={setMarketingTheme} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="features_student_image_url" className="text-zinc-200">
          賣點區學生插圖 URL
        </Label>
        <Input
          id="features_student_image_url"
          name="features_student_image_url"
          type="url"
          placeholder="https://…（選填，上傳或貼圖片網址）"
          value={featuresStudentUrl}
          onChange={(ev) => setFeaturesStudentUrl(ev.target.value)}
          autoComplete="off"
          className={inputClass}
        />
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={featuresStudentFileRef}
            type="file"
            accept={HOMEPAGE_IMAGE_ACCEPT}
            className="sr-only"
            aria-hidden
            tabIndex={-1}
            onChange={handleFeaturesStudentFile}
          />
          <Button
            type="button"
            variant="outline"
            disabled={uploading !== null}
            className="border-zinc-600 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
            onClick={() => featuresStudentFileRef.current?.click()}
          >
            {uploading === 'featuresStudent' ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                上傳中…
              </>
            ) : (
              <>
                <Upload className="mr-2 size-4" />
                上傳插圖
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={uploading !== null || !featuresStudentUrl.trim()}
            className="border-zinc-700 bg-zinc-950/60 text-zinc-200 hover:bg-zinc-900 disabled:opacity-50"
            onClick={removeFeaturesStudentImage}
          >
            移除
          </Button>
          <span className="text-xs text-zinc-500">JPEG / PNG / WebP / GIF</span>
        </div>
        <p className="text-xs text-zinc-500">
          顯示於首頁賣點區右側。留空或移除則不顯示插圖，僅保留左側文字賣點。
        </p>
        {featuresStudentUrl.trim() && (
          <div className="mt-2 overflow-hidden rounded-lg border border-zinc-700 bg-zinc-950 p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={featuresStudentUrl.trim()}
              alt="插圖預覽"
              className="mx-auto max-h-40 w-auto object-contain"
            />
          </div>
        )}
      </div>

      <div className="space-y-4 rounded-lg border border-zinc-700 bg-zinc-900/40 p-4">
        <p className="text-sm font-medium text-zinc-200">AI×線上課程 · 三張說明卡插圖</p>
        <p className="text-xs text-zinc-500">
          各卡左側方塊可上傳不同圖片；留空則顯示該卡標題首字。對應首頁「AI × 線上課程 · 子女點樣學」區塊。
        </p>
        {HOME_TEACHERS.map((card, cardIndex) => {
          const field = HOME_TEACHERS_CARD_FIELDS[cardIndex];
          const url = teachersCardUrls[cardIndex];
          return (
            <div
              key={field}
              className="space-y-2 border-t border-zinc-800 pt-4 first:border-t-0 first:pt-0"
            >
              <Label htmlFor={field} className="text-zinc-200">
                說明卡 {cardIndex + 1}：{card.name}
              </Label>
              <Input
                id={field}
                name={field}
                type="url"
                placeholder="https://…（選填）"
                value={url}
                onChange={(ev) => setTeachersCardUrl(cardIndex as 0 | 1 | 2, ev.target.value)}
                autoComplete="off"
                className={inputClass}
              />
              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={teachersCardFileRefs[cardIndex]}
                  type="file"
                  accept={HOMEPAGE_IMAGE_ACCEPT}
                  className="sr-only"
                  aria-hidden
                  tabIndex={-1}
                  onChange={(ev) => handleTeachersCardFile(cardIndex as 0 | 1 | 2, ev)}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={uploading !== null}
                  className="border-zinc-600 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
                  onClick={() => teachersCardFileRefs[cardIndex].current?.click()}
                >
                  {uploading === cardIndex ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      上傳中…
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 size-4" />
                      上傳圖片
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={uploading !== null || !url.trim()}
                  className="border-zinc-700 bg-zinc-950/60 text-zinc-200 hover:bg-zinc-900 disabled:opacity-50"
                  onClick={() => removeTeachersCardImage(cardIndex as 0 | 1 | 2)}
                >
                  移除
                </Button>
              </div>
              {url.trim() && (
                <div className="mt-2 overflow-hidden rounded-lg border border-zinc-700 bg-zinc-950 p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url.trim()}
                    alt={`${card.name} 預覽`}
                    className="mx-auto max-h-32 w-auto object-contain"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="space-y-3 rounded-lg border border-zinc-700 bg-zinc-900/40 p-4">
        <p className="text-sm font-medium text-zinc-200">背景媒體開關</p>
        <p className="text-xs text-zinc-500">關閉後首頁仍保留網址設定，但不顯示該媒體。</p>
        <label className="flex cursor-pointer items-center justify-between gap-4 py-1">
          <span className="text-sm text-zinc-300">顯示背景圖片</span>
          <input
            type="checkbox"
            role="switch"
            checked={imageEnabled}
            onChange={(e) => setImageEnabled(e.target.checked)}
            className="h-5 w-9 shrink-0 cursor-pointer rounded-full accent-violet-500"
          />
        </label>
        <label className="flex cursor-pointer items-center justify-between gap-4 py-1">
          <span className="text-sm text-zinc-300">顯示背景影片</span>
          <input
            type="checkbox"
            role="switch"
            checked={videoEnabled}
            onChange={(e) => setVideoEnabled(e.target.checked)}
            className="h-5 w-9 shrink-0 cursor-pointer rounded-full accent-violet-500"
          />
        </label>
      </div>

      <div className="space-y-4">
        <p className="text-sm font-medium text-zinc-200">首頁測驗文案</p>
        <p className="text-xs text-zinc-500">
          自訂 intro 主標語與「開始」按鈕文字；留空則使用網站預設（英語程度快測／開始快測）。支援換行。
        </p>
        <div className="space-y-2">
          <Label htmlFor="home_quiz_intro_text" className="text-zinc-200">
            主標語
          </Label>
          <textarea
            id="home_quiz_intro_text"
            name="home_quiz_intro_text"
            value={quizIntro}
            onChange={(e) => setQuizIntro(e.target.value)}
            rows={4}
            maxLength={HOME_QUIZ_INTRO_MAX_LEN}
            placeholder={'英語程度快測\n約 10 題｜依答題表現提供程度參考'}
            autoComplete="off"
            className={cn(
              inputClass,
              'min-h-[100px] w-full resize-y rounded-md border px-3 py-2 text-sm',
            )}
          />
          <p className="text-xs text-zinc-500">
            最多 {HOME_QUIZ_INTRO_MAX_LEN} 字元；目前 {quizIntro.length}
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="home_quiz_cta_text" className="text-zinc-200">
            開始按鈕
          </Label>
          <Input
            id="home_quiz_cta_text"
            name="home_quiz_cta_text"
            value={quizCta}
            onChange={(e) => setQuizCta(e.target.value)}
            maxLength={HOME_QUIZ_CTA_MAX_LEN}
            placeholder="開始快測"
            autoComplete="off"
            className={inputClass}
          />
          <p className="text-xs text-zinc-500">
            最多 {HOME_QUIZ_CTA_MAX_LEN} 字元；目前 {quizCta.length}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <p className="text-sm font-medium text-zinc-200">首頁標題字色</p>
        <p className="text-xs text-zinc-500">
          僅用於全幅背景上的測驗版面；訪客落地頁白底測驗區固定使用深色字，以免淺色字看不見。留空則沿用主題字色。請使用 #RRGGBB。
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="heading_light" className="text-zinc-200">
              亮色模式（非暗黑）
            </Label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                id="heading_light_picker"
                type="color"
                value={headingLight || '#0f172a'}
                onChange={(e) => setHeadingLight(e.target.value)}
                className="h-10 w-14 shrink-0 cursor-pointer rounded border border-zinc-600 bg-zinc-950"
                aria-label="亮色主題字色色盤"
              />
              <Input
                id="heading_light"
                value={headingLight}
                onChange={(e) => setHeadingLight(e.target.value)}
                placeholder="#0f172a 留空＝預設"
                autoComplete="off"
                className={cn(inputClass, 'min-w-0 flex-1 font-mono text-sm')}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="heading_dark" className="text-zinc-200">
              暗黑模式
            </Label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                id="heading_dark_picker"
                type="color"
                value={headingDark || '#f8fafc'}
                onChange={(e) => setHeadingDark(e.target.value)}
                className="h-10 w-14 shrink-0 cursor-pointer rounded border border-zinc-600 bg-zinc-950"
                aria-label="暗黑主題字色色盤"
              />
              <Input
                id="heading_dark"
                value={headingDark}
                onChange={(e) => setHeadingDark(e.target.value)}
                placeholder="#f8fafc 留空＝預設"
                autoComplete="off"
                className={cn(inputClass, 'min-w-0 flex-1 font-mono text-sm')}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="overlay_range" className="text-zinc-200">
            主題色遮罩濃度
          </Label>
          <span className="tabular-nums text-sm text-zinc-400">{overlayOpacity.toFixed(2)}</span>
        </div>
        <input
          id="overlay_range"
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={overlayOpacity}
          onChange={(e) => setOverlayOpacity(Number(e.target.value))}
          className="w-full accent-primary"
          aria-valuetext={`遮罩 ${overlayOpacity}`}
        />
        <p className="text-xs text-zinc-500">
          僅覆蓋在已設定的背景圖／影片上；若圖與影片皆未設定，首頁只有主題底色，遮罩沒有可叠上的畫面。0 為不遮罩。
        </p>
      </div>

      {message && (
        <p
          role="status"
          className={
            message.type === 'ok' ? 'text-sm text-emerald-600 dark:text-emerald-400' : 'text-sm text-destructive'
          }
        >
          {message.text}
        </p>
      )}

      <Button type="submit" disabled={pending || uploading !== null}>
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
