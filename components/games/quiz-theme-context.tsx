'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  DEFAULT_QUIZ_VISUAL_THEME,
  isQuizVisualThemeId,
  QUIZ_VISUAL_THEMES,
  type QuizVisualTheme,
  type QuizVisualThemeId,
} from '@/lib/games/quiz-visual-themes';

const STORAGE_KEY = 'lingua-quiz-visual-theme';

type QuizThemeContextValue = {
  themeId: QuizVisualThemeId;
  theme: QuizVisualTheme;
  setThemeId: (id: QuizVisualThemeId) => void;
};

const QuizThemeContext = createContext<QuizThemeContextValue | null>(null);

export function QuizThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeIdState] = useState<QuizVisualThemeId>(DEFAULT_QUIZ_VISUAL_THEME);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw && isQuizVisualThemeId(raw)) setThemeIdState(raw);
    } catch {
      /* ignore */
    }
  }, []);

  const setThemeId = useCallback((id: QuizVisualThemeId) => {
    setThemeIdState(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(
    () => ({
      themeId,
      theme: QUIZ_VISUAL_THEMES[themeId],
      setThemeId,
    }),
    [themeId, setThemeId],
  );

  return <QuizThemeContext.Provider value={value}>{children}</QuizThemeContext.Provider>;
}

export function useQuizVisualTheme(): QuizThemeContextValue {
  const ctx = useContext(QuizThemeContext);
  if (!ctx) {
    throw new Error('useQuizVisualTheme must be used within QuizThemeProvider');
  }
  return ctx;
}

/** 遊戲區外層未包 Provider 時的 fallback */
export function useQuizVisualThemeOptional(): QuizThemeContextValue {
  const ctx = useContext(QuizThemeContext);
  if (ctx) return ctx;
  const theme = QUIZ_VISUAL_THEMES[DEFAULT_QUIZ_VISUAL_THEME];
  return {
    themeId: DEFAULT_QUIZ_VISUAL_THEME,
    theme,
    setThemeId: () => {},
  };
}
