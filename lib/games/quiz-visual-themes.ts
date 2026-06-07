export const QUIZ_VISUAL_THEME_IDS = [
  'super-fun',
  'ocean-breeze',
  'sunset-pop',
  'candy-shop',
  'forest-quest',
  'galaxy-run',
] as const;

export type QuizVisualThemeId = (typeof QUIZ_VISUAL_THEME_IDS)[number];

export type QuizVisualTheme = {
  id: QuizVisualThemeId;
  label: string;
  /** 主題選擇器色票 */
  swatch: string;
  starFilled: string[];
};

export const QUIZ_VISUAL_THEMES: Record<QuizVisualThemeId, QuizVisualTheme> = {
  'super-fun': {
    id: 'super-fun',
    label: 'English Quiz Adventure',
    swatch: 'linear-gradient(135deg,#7dd3fc 0%,#86efac 55%,#fde047 100%)',
    starFilled: ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#6366f1', '#a855f7'],
  },
  'ocean-breeze': {
    id: 'ocean-breeze',
    label: 'Ocean',
    swatch: 'linear-gradient(135deg,#0ea5e9 0%,#22d3ee 50%,#a5f3fc 100%)',
    starFilled: ['#38bdf8', '#22d3ee', '#06b6d4', '#14b8a6', '#2dd4bf', '#67e8f9', '#a5f3fc'],
  },
  'sunset-pop': {
    id: 'sunset-pop',
    label: 'Sunset',
    swatch: 'linear-gradient(135deg,#fb923c 0%,#f472b6 50%,#c084fc 100%)',
    starFilled: ['#fb923c', '#f97316', '#f472b6', '#e879f9', '#c084fc', '#fbbf24', '#f43f5e'],
  },
  'candy-shop': {
    id: 'candy-shop',
    label: 'Candy',
    swatch: 'linear-gradient(135deg,#f9a8d4 0%,#fda4af 50%,#fde68a 100%)',
    starFilled: ['#f472b6', '#fb7185', '#fda4af', '#fcd34d', '#fbbf24', '#e879f9', '#f9a8d4'],
  },
  'forest-quest': {
    id: 'forest-quest',
    label: 'Forest',
    swatch: 'linear-gradient(135deg,#4ade80 0%,#22c55e 45%,#a3e635 100%)',
    starFilled: ['#84cc16', '#65a30d', '#22c55e', '#10b981', '#14b8a6', '#a3e635', '#4ade80'],
  },
  'galaxy-run': {
    id: 'galaxy-run',
    label: 'Galaxy',
    swatch: 'linear-gradient(135deg,#312e81 0%,#7c3aed 50%,#ec4899 100%)',
    starFilled: ['#a78bfa', '#c084fc', '#e879f9', '#f472b6', '#38bdf8', '#818cf8', '#f0abfc'],
  },
};

export const DEFAULT_QUIZ_VISUAL_THEME: QuizVisualThemeId = 'super-fun';

export function isQuizVisualThemeId(value: string): value is QuizVisualThemeId {
  return (QUIZ_VISUAL_THEME_IDS as readonly string[]).includes(value);
}
