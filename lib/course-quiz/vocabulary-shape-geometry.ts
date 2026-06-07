import {
  BoxGeometry,
  BufferGeometry,
  ConeGeometry,
  ExtrudeGeometry,
  Shape,
  SphereGeometry,
} from 'three';

import type { VocabularyShapeKind } from '@/lib/course-quiz/vocabulary-shape-presets';

/** 撿起時文字貼在圖形某一平面（本地 +Z 朝相機） */
export type VocabularyShapeLabelPlacement = {
  position: [number, number, number];
  rotation: [number, number, number];
};

/** 擠出型（五角／六角／星形）— 略降段數以省效能 */
const EXTRUDE_OPTS = {
  depth: 0.52,
  bevelEnabled: true,
  bevelThickness: 0.07,
  bevelSize: 0.045,
  bevelOffset: 0,
  bevelSegments: 3,
  curveSegments: 10,
};

function regularPolygonShape(sides: number, radius = 1): Shape {
  const shape = new Shape();
  for (let i = 0; i < sides; i += 1) {
    const angle = (i / sides) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

function starShape(outer = 1, inner = 0.42, points = 5): Shape {
  const shape = new Shape();
  const total = points * 2;
  for (let i = 0; i < total; i += 1) {
    const angle = (i / total) * Math.PI * 2 - Math.PI / 2;
    const radius = i % 2 === 0 ? outer : inner;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

function buildExtrudedOutline(kind: VocabularyShapeKind): Shape {
  switch (kind) {
    case 'pentagon':
      return regularPolygonShape(5);
    case 'hexagon':
      return regularPolygonShape(6);
    case 'star':
      return starShape();
    default:
      return regularPolygonShape(6);
  }
}

function createExtrudedGeometry(kind: VocabularyShapeKind): ExtrudeGeometry {
  const geometry = new ExtrudeGeometry(buildExtrudedOutline(kind), EXTRUDE_OPTS);
  geometry.computeVertexNormals();
  geometry.center();
  return geometry;
}

export function createVocabularyShapeGeometry(kind: VocabularyShapeKind): BufferGeometry {
  switch (kind) {
    case 'circle': {
      const geometry = new SphereGeometry(1, 24, 18);
      geometry.center();
      return geometry;
    }
    case 'square': {
      const edge = 1.55;
      const geometry = new BoxGeometry(edge, edge, edge);
      geometry.center();
      return geometry;
    }
    case 'rectangle': {
      const geometry = new BoxGeometry(1.95, 1.2, 1.2);
      geometry.center();
      return geometry;
    }
    case 'triangle': {
      const geometry = new ConeGeometry(1.15, 1.55, 3);
      geometry.rotateX(-Math.PI / 2);
      geometry.center();
      return geometry;
    }
    case 'pentagon':
    case 'hexagon':
    case 'star':
      return createExtrudedGeometry(kind);
    default:
      return createExtrudedGeometry('hexagon');
  }
}

const LABEL_FACE_EPSILON = 0.02;

/** 選項文字貼在「長按時朝相機」的本地 +Z 平面上（隨拖曳自轉） */
export function vocabularyShapeLabelPlacement(
  kind: VocabularyShapeKind,
): VocabularyShapeLabelPlacement | null {
  switch (kind) {
    case 'square': {
      const half = 1.55 / 2;
      return {
        position: [0, 0, half + LABEL_FACE_EPSILON],
        rotation: [0, 0, 0],
      };
    }
    case 'rectangle': {
      const half = 1.2 / 2;
      return {
        position: [0, 0, half + LABEL_FACE_EPSILON],
        rotation: [0, 0, 0],
      };
    }
    case 'triangle': {
      const half = 1.55 / 2;
      return {
        position: [0, 0, half + LABEL_FACE_EPSILON],
        rotation: [0, 0, 0],
      };
    }
    case 'circle':
      return {
        position: [0, 0, 1 + LABEL_FACE_EPSILON],
        rotation: [0, 0, 0],
      };
    default:
      return null;
  }
}
