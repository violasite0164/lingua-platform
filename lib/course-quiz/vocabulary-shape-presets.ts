/** 圖形模式內建立體圖形（option_shape_glyphs 儲存值） */
export const VOCABULARY_SHAPE_KINDS = [
  'triangle',
  'square',
  'circle',
  'rectangle',
  'pentagon',
  'hexagon',
  'star',
] as const;

export type VocabularyShapeKind = (typeof VOCABULARY_SHAPE_KINDS)[number];

export const VOCABULARY_SHAPE_PRESETS: Record<
  VocabularyShapeKind,
  { label: string; description: string }
> = {
  triangle: { label: '三角形', description: '立體金字塔（拖動可旋轉）' },
  square: { label: '正方形', description: '立體立方體（拖動可旋轉）' },
  circle: { label: '圓形', description: '立體球體（拖動可旋轉）' },
  rectangle: { label: '長方形', description: '立體長方體（拖動可旋轉）' },
  pentagon: { label: '五角形', description: '立體擠出五角形' },
  hexagon: { label: '六角形', description: '立體擠出六角形' },
  star: { label: '星形', description: '立體擠出星形' },
};

/** 拖動時依滑鼠位移做 3D 自轉的圖形 */
export const VOCAB_SHAPE_DRAG_SPIN_KINDS = [
  'circle',
  'square',
  'rectangle',
  'triangle',
] as const;

export type VocabShapeDragSpinKind = (typeof VOCAB_SHAPE_DRAG_SPIN_KINDS)[number];

export function vocabularyShapeUsesDragSpin(kind: VocabularyShapeKind): boolean {
  return (VOCAB_SHAPE_DRAG_SPIN_KINDS as readonly string[]).includes(kind);
}

/** 指標位移（px）→ 弧度增量 */
export const VOCAB_SHAPE_DRAG_SPIN_GAIN = 0.016;

/** 按住時讓一面朝向相機（正交視角 +Z），呈現平面圖形輪廓 */
export type VocabShapeFlatHoldBase = { x: number; y: number; z: number };

const FLAT_HOLD_BASE: Record<VocabShapeDragSpinKind, VocabShapeFlatHoldBase> = {
  circle: { x: 0, y: 0, z: 0 },
  square: { x: 0, y: 0, z: 0 },
  rectangle: { x: 0, y: 0, z: 0 },
  /** 底面三角已在幾何預轉；長按時 +Z 面（三角面）朝相機 */
  triangle: { x: 0, y: 0, z: 0 },
};

/** 球／盒／金字塔按住時的「平面朝向」基準角；擠出型回傳 null */
export function vocabularyShapeFlatHoldBase(
  kind: VocabularyShapeKind,
): VocabShapeFlatHoldBase | null {
  if (!vocabularyShapeUsesDragSpin(kind)) return null;
  return FLAT_HOLD_BASE[kind as VocabShapeDragSpinKind];
}

/** 長按對齊平面；拖動中改為即時跟隨 spin，避免「轉面不靈敏」 */
export function applyVocabularyShapeFlatHoldRotation(
  rotation: { x: number; y: number; z: number },
  target: VocabShapeFlatHoldBase,
  spinX: number,
  spinY: number,
  delta: number,
): void {
  const targetX = target.x + spinX;
  const targetY = target.y + spinY;
  const targetZ = target.z;

  const dragActive =
    Math.abs(spinX) > VOCAB_SHAPE_DRAG_SPIN_ACTIVE_EPSILON ||
    Math.abs(spinY) > VOCAB_SHAPE_DRAG_SPIN_ACTIVE_EPSILON;

  if (dragActive) {
    rotation.x = targetX;
    rotation.y = targetY;
    rotation.z = targetZ;
    return;
  }

  const err =
    Math.abs(targetX - rotation.x) +
    Math.abs(targetY - rotation.y) +
    Math.abs(targetZ - rotation.z);

  if (err < VOCAB_SHAPE_FLAT_HOLD_SNAP_EPSILON) {
    rotation.x = targetX;
    rotation.y = targetY;
    rotation.z = targetZ;
    return;
  }

  const speed =
    VOCAB_SHAPE_FLAT_HOLD_SMOOTHING * (1 + Math.min(err * 2.8, 5));
  const blend = 1 - Math.exp(-delta * speed);
  rotation.x += (targetX - rotation.x) * blend;
  rotation.y += (targetY - rotation.y) * blend;
  rotation.z += (targetZ - rotation.z) * blend;
}

/** 長按後、尚未拖動時朝平面收斂速度（越大越快貼齊） */
export const VOCAB_SHAPE_FLAT_HOLD_SMOOTHING = 34;

/** 平面收斂完成閾值（弧度） */
export const VOCAB_SHAPE_FLAT_HOLD_SNAP_EPSILON = 0.028;

/** 拖動自轉：|spin| 超過此值即視為在拖動（即時跟隨、不插值） */
export const VOCAB_SHAPE_DRAG_SPIN_ACTIVE_EPSILON = 0.002;

export function isVocabularyShapeKind(value: string): value is VocabularyShapeKind {
  return (VOCABULARY_SHAPE_KINDS as readonly string[]).includes(value);
}

/** 將後台／舊資料（auto、O、T、中文）正規化為內建圖形 id */
export function normalizeVocabularyShapeKind(
  raw: string | null | undefined,
): VocabularyShapeKind {
  const v = (raw ?? '').trim().toLowerCase();
  if (!v || v === 'auto') return 'circle';

  if (v === 'o' || v === 'round' || v === 'circle' || v === '圓' || v === '圓形') {
    return 'circle';
  }
  if (v === 't' || v === 'tri' || v === 'triangle' || v === '三角' || v === '三角形') {
    return 'triangle';
  }
  if (v === 'square' || v === '正方' || v === '正方形') return 'square';
  if (v === 'rectangle' || v === 'rect' || v === '長方' || v === '長方形') return 'rectangle';
  if (v === 'pentagon' || v === '五角' || v === '五角形') return 'pentagon';
  if (v === 'hexagon' || v === 'hex' || v === '六角' || v === '六角形') return 'hexagon';
  if (v === 'star' || v === '星' || v === '星形') return 'star';

  if (isVocabularyShapeKind(v)) return v;
  return 'circle';
}
