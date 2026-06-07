'use client';

import { Center, Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, type RefObject } from 'react';
import type { Group } from 'three';

import {
  VOCAB_LETTER_MESH_FLOOR_NUDGE,
  VOCAB_LETTER_PIXEL_SCALE,
} from '@/components/classroom-quiz/classroom-quiz-vocabulary-letter-mesh';
import { getCartoonBrickPalette } from '@/lib/course-quiz/cartoon-brick-palette';
import {
  applyVocabularyShapeFlatHoldRotation,
  vocabularyShapeFlatHoldBase,
  vocabularyShapeUsesDragSpin,
  type VocabularyShapeKind,
} from '@/lib/course-quiz/vocabulary-shape-presets';
import {
  createVocabularyShapeGeometry,
  vocabularyShapeLabelPlacement,
} from '@/lib/course-quiz/vocabulary-shape-geometry';
import type { VocabChipBody } from '@/lib/course-quiz/vocabulary-drop-physics';

const SHAPE_DISPLAY_SCALE = 1.15;

export function ClassroomQuizVocabularyShapeMesh({
  bodyIndex,
  bodiesRef,
  holdingIndexRef,
  pendingPickIndexRef,
  shapeKind,
  optionLabel,
  optionIndex,
  arenaWidth,
  arenaHeight,
}: {
  bodyIndex: number;
  bodiesRef: RefObject<VocabChipBody[]>;
  holdingIndexRef: RefObject<number | null>;
  pendingPickIndexRef: RefObject<number | null>;
  shapeKind: VocabularyShapeKind;
  optionLabel: string;
  optionIndex: number;
  arenaWidth: number;
  arenaHeight: number;
}) {
  const palette = useMemo(
    () => getCartoonBrickPalette(optionIndex),
    [optionIndex],
  );
  const geometry = useMemo(
    () => createVocabularyShapeGeometry(shapeKind),
    [shapeKind],
  );
  const labelPlacement = useMemo(
    () => vocabularyShapeLabelPlacement(shapeKind),
    [shapeKind],
  );
  const dragSpin = vocabularyShapeUsesDragSpin(shapeKind);
  const flatHoldBase = useMemo(
    () => vocabularyShapeFlatHoldBase(shapeKind),
    [shapeKind],
  );
  const groupRef = useRef<Group>(null);
  const labelGroupRef = useRef<Group>(null);
  const showLabel = optionLabel.trim().length > 0 && labelPlacement !== null;

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame((_, delta) => {
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

    if (isHeld && dragSpin && flatHoldBase) {
      applyVocabularyShapeFlatHoldRotation(
        group.rotation,
        { ...flatHoldBase, z: flatHoldBase.z + body.rotation * 0.06 },
        body.spinX,
        body.spinY,
        delta,
      );
    } else if (isHeld) {
      group.rotation.set(0.07, -0.05, body.rotation * 0.12);
    } else {
      group.rotation.set(
        0.1 + Math.sin(body.rotation) * 0.045,
        -0.08 + Math.cos(body.rotation) * 0.045,
        body.rotation * 0.26,
      );
    }

    const scale =
      (1.02 + body.depth * 0.12 + (isHeld ? 0.1 : 0) + (isPendingPick ? 0.06 : 0)) *
      SHAPE_DISPLAY_SCALE;
    group.scale.setScalar(scale);

    if (labelGroupRef.current) {
      labelGroupRef.current.visible = isHeld && showLabel;
    }
  });

  return (
    <group ref={groupRef}>
      <Center>
        <mesh geometry={geometry}>
          <meshStandardMaterial
            color={palette.brick}
            roughness={0.28}
            metalness={0.05}
            emissive={palette.brickSide}
            emissiveIntensity={0.14}
          />
        </mesh>
      </Center>
      {showLabel && labelPlacement ? (
        <group
          ref={labelGroupRef}
          visible={false}
          position={labelPlacement.position}
          rotation={labelPlacement.rotation}
        >
          <Text
            fontSize={0.26}
            maxWidth={2.4}
            lineHeight={1.05}
            textAlign="center"
            anchorX="center"
            anchorY="middle"
            color="#fffef8"
            outlineWidth={0.015}
            outlineColor="#2d1a3d"
            letterSpacing={-0.01}
            renderOrder={10}
            material-depthTest={false}
          >
            {optionLabel}
          </Text>
        </group>
      ) : null}
    </group>
  );
}
