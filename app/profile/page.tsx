'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Loader2, Pencil, Check, X, LogOut,
  Flame, Trophy, BookOpen, ShieldCheck,
  GraduationCap, Users,
} from 'lucide-react';

import { createClient }                    from '@/lib/supabase/client';
import { xpForLevel, xpToNextLevel, levelProgress } from '@/types/database.types';
import type {
  Profile,
  UserRole,
  MentorSpecialty,
  QuizEditorPersonality,
} from '@/types/database.types';
import { MENTOR_SPECIALTY_OPTIONS } from '@/lib/mentor-specialty';
import { saveQuizEditorPersonality } from '@/lib/quiz/actions';
import {
  isQuizEditorPersonality,
  writeQuizEditorPersonalityToStorage,
} from '@/lib/quiz/editor-personality-preference';
import { EditorPersonalityPicker } from '@/components/quiz/editor-personality-picker';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge }    from '@/components/ui/badge';
import { Button }   from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input }    from '@/components/ui/input';
import { Label }    from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { LevelBadge } from '@/components/gamification/level-badge';

// ─── Role config ────────────────────────────────────────────────────────────

const ROLE_CONFIG: Record<UserRole, { label: string; icon: React.ReactNode; color: string }> = {
  student: {
    label: '學生',
    icon:  <GraduationCap className="h-3.5 w-3.5" />,
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
  mentor: {
    label: '老師',
    icon:  <Users className="h-3.5 w-3.5" />,
    color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  },
  admin: {
    label: '管理員',
    icon:  <ShieldCheck className="h-3.5 w-3.5" />,
    color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  },
};

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router   = useRouter();
  const supabase = createClient();

  const [profile,      setProfile]      = useState<Profile | null>(null);
  const [email,        setEmail]        = useState('');
  const [loading,      setLoading]      = useState(true);
  const [editing,      setEditing]      = useState(false);
  const [nameInput,    setNameInput]    = useState('');
  const [saving,       setSaving]       = useState(false);
  const [saveError,    setSaveError]    = useState<string | null>(null);
  const [saveSuccess,  setSaveSuccess]  = useState(false);
  const [signingOut,   setSigningOut]   = useState(false);
  const [completedLessons, setCompletedLessons] = useState(0);
  const [mentorSpecialty, setMentorSpecialty] = useState<MentorSpecialty | ''>('');
  const [bioInput, setBioInput] = useState('');
  const [savingMentor, setSavingMentor] = useState(false);
  const [mentorSaveError, setMentorSaveError] = useState<string | null>(null);
  const [mentorSaveSuccess, setMentorSaveSuccess] = useState(false);
  const [quizPersonality, setQuizPersonality] =
    useState<QuizEditorPersonality | null>(null);
  const [savingQuizStyle, setSavingQuizStyle] = useState(false);
  const [quizStyleError, setQuizStyleError] = useState<string | null>(null);
  const [quizStyleSuccess, setQuizStyleSuccess] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const fieldClass =
    'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

  // ── Fetch profile on mount ────────────────────────────────

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) { router.push('/login'); return; }

      setEmail(user.email ?? '');

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (data) {
        const p = data as Profile;
        setProfile(p);
        setNameInput(p.display_name);
        setMentorSpecialty(p.mentor_specialty ?? '');
        setBioInput(p.bio ?? '');
        if (isQuizEditorPersonality(p.quiz_editor_personality)) {
          setQuizPersonality(p.quiz_editor_personality);
        }
      }

      // 已完成課堂數
      const { count } = await supabase
        .from('user_progress')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('completed', true);

      setCompletedLessons(count ?? 0);
      setLoading(false);
    }
    load();
  }, []);

  // ── Edit display name ─────────────────────────────────────

  function startEdit() {
    setEditing(true);
    setSaveError(null);
    setSaveSuccess(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function cancelEdit() {
    setEditing(false);
    setNameInput(profile?.display_name ?? '');
    setSaveError(null);
  }

  async function saveName() {
    if (!profile) return;
    const trimmed = nameInput.trim();
    if (!trimmed || trimmed === profile.display_name) { cancelEdit(); return; }
    if (trimmed.length < 2) { setSaveError('姓名至少 2 個字元'); return; }

    setSaving(true);
    setSaveError(null);

    const { error } = await supabase
      .from('profiles')
      .update({ display_name: trimmed })
      .eq('id', profile.id);

    setSaving(false);

    if (error) {
      setSaveError('儲存失敗，請稍後再試');
    } else {
      setProfile((prev) => prev ? { ...prev, display_name: trimmed } : prev);
      setEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  }

  const isMentorOrAdmin =
    profile?.role === 'mentor' || profile?.role === 'admin';

  async function saveQuizPersonality() {
    if (!profile || !quizPersonality) return;
    setSavingQuizStyle(true);
    setQuizStyleError(null);
    setQuizStyleSuccess(false);
    writeQuizEditorPersonalityToStorage(quizPersonality);
    const res = await saveQuizEditorPersonality(quizPersonality);
    setSavingQuizStyle(false);
    if (res.error) {
      setQuizStyleError(res.error);
      return;
    }
    setProfile((prev) =>
      prev ? { ...prev, quiz_editor_personality: quizPersonality } : prev,
    );
    setQuizStyleSuccess(true);
    setTimeout(() => setQuizStyleSuccess(false), 3000);
  }

  async function saveMentorProfile() {
    if (!profile || !isMentorOrAdmin) return;

    const trimmedBio = bioInput.trim();
    if (trimmedBio.length > 2000) {
      setMentorSaveError('講師介紹最多 2000 字');
      return;
    }

    setSavingMentor(true);
    setMentorSaveError(null);
    setMentorSaveSuccess(false);

    const { error } = await supabase
      .from('profiles')
      .update({
        mentor_specialty: mentorSpecialty || null,
        bio: trimmedBio || null,
      } as never)
      .eq('id', profile.id);

    setSavingMentor(false);

    if (error) {
      const msg = error.message ?? '';
      if (msg.includes('mentor_specialty') || error.code === '42703') {
        setMentorSaveError(
          '資料庫尚未更新，請在 Supabase 執行 migration：20260525150000_profiles_mentor_specialty.sql',
        );
      } else {
        setMentorSaveError('儲存失敗，請稍後再試');
      }
      return;
    }

    setProfile((prev) =>
      prev
        ? {
            ...prev,
            mentor_specialty: mentorSpecialty || null,
            bio: trimmedBio || null,
          }
        : prev,
    );
    setBioInput(trimmedBio);
    setMentorSaveSuccess(true);
    setTimeout(() => setMentorSaveSuccess(false), 3000);
  }

  // ── Sign out ──────────────────────────────────────────────

  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  // ── Loading state ─────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">找不到個人資料</p>
        <Button asChild variant="outline"><Link href="/dashboard">返回 Dashboard</Link></Button>
      </div>
    );
  }

  // ── Computed values ───────────────────────────────────────

  const xpPct    = Math.round(levelProgress(profile.exp, profile.level) * 100);
  const toNextXP = xpToNextLevel(profile.exp, profile.level);
  const curXP    = profile.exp - xpForLevel(profile.level);
  const needXP   = xpForLevel(profile.level + 1) - xpForLevel(profile.level);
  const roleConf = ROLE_CONFIG[profile.role];

  const initials = profile.display_name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // ─────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto max-w-2xl px-4 py-10 space-y-6">

        {/* ── Hero card ──────────────────────────────────────── */}
        <Card className="overflow-hidden border-border/60 shadow-sm">

          {/* Banner */}
          <div className="relative h-28 bg-gradient-to-br from-primary via-primary/85 to-primary/60">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-10"
              style={{
                backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                backgroundSize: '20px 20px',
              }}
            />
          </div>

          <CardContent className="px-6 pb-6">
            {/* Avatar + info row */}
            <div className="flex items-end justify-between -mt-10 mb-4">
              <Avatar className="h-20 w-20 border-4 border-background shadow-lg">
                <AvatarImage src={profile.avatar_url ?? undefined} alt={profile.display_name} />
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>

              {/* Role badge */}
              <span className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${roleConf.color}`}>
                {roleConf.icon}
                {roleConf.label}
              </span>
            </div>

            {/* Name + level */}
            <div className="space-y-1 mb-4">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold leading-none">{profile.display_name}</h1>
                <LevelBadge level={profile.level} size="md" showLabel />
              </div>
              <p className="text-sm text-muted-foreground">{email}</p>
            </div>

            {/* XP bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span className="font-medium text-foreground">經驗值</span>
                <span>{curXP} / {needXP} XP　距下一級 <strong className="text-primary">{toNextXP} XP</strong></span>
              </div>
              <Progress value={xpPct} className="h-2.5" />
            </div>
          </CardContent>
        </Card>

        {/* ── Stats row ──────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: <Trophy  className="h-5 w-5 text-amber-500" />,  label: '累積 XP',   value: profile.total_xp_earned.toLocaleString() },
            { icon: <BookOpen className="h-5 w-5 text-primary" />,   label: '完成課堂',  value: `${completedLessons} 堂` },
            { icon: <Flame   className="h-5 w-5 text-orange-500" />, label: '連續天數',  value: `${profile.streak_days} 天` },
          ].map(({ icon, label, value }) => (
            <Card key={label} className="border-border/60 shadow-sm">
              <CardContent className="p-4 text-center space-y-1">
                <div className="flex justify-center">{icon}</div>
                <p className="text-lg font-bold">{value}</p>
                <p className="text-[11px] text-muted-foreground">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Edit profile ───────────────────────────────────── */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">個人資料</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">

            {/* Display name */}
            <div className="space-y-1.5">
              <Label htmlFor="displayName">姓名 / 暱稱</Label>
              <div className="flex items-center gap-2">
                {editing ? (
                  <>
                    <Input
                      id="displayName"
                      ref={inputRef}
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveName();
                        if (e.key === 'Escape') cancelEdit();
                      }}
                      maxLength={50}
                      className={saveError ? 'border-destructive' : ''}
                      disabled={saving}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={saveName}
                      disabled={saving}
                      className="shrink-0 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/30"
                      aria-label="確認"
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={cancelEdit}
                      disabled={saving}
                      className="shrink-0 text-muted-foreground"
                      aria-label="取消"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Input
                      id="displayName"
                      value={profile.display_name}
                      readOnly
                      className="bg-muted/50 cursor-default"
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={startEdit}
                      className="shrink-0 text-muted-foreground hover:text-foreground"
                      aria-label="編輯姓名"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
              {saveError && (
                <p className="text-xs text-destructive">{saveError}</p>
              )}
              {saveSuccess && (
                <p className="text-xs text-green-600 dark:text-green-400">✓ 已儲存</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email">電子郵件</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="email"
                  value={email}
                  readOnly
                  className="bg-muted/50 cursor-default"
                />
                <Badge variant="secondary" className="shrink-0 text-[11px]">
                  不可更改
                </Badge>
              </div>
            </div>

            {/* Role */}
            <div className="space-y-1.5">
              <Label>帳號類型</Label>
              <div className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${roleConf.color}`}>
                {roleConf.icon}
                {roleConf.label}
              </div>
            </div>

          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">AI英語鬥 · 小編風格</CardTitle>
            <p className="text-xs text-muted-foreground font-normal mt-1">
              影響測驗中的即時評語與結算評語；可隨時切換毒舌或溫柔治癒。
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <EditorPersonalityPicker
              value={quizPersonality}
              onChange={(id) => {
                setQuizPersonality(id);
                setQuizStyleError(null);
                setQuizStyleSuccess(false);
              }}
              disabled={savingQuizStyle}
            />
            {quizStyleError && (
              <p className="text-xs text-destructive">{quizStyleError}</p>
            )}
            {quizStyleSuccess && (
              <p className="text-xs text-green-600 dark:text-green-400">
                ✓ 小編風格已儲存
              </p>
            )}
            <Button
              type="button"
              onClick={() => void saveQuizPersonality()}
              disabled={!quizPersonality || savingQuizStyle}
              className="w-full sm:w-auto"
            >
              {savingQuizStyle ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  儲存中…
                </>
              ) : (
                '儲存小編風格'
              )}
            </Button>
          </CardContent>
        </Card>

        {isMentorOrAdmin && (
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">講師公開資料</CardTitle>
              <p className="text-xs text-muted-foreground font-normal mt-1">
                學員在課程頁「講師介紹」可看到以下內容
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="mentorSpecialty">導師類型</Label>
                <select
                  id="mentorSpecialty"
                  value={mentorSpecialty}
                  onChange={(e) =>
                    setMentorSpecialty(e.target.value as MentorSpecialty | '')
                  }
                  disabled={savingMentor}
                  className={fieldClass}
                >
                  <option value="">請選擇…</option>
                  {MENTOR_SPECIALTY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mentorBio">講師介紹</Label>
                <textarea
                  id="mentorBio"
                  value={bioInput}
                  onChange={(e) => setBioInput(e.target.value)}
                  disabled={savingMentor}
                  rows={6}
                  maxLength={2000}
                  placeholder="介紹你的教學背景、專長與風格…"
                  className={`${fieldClass} min-h-[140px] resize-y`}
                />
                <p className="text-[11px] text-muted-foreground text-right">
                  {bioInput.length} / 2000
                </p>
              </div>

              {mentorSaveError && (
                <p className="text-xs text-destructive">{mentorSaveError}</p>
              )}
              {mentorSaveSuccess && (
                <p className="text-xs text-green-600 dark:text-green-400">
                  ✓ 講師資料已儲存
                </p>
              )}

              <Button
                type="button"
                onClick={saveMentorProfile}
                disabled={savingMentor}
                className="w-full sm:w-auto"
              >
                {savingMentor ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    儲存中…
                  </>
                ) : (
                  '儲存講師資料'
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── Account actions ─────────────────────────────────── */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">帳號操作</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-4 py-3">
              <div>
                <p className="text-sm font-medium">登出帳號</p>
                <p className="text-xs text-muted-foreground">結束目前的登入階段</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                disabled={signingOut}
                className="gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
              >
                {signingOut
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <LogOut className="h-3.5 w-3.5" />
                }
                {signingOut ? '登出中…' : '登出'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Separator />

        <div className="flex justify-center">
          <Button variant="ghost" size="sm" asChild className="text-xs text-muted-foreground">
            <Link href="/dashboard">← 返回 Dashboard</Link>
          </Button>
        </div>

      </div>
    </div>
  );
}
