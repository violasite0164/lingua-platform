import type { FontData } from '@react-three/drei/core/useFont';

import builtInShapeTypeface from '../../public/fonts/classroom-quiz-shape-glyphs.json';

import { SHAPE_GLYPH_CIRCLE } from '@/lib/course-quiz/shape-glyphs';

export type ThreeTypefaceJson = {
  glyphs: Record<
    string,
    {
      ha: number;
      x_min: number;
      x_max: number;
      o: string;
    }
  >;
  familyName?: string;
  ascender?: number;
  descender?: number;
  underlinePosition?: number;
  underlineThickness?: number;
  boundingBox: {
    yMin: number;
    xMin: number;
    yMax: number;
    xMax: number;
  };
  resolution?: number;
};

export const BUILT_IN_SHAPE_TYPEFACE = builtInShapeTypeface as ThreeTypefaceJson;

function hasValidBoundingBox(bb: unknown): bb is ThreeTypefaceJson['boundingBox'] {
  if (!bb || typeof bb !== 'object') return false;
  const b = bb as Record<string, unknown>;
  return (
    typeof b.yMin === 'number' &&
    typeof b.xMin === 'number' &&
    typeof b.yMax === 'number' &&
    typeof b.xMax === 'number'
  );
}

/** 補齊 Three.js Text3D 必要欄位，避免 boundingBox.yMax 讀取失敗 */
export function normalizeTypefaceJson(raw: unknown): ThreeTypefaceJson {
  const base = BUILT_IN_SHAPE_TYPEFACE;
  const data =
    raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};

  const rawGlyphs = data.glyphs;
  const glyphs =
    rawGlyphs && typeof rawGlyphs === 'object' && Object.keys(rawGlyphs).length > 0
      ? (rawGlyphs as ThreeTypefaceJson['glyphs'])
      : { ...base.glyphs };

  const normalized: ThreeTypefaceJson = {
    familyName:
      typeof data.familyName === 'string' ? data.familyName : base.familyName,
    ascender:
      typeof data.ascender === 'number' ? data.ascender : base.ascender,
    descender:
      typeof data.descender === 'number' ? data.descender : base.descender,
    underlinePosition:
      typeof data.underlinePosition === 'number'
        ? data.underlinePosition
        : base.underlinePosition,
    underlineThickness:
      typeof data.underlineThickness === 'number'
        ? data.underlineThickness
        : base.underlineThickness,
    boundingBox: hasValidBoundingBox(data.boundingBox)
      ? data.boundingBox
      : { ...base.boundingBox },
    resolution:
      typeof data.resolution === 'number' && data.resolution > 0
        ? data.resolution
        : base.resolution,
    glyphs: { ...glyphs },
  };

  if (!normalized.glyphs['?']) {
    const fallback =
      normalized.glyphs[SHAPE_GLYPH_CIRCLE] ??
      normalized.glyphs[Object.keys(normalized.glyphs)[0] ?? ''];
    if (fallback) {
      normalized.glyphs['?'] = { ...fallback };
    }
  }

  return normalized;
}

/** drei Text3D 所需字型結構（補齊 familyName 等必填欄位） */
export function toText3DFontData(typeface: ThreeTypefaceJson): FontData {
  const base = BUILT_IN_SHAPE_TYPEFACE;
  const glyphsWithOutline: FontData['glyphs'] = Object.fromEntries(
    Object.entries(typeface.glyphs).map(([key, g]) => [
      key,
      {
        ha: g.ha,
        o: g.o,
        _cachedOutline: g.o.split(' '),
      },
    ]),
  ) as FontData['glyphs'];
  return {
    familyName: typeface.familyName ?? base.familyName ?? 'ClassroomQuizShape',
    boundingBox: { ...typeface.boundingBox },
    glyphs: glyphsWithOutline,
    resolution: typeface.resolution ?? base.resolution ?? 1000,
    underlineThickness:
      typeface.underlineThickness ?? base.underlineThickness ?? 10,
  };
}

export function isValidTypefaceJson(raw: unknown): boolean {
  try {
    const n = normalizeTypefaceJson(raw);
    return (
      hasValidBoundingBox(n.boundingBox) &&
      Object.keys(n.glyphs).length > 0 &&
      typeof n.resolution === 'number' &&
      n.resolution > 0
    );
  } catch {
    return false;
  }
}

/** 僅使用 typeface 內存在的字元鍵，避免 TextGeometry 異常 */
export function resolveGlyphKeyForTypeface(
  glyph: string,
  glyphs: Record<string, unknown> | undefined,
  fallbackKey = SHAPE_GLYPH_CIRCLE,
): string {
  const ch = glyph.slice(0, 1);
  if (ch && glyphs?.[ch]) return ch;
  if (glyphs?.['?']) return '?';
  if (glyphs?.[fallbackKey]) return fallbackKey;
  const first = Object.keys(glyphs ?? {})[0];
  return first ?? fallbackKey;
}

export function isBuiltInShapeTypefaceUrl(url: string): boolean {
  const u = url.trim();
  return (
    u === '/fonts/classroom-quiz-shape-glyphs.json' ||
    u.endsWith('/fonts/classroom-quiz-shape-glyphs.json') ||
    u.endsWith('classroom-quiz-shape-glyphs.json')
  );
}
