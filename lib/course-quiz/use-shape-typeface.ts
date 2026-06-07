'use client';

import { suspend, preload as suspendPreload } from 'suspend-react';

import {
  BUILT_IN_SHAPE_TYPEFACE,
  isBuiltInShapeTypefaceUrl,
  normalizeTypefaceJson,
  type ThreeTypefaceJson,
} from '@/lib/course-quiz/typeface-json';
import { DEFAULT_SHAPE_TYPEFACE_URL } from '@/lib/course-quiz/shape-glyphs';

async function loadShapeTypefaceJson(url: string): Promise<ThreeTypefaceJson> {
  if (isBuiltInShapeTypefaceUrl(url)) {
    return normalizeTypefaceJson(BUILT_IN_SHAPE_TYPEFACE);
  }
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`無法載入圖形字型 (${res.status})`);
  }
  const raw = await res.json();
  return normalizeTypefaceJson(raw);
}

function cacheKey(url: string): [string, string] {
  return ['shape-typeface-data', url];
}

/** 圖形模式 typeface JSON（供 Text3D / useFont 使用，勿傳已 parse 的 Font 實例） */
export function useShapeTypefaceData(url: string | undefined): ThreeTypefaceJson {
  const resolved = (url?.trim() || DEFAULT_SHAPE_TYPEFACE_URL).trim();
  return suspend(() => loadShapeTypefaceJson(resolved), cacheKey(resolved));
}

export function preloadShapeTypefaceData(url?: string) {
  const resolved = (url?.trim() || DEFAULT_SHAPE_TYPEFACE_URL).trim();
  suspendPreload(() => loadShapeTypefaceJson(resolved), cacheKey(resolved));
}

preloadShapeTypefaceData(DEFAULT_SHAPE_TYPEFACE_URL);
