/** 舊版自訂 typeface URL（進階）；預設圖形已改為內建 ExtrudeGeometry */
export const DEFAULT_SHAPE_TYPEFACE_URL = '/fonts/classroom-quiz-shape-glyphs.json';

/** 內建 shape-glyphs.json 中圓形輪廓的字形鍵 */
export const SHAPE_GLYPH_CIRCLE = 'O';

export function resolveShapeTypefaceUrl(quizUrl: string | null | undefined): string {
  const trimmed = quizUrl?.trim();
  return trimmed || DEFAULT_SHAPE_TYPEFACE_URL;
}

export {
  normalizeVocabularyShapeKind,
  VOCABULARY_SHAPE_KINDS,
  VOCABULARY_SHAPE_PRESETS,
  type VocabularyShapeKind,
} from '@/lib/course-quiz/vocabulary-shape-presets';

export function parseOptionShapeGlyphs(raw: unknown, count: number): string[] {
  const list = Array.isArray(raw) ? raw.map((v) => String(v ?? '')) : [];
  while (list.length < count) list.push('');
  return list.slice(0, count);
}

export function parseOptionImageUrls(raw: unknown, count: number): string[] {
  const list = Array.isArray(raw) ? raw.map((v) => String(v ?? '').trim()) : [];
  while (list.length < count) list.push('');
  return list.slice(0, count);
}
