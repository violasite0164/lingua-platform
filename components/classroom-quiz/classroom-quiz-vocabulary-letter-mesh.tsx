'use client';

import fredokaSemiBoldTypeface from '@compai/font-fredoka/data/typefaces/normal-600.json';
import { Center, Text3D, useFont } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, type RefObject } from 'react';
import type { Group } from 'three';

import { getCartoonBrickPalette } from '@/lib/course-quiz/cartoon-brick-palette';
import {
  normalizeTypefaceJson,
  resolveGlyphKeyForTypeface,
  toText3DFontData,
  type ThreeTypefaceJson,
} from '@/lib/course-quiz/typeface-json';
import type { VocabChipBody } from '@/lib/course-quiz/vocabulary-drop-physics';

/** Three.js Text3D 用 Fredoka SemiBold（略細於 700） */
export const VOCAB_LETTER_FONT = fredokaSemiBoldTypeface;

/** 字元模式：穩定字型參考，供 suspend-react / useFont 快取 */
export const VOCAB_CHARACTER_FONT_DATA = toText3DFontData(
  normalizeTypefaceJson(VOCAB_LETTER_FONT),
);

useFont.preload(VOCAB_CHARACTER_FONT_DATA);

/** 螢幕像素 → Three.js 世界座標 */
export const VOCAB_LETTER_PIXEL_SCALE = 0.0135;

/** 3D 字重心偏高，略往下移讓視覺底部貼齊物理地板 */
export const VOCAB_LETTER_MESH_FLOOR_NUDGE = 0.38;

/** Fredoka 僅含拉丁字元；其餘以 ? 避免 TextGeometry 異常 */
export function vocabText3DGlyph(glyph: string): string {
  const ch = (glyph.slice(0, 1) || '?').toUpperCase();
  return /^[A-Z0-9]$/.test(ch) ? ch : '?';
}

/** 圖形模式：允許自訂 typeface 內任意單字元鍵 */
export function vocabShapeText3DGlyph(glyph: string): string {
  const ch = glyph.slice(0, 1);
  return ch || '?';
}

export function ClassroomQuizVocabularyLetterMesh({
  bodyIndex,
  bodiesRef,
  holdingIndexRef,
  pendingPickIndexRef,
  glyph,
  typeface,
  glyphMode = 'character',
  optionIndex,
  arenaWidth,
  arenaHeight,
}: {
  bodyIndex: number;
  bodiesRef: RefObject<VocabChipBody[]>;
  holdingIndexRef: RefObject<number | null>;
  pendingPickIndexRef: RefObject<number | null>;
  glyph: string;
  typeface: ThreeTypefaceJson;
  glyphMode?: 'character' | 'shape';
  optionIndex: number;
  arenaWidth: number;
  arenaHeight: number;
}) {
  const letter = useMemo(() => {
    if (glyphMode === 'shape') {
      const raw = vocabShapeText3DGlyph(glyph);
      return resolveGlyphKeyForTypeface(raw, typeface.glyphs);
    }
    return vocabText3DGlyph(glyph);
  }, [glyph, glyphMode, typeface.glyphs]);

  const palette = useMemo(
    () => getCartoonBrickPalette(optionIndex),
    [optionIndex],
  );
  const text3DFont = useMemo(
    () =>
      glyphMode === 'character'
        ? VOCAB_CHARACTER_FONT_DATA
        : toText3DFontData(typeface),
    [glyphMode, typeface],
  );
  const groupRef = useRef<Group>(null);
  const hasFontMetrics = Boolean(typeface.boundingBox?.yMax);

  useFrame(() => {
    const list = bodiesRef.current;
    if (bodyIndex < 0 || bodyIndex >= list.length) return;
    const body = list[bodyIndex];
    const group = groupRef.current;
    if (!body || !group) return;

    const isHeld = holdingIndexRef.current === bodyIndex;
    const isPendingPick = pendingPickIndexRef.current === bodyIndex;

    const x = (body.x - arenaWidth / 2) * VOCAB_LETTER_PIXEL_SCALE;
    const y =
      -(body.y - arenaHeight / 2) * VOCAB_LETTER_PIXEL_SCALE -
      VOCAB_LETTER_MESH_FLOOR_NUDGE;
    const z = body.depth * 4 + (isHeld ? 2.8 : 0);
    group.position.set(x, y, z);

    if (isHeld) {
      group.rotation.set(0.07, -0.05, body.rotation * 0.12);
    } else {
      group.rotation.set(
        0.1 + Math.sin(body.rotation) * 0.045,
        -0.08 + Math.cos(body.rotation) * 0.045,
        body.rotation * 0.26,
      );
    }

    const scale =
      1.02 + body.depth * 0.12 + (isHeld ? 0.1 : 0) + (isPendingPick ? 0.06 : 0);
    group.scale.setScalar(scale);
  });

  if (!hasFontMetrics || !letter) {
    return null;
  }

  return (
    <group ref={groupRef}>
      <Center>
        <Text3D
          font={text3DFont}
          size={2.45}
          height={0.64}
          bevelEnabled
          bevelThickness={0.06}
          bevelSize={0.035}
          bevelOffset={0}
          bevelSegments={4}
          curveSegments={10}
        >
          {letter}
          <meshStandardMaterial
            color={palette.brick}
            roughness={0.28}
            metalness={0.05}
            emissive={palette.brickSide}
            emissiveIntensity={0.14}
          />
        </Text3D>
      </Center>
    </group>
  );
}
