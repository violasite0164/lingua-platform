'use client';

import { useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, type RefObject } from 'react';
import type { Group, Mesh } from 'three';

import {
  VOCAB_LETTER_MESH_FLOOR_NUDGE,
  VOCAB_LETTER_PIXEL_SCALE,
} from '@/components/classroom-quiz/classroom-quiz-vocabulary-letter-mesh';
import { getCartoonBrickPalette } from '@/lib/course-quiz/cartoon-brick-palette';
import type { VocabChipBody } from '@/lib/course-quiz/vocabulary-drop-physics';

const IMAGE_PLANE_MAX = 2.65;

function readTextureAspect(texture: { image?: { width?: number; height?: number } }): number {
  const w = texture.image?.width ?? 1;
  const h = texture.image?.height ?? 1;
  if (!w || !h) return 1;
  return w / h;
}

/** 在固定邊界內等比縮放（類似 object-contain） */
function fitImagePlaneSize(maxSide: number, aspect: number): [number, number] {
  if (aspect >= 1) return [maxSide, maxSide / aspect];
  return [maxSide * aspect, maxSide];
}

export function ClassroomQuizVocabularyImageMesh({
  bodyIndex,
  bodiesRef,
  holdingIndexRef,
  pendingPickIndexRef,
  imageUrl,
  optionIndex,
  arenaWidth,
  arenaHeight,
}: {
  bodyIndex: number;
  bodiesRef: RefObject<VocabChipBody[]>;
  holdingIndexRef: RefObject<number | null>;
  pendingPickIndexRef: RefObject<number | null>;
  imageUrl: string;
  optionIndex: number;
  arenaWidth: number;
  arenaHeight: number;
}) {
  const palette = useMemo(
    () => getCartoonBrickPalette(optionIndex),
    [optionIndex],
  );
  const texture = useTexture(imageUrl);
  const [planeWidth, planeHeight] = useMemo(() => {
    const aspect = readTextureAspect(texture);
    return fitImagePlaneSize(IMAGE_PLANE_MAX, aspect);
  }, [texture]);
  const groupRef = useRef<Group>(null);
  const meshRef = useRef<Mesh>(null);

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

  return (
    <group ref={groupRef}>
      <mesh ref={meshRef} castShadow receiveShadow>
        <planeGeometry args={[planeWidth, planeHeight]} />
        <meshStandardMaterial
          map={texture}
          transparent
          roughness={0.35}
          metalness={0.02}
          emissive={palette.brickSide}
          emissiveIntensity={0.08}
        />
      </mesh>
    </group>
  );
}
