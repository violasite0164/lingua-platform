import type { CSSProperties } from 'react';

import type { QuizVisualThemeId } from '@/lib/games/quiz-visual-themes';

export type QuizThemeVars = CSSProperties & {
  '--qp-sky-top': string;
  '--qp-sky-bottom': string;
  '--qp-title-1': string;
  '--qp-title-2': string;
  '--qp-title-3': string;
  '--qp-subtitle': string;
  '--qp-board-border': string;
  '--qp-board-bg': string;
  '--qp-board-shadow': string;
  '--qp-status-bg': string;
  '--qp-status-fg': string;
  '--qp-qbox-border': string;
  '--qp-question-text': string;
  '--qp-footer': string;
};

const THEMES: Record<QuizVisualThemeId, QuizThemeVars> = {
  'super-fun': {
    '--qp-sky-top': '#b8e4ff',
    '--qp-sky-bottom': '#7ec8e3',
    '--qp-title-1': '#ff6b9d',
    '--qp-title-2': '#4dabf7',
    '--qp-title-3': '#51cf66',
    '--qp-subtitle': '#5c7cfa',
    '--qp-board-border': '#5cb85c',
    '--qp-board-bg':
      'linear-gradient(180deg, rgba(244, 255, 232, 0.88) 0%, rgba(223, 246, 200, 0.88) 100%)',
    '--qp-board-shadow': '0 8px 0 #3d8b40, 0 16px 32px rgba(0, 0, 0, 0.12)',
    '--qp-status-bg': '#1a3a6b',
    '--qp-status-fg': '#ffec3d',
    '--qp-qbox-border': '#40c057',
    '--qp-question-text': '#45266b',
    '--qp-footer': '#1a3a6b',
  },
  'ocean-breeze': {
    '--qp-sky-top': '#e0f2fe',
    '--qp-sky-bottom': '#38bdf8',
    '--qp-title-1': '#38bdf8',
    '--qp-title-2': '#22d3ee',
    '--qp-title-3': '#06b6d4',
    '--qp-subtitle': '#0284c7',
    '--qp-board-border': '#0891b2',
    '--qp-board-bg':
      'linear-gradient(180deg, rgba(236, 254, 255, 0.88) 0%, rgba(207, 250, 254, 0.88) 100%)',
    '--qp-board-shadow': '0 8px 0 #0e7490, 0 16px 32px rgba(14, 116, 144, 0.2)',
    '--qp-status-bg': '#0c4a6e',
    '--qp-status-fg': '#fde68a',
    '--qp-qbox-border': '#06b6d4',
    '--qp-question-text': '#0e7490',
    '--qp-footer': '#0c4a6e',
  },
  'sunset-pop': {
    '--qp-sky-top': '#ffedd5',
    '--qp-sky-bottom': '#fb923c',
    '--qp-title-1': '#fb923c',
    '--qp-title-2': '#f472b6',
    '--qp-title-3': '#c084fc',
    '--qp-subtitle': '#ea580c',
    '--qp-board-border': '#ea580c',
    '--qp-board-bg':
      'linear-gradient(180deg, rgba(255, 247, 237, 0.88) 0%, rgba(255, 237, 213, 0.88) 100%)',
    '--qp-board-shadow': '0 8px 0 #c2410c, 0 16px 32px rgba(234, 88, 12, 0.18)',
    '--qp-status-bg': '#7c2d12',
    '--qp-status-fg': '#fde047',
    '--qp-qbox-border': '#f97316',
    '--qp-question-text': '#9a3412',
    '--qp-footer': '#7c2d12',
  },
  'candy-shop': {
    '--qp-sky-top': '#fce7f3',
    '--qp-sky-bottom': '#f9a8d4',
    '--qp-title-1': '#ec4899',
    '--qp-title-2': '#f43f5e',
    '--qp-title-3': '#f59e0b',
    '--qp-subtitle': '#db2777',
    '--qp-board-border': '#ec4899',
    '--qp-board-bg':
      'linear-gradient(180deg, rgba(255, 241, 242, 0.88) 0%, rgba(255, 228, 230, 0.88) 100%)',
    '--qp-board-shadow': '0 8px 0 #be185d, 0 16px 32px rgba(236, 72, 153, 0.15)',
    '--qp-status-bg': '#831843',
    '--qp-status-fg': '#fef08a',
    '--qp-qbox-border': '#f472b6',
    '--qp-question-text': '#9d174d',
    '--qp-footer': '#831843',
  },
  'forest-quest': {
    '--qp-sky-top': '#ecfccb',
    '--qp-sky-bottom': '#86efac',
    '--qp-title-1': '#65a30d',
    '--qp-title-2': '#16a34a',
    '--qp-title-3': '#84cc16',
    '--qp-subtitle': '#15803d',
    '--qp-board-border': '#15803d',
    '--qp-board-bg':
      'linear-gradient(180deg, rgba(247, 254, 231, 0.88) 0%, rgba(236, 252, 203, 0.88) 100%)',
    '--qp-board-shadow': '0 8px 0 #166534, 0 16px 32px rgba(22, 101, 52, 0.18)',
    '--qp-status-bg': '#14532d',
    '--qp-status-fg': '#fef08a',
    '--qp-qbox-border': '#22c55e',
    '--qp-question-text': '#166534',
    '--qp-footer': '#14532d',
  },
  'galaxy-run': {
    '--qp-sky-top': '#1e1b4b',
    '--qp-sky-bottom': '#312e81',
    '--qp-title-1': '#a78bfa',
    '--qp-title-2': '#c084fc',
    '--qp-title-3': '#f472b6',
    '--qp-subtitle': '#e879f9',
    '--qp-board-border': '#7c3aed',
    '--qp-board-bg':
      'linear-gradient(180deg, rgba(237, 233, 254, 0.88) 0%, rgba(221, 214, 254, 0.88) 100%)',
    '--qp-board-shadow': '0 8px 0 #5b21b6, 0 16px 32px rgba(91, 33, 182, 0.25)',
    '--qp-status-bg': '#312e81',
    '--qp-status-fg': '#fde68a',
    '--qp-qbox-border': '#8b5cf6',
    '--qp-question-text': '#5b21b6',
    '--qp-footer': '#312e81',
  },
};

export type QuizOptionColors = {
  border: string;
  bg: string;
  badge: string;
  ring: string;
};

const OPTION_COLORS: Record<QuizVisualThemeId, [QuizOptionColors, QuizOptionColors, QuizOptionColors, QuizOptionColors]> = {
  'super-fun': [
    { border: '#c62828', bg: '#e53935', badge: '#b71c1c', ring: 'rgba(229,57,53,0.65)' },
    { border: '#1565c0', bg: '#1e88e5', badge: '#0d47a1', ring: 'rgba(30,136,229,0.65)' },
    { border: '#f57f17', bg: '#fdd835', badge: '#f9a825', ring: 'rgba(249,168,37,0.65)' },
    { border: '#6a1b9a', bg: '#8e24aa', badge: '#4a148c', ring: 'rgba(142,36,170,0.65)' },
  ],
  'ocean-breeze': [
    { border: '#0369a1', bg: '#0ea5e9', badge: '#075985', ring: 'rgba(14,165,233,0.65)' },
    { border: '#0e7490', bg: '#06b6d4', badge: '#155e75', ring: 'rgba(6,182,212,0.65)' },
    { border: '#0f766e', bg: '#14b8a6', badge: '#115e59', ring: 'rgba(20,184,166,0.65)' },
    { border: '#4338ca', bg: '#6366f1', badge: '#3730a3', ring: 'rgba(99,102,241,0.65)' },
  ],
  'sunset-pop': [
    { border: '#c2410c', bg: '#f97316', badge: '#9a3412', ring: 'rgba(249,115,22,0.65)' },
    { border: '#be185d', bg: '#ec4899', badge: '#9d174d', ring: 'rgba(236,72,153,0.65)' },
    { border: '#a16207', bg: '#eab308', badge: '#854d0e', ring: 'rgba(234,179,8,0.65)' },
    { border: '#7e22ce', bg: '#a855f7', badge: '#6b21a8', ring: 'rgba(168,85,247,0.65)' },
  ],
  'candy-shop': [
    { border: '#be185d', bg: '#ec4899', badge: '#9d174d', ring: 'rgba(236,72,153,0.65)' },
    { border: '#6d28d9', bg: '#8b5cf6', badge: '#5b21b6', ring: 'rgba(139,92,246,0.65)' },
    { border: '#b45309', bg: '#f59e0b', badge: '#92400e', ring: 'rgba(245,158,11,0.65)' },
    { border: '#0e7490', bg: '#06b6d4', badge: '#155e75', ring: 'rgba(6,182,212,0.65)' },
  ],
  'forest-quest': [
    { border: '#15803d', bg: '#22c55e', badge: '#14532d', ring: 'rgba(34,197,94,0.65)' },
    { border: '#4d7c0f', bg: '#84cc16', badge: '#3f6212', ring: 'rgba(132,204,22,0.65)' },
    { border: '#a16207', bg: '#eab308', badge: '#854d0e', ring: 'rgba(234,179,8,0.65)' },
    { border: '#0f766e', bg: '#14b8a6', badge: '#115e59', ring: 'rgba(20,184,166,0.65)' },
  ],
  'galaxy-run': [
    { border: '#6d28d9', bg: '#8b5cf6', badge: '#5b21b6', ring: 'rgba(139,92,246,0.65)' },
    { border: '#4338ca', bg: '#6366f1', badge: '#3730a3', ring: 'rgba(99,102,241,0.65)' },
    { border: '#be185d', bg: '#ec4899', badge: '#9d174d', ring: 'rgba(236,72,153,0.65)' },
    { border: '#0891b2', bg: '#22d3ee', badge: '#0e7490', ring: 'rgba(34,211,238,0.65)' },
  ],
};

export function getQuizThemeRootStyle(themeId: QuizVisualThemeId): QuizThemeVars {
  return THEMES[themeId];
}

export function getQuizOptionColors(
  themeId: QuizVisualThemeId,
  index: number,
): QuizOptionColors {
  return OPTION_COLORS[themeId][index] ?? OPTION_COLORS['super-fun'][0];
}

export function getQuizOptionButtonStyle(
  colors: QuizOptionColors,
  state: { picked: boolean; revealed: boolean; correct: boolean; wrong: boolean },
): CSSProperties {
  const style: CSSProperties = {
    ['--qp-opt-border' as string]: colors.border,
    ['--qp-opt-bg' as string]: colors.bg,
    ['--qp-opt-badge' as string]: colors.badge,
  };
  if (state.picked && !state.revealed) {
    style.outline = `4px solid ${colors.ring}`;
  }
  if (state.revealed && state.correct) {
    style.outline = '4px solid #22c55e';
  }
  if (state.revealed && state.wrong) {
    style.outline = '4px solid #ef4444';
  }
  return style;
}
