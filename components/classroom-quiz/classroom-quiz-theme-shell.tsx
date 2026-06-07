'use client';

import { useEffect } from 'react';

import {
  bindClassroomQuizBgmGestureUnlock,
  duckClassroomQuizBgmForVideo,
  ensureClassroomQuizBgmMuteListener,
  restoreClassroomQuizBgmAfterVideo,
  startClassroomQuizBgm,
  stopClassroomQuizBgm,
  unlockAndStartClassroomQuizBgm,
} from '@/lib/course-quiz/classroom-quiz-bgm';
import {
  getCourseQuizPlayThemeConfig,
  isCourseQuizThemedBackground,
} from '@/lib/course-quiz/play-themes';
import { getQuizThemeRootStyle } from '@/lib/games/quiz-theme-css-vars';
import { DEFAULT_QUIZ_VISUAL_THEME } from '@/lib/games/quiz-visual-themes';
import type { ClassroomQuizPlayPhase } from '@/lib/course-quiz/play-phases';
import type { CourseQuizPlayTheme } from '@/types/database.types';
import { cn } from '@/lib/utils';

export function ClassroomQuizThemeShell({
  playTheme,
  playPhase,
  className,
  children,
}: {
  playTheme: CourseQuizPlayTheme;
  playPhase: ClassroomQuizPlayPhase;
  className?: string;
  children: React.ReactNode;
}) {
  const config = getCourseQuizPlayThemeConfig(playTheme);
  const adventureThemeStyle = config.useAdventureChrome
    ? getQuizThemeRootStyle(DEFAULT_QUIZ_VISUAL_THEME)
    : undefined;
  const hasThemedBackground = isCourseQuizThemedBackground(playTheme);

  useEffect(() => {
    ensureClassroomQuizBgmMuteListener();
    if (!config.bgmUrl) {
      stopClassroomQuizBgm();
      return;
    }
    startClassroomQuizBgm(config.bgmUrl, config.bgmVolumeBase);
    const unbindGesture = bindClassroomQuizBgmGestureUnlock(
      config.bgmUrl,
      config.bgmVolumeBase,
    );
    return () => {
      unbindGesture();
      stopClassroomQuizBgm();
    };
  }, [config.bgmUrl, config.bgmVolumeBase]);

  const activateBgm = () => {
    if (!config.bgmUrl) return;
    void unlockAndStartClassroomQuizBgm(config.bgmUrl, config.bgmVolumeBase);
  };

  useEffect(() => {
    if (!config.bgmUrl) return;
    if (playPhase === 'video' || playPhase === 'outcome_video') {
      duckClassroomQuizBgmForVideo();
    } else {
      restoreClassroomQuizBgmAfterVideo();
    }
  }, [playPhase, config.bgmUrl]);

  return (
    <div
      className={cn(
        'classroom-quiz-theme-shell relative flex min-h-0 flex-1 flex-col',
        hasThemedBackground && 'classroom-quiz-theme-shell--themed',
        playTheme === 'kindergarten' && 'classroom-quiz-theme-shell--kindergarten',
        className,
      )}
      data-course-quiz-theme={playTheme}
      data-quiz-theme={config.useAdventureChrome ? DEFAULT_QUIZ_VISUAL_THEME : undefined}
      onPointerDownCapture={config.bgmUrl ? activateBgm : undefined}
      style={{
        ...adventureThemeStyle,
        ...(config.backgroundImageUrl
          ? { backgroundImage: `url(${config.backgroundImageUrl})` }
          : {}),
      }}
    >
      {children}
    </div>
  );
}
